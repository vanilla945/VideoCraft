import path from 'path'
import fs from 'fs'
import ffmpeg from 'fluent-ffmpeg'
import { app } from 'electron'
import { randomUUID } from 'crypto'

interface DraftRenderConfig {
  resolution?: { width: number; height: number }
  fps?: number
  segmentDuration?: number      // seconds per keyframe snapshot
  videoBitrate?: string
}

interface DraftRenderResult {
  videoPath: string
  keyframes: string[]           // paths to keyframe snapshots
  audioWaveformPath?: string
  metadata: {
    duration: number
    fileSize: number
    resolution: string
  }
}

class DraftRenderService {
  private outputDir: string

  constructor() {
    this.outputDir = path.join(app.getPath('userData'), 'drafts')
    if (!fs.existsSync(this.outputDir)) fs.mkdirSync(this.outputDir, { recursive: true })
  }

  async render(
    videoInputs: string[],
    audioInput?: string,
    srtPath?: string,
    config: DraftRenderConfig = {}
  ): Promise<DraftRenderResult> {
    const outputPath = path.join(this.outputDir, `draft_${randomUUID()}.mp4`)
    const keyframeDir = path.join(this.outputDir, `kf_${randomUUID()}`)
    fs.mkdirSync(keyframeDir, { recursive: true })

    const fps = config.fps || 15
    const segmentDuration = config.segmentDuration || 5

    // Render low-quality draft
    await this.renderLowQualityVideo(videoInputs, audioInput, srtPath, outputPath, config)

    // Extract keyframes at intervals
    const keyframes = await this.extractKeyframes(outputPath, keyframeDir, segmentDuration)

    // Generate audio waveform if audio present
    let audioWaveformPath: string | undefined
    if (audioInput) {
      audioWaveformPath = await this.generateWaveform(audioInput)
    }

    const metadata = await this.getMetadata(outputPath)

    return {
      videoPath: outputPath,
      keyframes,
      audioWaveformPath,
      metadata: {
        duration: metadata.duration,
        fileSize: metadata.fileSize,
        resolution: `${metadata.width}x${metadata.height}`,
      },
    }
  }

  private renderLowQualityVideo(
    videoInputs: string[],
    audioInput?: string,
    srtPath?: string,
    config: DraftRenderConfig = {}
  ): Promise<void> {
    const outputPath = path.join(this.outputDir, `draft_${randomUUID()}.mp4`)

    return new Promise((resolve, reject) => {
      let cmd = ffmpeg()

      // Add all video inputs
      for (const input of videoInputs) {
        cmd = cmd.input(input)
      }
      if (audioInput) cmd = cmd.input(audioInput)

      const width = config.resolution?.width || 854
      const height = config.resolution?.height || 480
      const fps = config.fps || 15

      const outputOptions = [
        '-vf', `scale=${width}:${height},fps=${fps}`,
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-crf', '32',               // very low quality for speed
        '-c:a', 'aac',
        '-b:a', '64k',
        '-movflags', '+faststart',
      ]

      if (srtPath) {
        outputOptions.push('-vf', `scale=${width}:${height},fps=${fps},subtitles='${srtPath.replace(/'/g, "'\\''")}'`)
      }

      if (videoInputs.length > 1) {
        cmd = cmd
          .outputOptions(['-filter_complex', `concat=n=${videoInputs.length}:v=1:a=0[outv]`, '-map', '[outv]'])
      }

      cmd
        .output(outputPath)
        .outputOptions(outputOptions)
        .on('end', () => {
          // Move result to final output
          this.outputDir = path.dirname(outputPath)
          resolve()
        })
        .on('error', reject)
        .run()
    })
  }

  private extractKeyframes(
    videoPath: string,
    outputDir: string,
    intervalSec: number
  ): Promise<string[]> {
    const outputPattern = path.join(outputDir, 'kf_%04d.png')

    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .outputOptions(['-vf', `fps=1/${intervalSec}`])
        .output(outputPattern)
        .on('end', () => {
          const files = fs.readdirSync(outputDir)
            .filter(f => f.endsWith('.png'))
            .sort()
            .map(f => path.join(outputDir, f))
          resolve(files)
        })
        .on('error', reject)
        .run()
    })
  }

  private generateWaveform(audioPath: string): Promise<string> {
    const outputPath = path.join(this.outputDir, `waveform_${randomUUID()}.png`)

    return new Promise((resolve, reject) => {
      ffmpeg(audioPath)
        .outputOptions([
          '-filter_complex', 'showwavespic=s=800x120:colors=blue',
          '-frames:v', '1',
        ])
        .output(outputPath)
        .on('end', () => resolve(outputPath))
        .on('error', reject)
        .run()
    })
  }

  private getMetadata(videoPath: string): Promise<{ duration: number; width: number; height: number; fileSize: number }> {
    return new Promise((resolve) => {
      ffmpeg.ffprobe(videoPath, (err, data) => {
        if (err) {
          resolve({ duration: 0, width: 0, height: 0, fileSize: 0 })
          return
        }
        const v = data.streams.find(s => s.codec_type === 'video')
        resolve({
          duration: data.format.duration || 0,
          width: v?.width || 0,
          height: v?.height || 0,
          fileSize: data.format.size || 0,
        })
      })
    })
  }
}

export const draftRenderService = new DraftRenderService()
