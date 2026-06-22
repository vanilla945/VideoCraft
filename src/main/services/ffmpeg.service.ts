import ffmpeg from 'fluent-ffmpeg'
import path from 'path'
import fs from 'fs'
import { app } from 'electron'
import { randomUUID } from 'crypto'
import type { MediaMetadata, ExportPreset, ExportProgress, ExportConfig, Project } from '../../shared/types'
import type { SubtitleStyle } from '../../shared/types/subtitle'

class FFmpegService {
  private _thumbnailDir: string | null = null

  private get thumbnailDir(): string {
    if (!this._thumbnailDir) {
      this._thumbnailDir = path.join(app.getPath('userData'), 'thumbnails')
      this.ensureDir(this._thumbnailDir)
    }
    return this._thumbnailDir
  }

  private ensureDir(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  }

  async probe(filePath: string): Promise<MediaMetadata> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, data) => {
        if (err) return reject(err)
        const videoStream = data.streams.find((s) => s.codec_type === 'video')
        const audioStream = data.streams.find((s) => s.codec_type === 'audio')

        resolve({
          duration: data.format.duration ?? 0,
          width: videoStream?.width ?? 0,
          height: videoStream?.height ?? 0,
          codec: videoStream?.codec_name ?? '',
          bitRate: data.format.bit_rate ? parseInt(data.format.bit_rate) : 0,
          frameRate: videoStream?.r_frame_rate ? this.parseFrameRate(videoStream.r_frame_rate) : 0,
          audioCodec: audioStream?.codec_name,
          audioSampleRate: audioStream?.sample_rate,
          fileSize: data.format.size ?? 0
        })
      })
    })
  }

  async extractThumbnail(filePath: string, timeSeconds: number): Promise<string> {
    const outputPath = path.join(this.thumbnailDir, `${randomUUID()}.png`)
    return new Promise((resolve, reject) => {
      ffmpeg(filePath)
        .seekInput(timeSeconds)
        .frames(1)
        .output(outputPath)
        .on('end', () => resolve(outputPath))
        .on('error', reject)
        .run()
    })
  }

  async extractKeyframes(filePath: string, intervalSeconds: number): Promise<string[]> {
    const outputDir = path.join(this.thumbnailDir, `keyframes_${randomUUID()}`)
    this.ensureDir(outputDir)
    const outputPattern = path.join(outputDir, 'frame_%04d.png')

    return new Promise((resolve, reject) => {
      ffmpeg(filePath)
        .outputOptions(['-vf', `fps=1/${intervalSeconds}`])
        .output(outputPattern)
        .on('end', () => {
          const files = fs.readdirSync(outputDir).map((f) => path.join(outputDir, f))
          resolve(files)
        })
        .on('error', reject)
        .run()
    })
  }

  async trimVideo(
    inputPath: string,
    startSeconds: number,
    durationSeconds: number,
    outputPath: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .setStartTime(startSeconds)
        .setDuration(durationSeconds)
        .output(outputPath)
        .videoCodec('copy')
        .audioCodec('copy')
        .on('end', resolve)
        .on('error', reject)
        .run()
    })
  }

  async exportVideo(
    project: Project,
    config: ExportConfig,
    onProgress: (progress: ExportProgress) => void,
    signal?: { cancelled: boolean }
  ): Promise<void> {
    const { timeline, assets } = project
    const { preset, outputPath } = config

    // Phase 1: single clip export
    if (timeline.tracks.length === 0 || timeline.tracks[0].clips.length === 0) {
      throw new Error('没有可导出的剪辑片段')
    }

    const tempDir = path.join(app.getPath('userData'), 'temp')
    this.ensureDir(tempDir)
    const tempFiles: string[] = []

    try {
      // Trim each clip
      for (const track of timeline.tracks) {
        for (const clip of track.clips) {
          const asset = assets.find((a) => a.id === clip.assetId)
          if (!asset) continue

          const tempPath = path.join(tempDir, `trim_${clip.id}.mp4`)
          await this.trimVideo(asset.filePath, clip.sourceStart, clip.duration, tempPath)
          tempFiles.push(tempPath)

          if (signal?.cancelled) {
            onProgress({ status: 'failed', percent: 0, fps: 0, timeElapsed: '', eta: '', error: '用户取消导出' })
            return
          }
        }
      }

      // Concat or direct export
      if (tempFiles.length === 1) {
        await this.transcodeSingle(tempFiles[0], outputPath, preset, onProgress, signal)
      } else {
        await this.concatAndTranscode(tempFiles, outputPath, preset, onProgress, signal)
      }

      onProgress({ status: 'completed', percent: 100, fps: 0, timeElapsed: '', eta: '' })
    } finally {
      // Cleanup temp files
      for (const f of tempFiles) {
        try { fs.unlinkSync(f) } catch { /* ignore */ }
      }
    }
  }

  private transcodeSingle(
    inputPath: string,
    outputPath: string,
    preset: ExportPreset,
    onProgress: (p: ExportProgress) => void,
    signal?: { cancelled: boolean }
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const command = ffmpeg(inputPath)
        .output(outputPath)
        .videoCodec(preset.codec)
        .size(`${preset.resolution.width}x${preset.resolution.height}`)
        .fps(preset.frameRate)
        .videoBitrate(preset.bitRate)
        .audioCodec(preset.audioCodec)
        .audioBitrate(preset.audioBitRate)
        .format(preset.format)
        .on('progress', (info) => {
          if (signal?.cancelled) {
            command.kill('SIGTERM')
            return
          }
          onProgress({
            status: 'running',
            percent: info.percent ?? 0,
            fps: info.currentFps ?? 0,
            timeElapsed: info.timemark ?? '',
            eta: ''
          })
        })
        .on('end', resolve)
        .on('error', (err) => {
          onProgress({ status: 'failed', percent: 0, fps: 0, timeElapsed: '', eta: '', error: err.message })
          reject(err)
        })

      command.run()
    })
  }

  private async concatAndTranscode(
    inputPaths: string[],
    outputPath: string,
    preset: ExportPreset,
    onProgress: (p: ExportProgress) => void,
    signal?: { cancelled: boolean }
  ): Promise<void> {
    // Use ffmpeg concat demuxer
    const tempDir = path.join(app.getPath('userData'), 'temp')
    const concatFile = path.join(tempDir, 'concat_list.txt')
    const fileList = inputPaths.map((p) => `file '${p}'`).join('\n')
    fs.writeFileSync(concatFile, fileList)

    return new Promise((resolve, reject) => {
      const command = ffmpeg()
        .input(concatFile)
        .inputOptions(['-f', 'concat', '-safe', '0'])
        .output(outputPath)
        .videoCodec(preset.codec)
        .size(`${preset.resolution.width}x${preset.resolution.height}`)
        .fps(preset.frameRate)
        .videoBitrate(preset.bitRate)
        .audioCodec(preset.audioCodec)
        .audioBitrate(preset.audioBitRate)
        .format(preset.format)
        .on('progress', (info) => {
          if (signal?.cancelled) {
            command.kill('SIGTERM')
            return
          }
          onProgress({
            status: 'running',
            percent: info.percent ?? 0,
            fps: info.currentFps ?? 0,
            timeElapsed: info.timemark ?? '',
            eta: ''
          })
        })
        .on('end', () => {
          try { fs.unlinkSync(concatFile) } catch { /* ignore */ }
          resolve()
        })
        .on('error', (err) => {
          try { fs.unlinkSync(concatFile) } catch { /* ignore */ }
          onProgress({ status: 'failed', percent: 0, fps: 0, timeElapsed: '', eta: '', error: err.message })
          reject(err)
        })

      command.run()
    })
  }

  async burnSubtitles(
    videoPath: string,
    srtPath: string,
    outputPath: string,
    style?: Partial<SubtitleStyle>
  ): Promise<void> {
    const s = style || {}
    const fontName = s.fontFamily || 'PingFang SC'
    const fontSize = s.fontSize || 24
    const fontColor = s.fontColor || '&H00FFFFFF'
    const bgColor = s.backgroundColor || '&H80000000'
    const marginBottom = s.marginBottom || 80
    const alignment = s.alignment === 'left' ? 1 : s.alignment === 'right' ? 3 : 2
    const marginV = s.position === 'top' ? 20 : marginBottom

    const subtitleFilter = `subtitles='${srtPath.replace(/'/g, "'\\''")}':force_style='FontName=${fontName},FontSize=${fontSize},PrimaryColour=${fontColor},BackColour=${bgColor},Alignment=${alignment},MarginV=${marginV}'`

    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .output(outputPath)
        .videoCodec('libx264')
        .audioCodec('aac')
        .outputOptions(['-vf', subtitleFilter])
        .on('end', resolve)
        .on('error', reject)
        .run()
    })
  }

  async mixAudio(
    inputTracks: Array<{ filePath: string; volume: number; startOffset: number }>,
    outputPath: string
  ): Promise<void> {
    if (inputTracks.length === 0) {
      throw new Error('No audio tracks to mix')
    }

    if (inputTracks.length === 1) {
      // Single track — just copy
      return new Promise((resolve, reject) => {
        ffmpeg(inputTracks[0].filePath)
          .audioCodec('copy')
          .output(outputPath)
          .on('end', resolve)
          .on('error', reject)
          .run()
      })
    }

    // Multiple tracks — use amix filter
    return new Promise((resolve, reject) => {
      const cmd = ffmpeg()
      for (const track of inputTracks) {
        cmd.input(track.filePath)
      }
      const filterParts = inputTracks.map((t) => `[${inputTracks.indexOf(t)}:a]volume=${t.volume}`)
      const amixInputs = inputTracks.map((_, i) => `[a${i}]`).join('')
      const filterStr = filterParts.map((f, i) => `${f}[a${i}]`).join(';') + `;${amixInputs}amix=inputs=${inputTracks.length}:duration=longest[out]`

      cmd
        .output(outputPath)
        .audioCodec('aac')
        .audioBitrate(192)
        .outputOptions(['-filter_complex', filterStr, '-map', '[out]'])
        .on('end', resolve)
        .on('error', reject)
        .run()
    })
  }

  private parseFrameRate(rFrameRate: string): number {
    const parts = rFrameRate.split('/')
    if (parts.length === 2) {
      return parseFloat(parts[0]) / parseFloat(parts[1])
    }
    return parseFloat(rFrameRate) || 0
  }
}

export const ffmpegService = new FFmpegService()
