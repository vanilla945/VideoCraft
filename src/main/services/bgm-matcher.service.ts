import path from 'path'
import fs from 'fs'
import ffmpeg from 'fluent-ffmpeg'
import { app } from 'electron'
import { randomUUID } from 'crypto'

interface BGMAnalysis {
  bpm: number
  energyCurve: Array<{ time: number; energy: number }>
  mood: string             // 'energetic' | 'calm' | 'emotional' | 'dramatic'
}

interface BGMTrack {
  filePath: string
  startTime: number
  endTime: number
  volume: number
  source: 'library' | 'generated' | 'user'
}

class BGMMatcherService {
  private libraryDir: string

  constructor() {
    this.libraryDir = path.join(app.getPath('userData'), 'bgm_library')
    if (!fs.existsSync(this.libraryDir)) fs.mkdirSync(this.libraryDir, { recursive: true })
  }

  async analyzeVideo(videoPath: string): Promise<BGMAnalysis> {
    try {
      const bpm = await this.detectBPM(videoPath)
      const energyCurve = await this.analyzeEnergy(videoPath)
      const mood = this.inferMood(energyCurve)

      return { bpm, energyCurve, mood }
    } catch {
      return { bpm: 120, energyCurve: [], mood: 'calm' }
    }
  }

  async analyzeUserMusic(filePath: string): Promise<BGMAnalysis> {
    try {
      const bpm = await this.detectBPM(filePath)
      const energyCurve = await this.analyzeEnergy(filePath)
      return { bpm, energyCurve, mood: 'energetic' }
    } catch {
      return { bpm: 120, energyCurve: [], mood: 'calm' }
    }
  }

  async matchBGM(
    analysis: BGMAnalysis,
    bgmStyle: string,
    videoDuration: number,
    musicSource: 'auto' | 'user',
    userMusicPath?: string
  ): Promise<BGMTrack[]> {
    if (musicSource === 'user' && userMusicPath && fs.existsSync(userMusicPath)) {
      return this.arrangeUserMusic(userMusicPath, analysis, videoDuration)
    }
    // Auto mode: generate placeholder (real library integration in later phases)
    return this.generatePlaceholderBGM(bgmStyle, analysis, videoDuration)
  }

  private async detectBPM(filePath: string): Promise<number> {
    return new Promise((resolve) => {
      // Simple BPM estimation via ffmpeg astats
      let bpm = 120 // default
      ffmpeg(filePath)
        .audioCodec('pcm_s16le')
        .audioFrequency(44100)
        .audioChannels(1)
        .format('null')
        .output('/dev/null')
        .outputOptions(['-af', 'astats=metadata=1:reset=1', '-f', 'null'])
        .on('stderr', (_line: string) => {
          // BPM detection requires specialized tools (aubio, librosa)
          // For now return default; full BPM detection in Phase 5
        })
        .on('end', () => resolve(bpm))
        .on('error', () => resolve(120))
        .run()
    })
  }

  private async analyzeEnergy(filePath: string): Promise<Array<{ time: number; energy: number }>> {
    try {
      const curve: Array<{ time: number; energy: number }> = []
      return new Promise((resolve) => {
        ffmpeg(filePath)
          .audioCodec('pcm_s16le')
          .format('null')
          .output('/dev/null')
          .outputOptions(['-af', 'astats=metadata=1:reset=1', '-f', 'null'])
          .on('stderr', (line: string) => {
            const rmsMatch = line.match(/RMS.*?(-?\d+\.?\d*)/i)
            if (rmsMatch) {
              const time = curve.length * 0.5
              curve.push({ time, energy: Math.min(1, Math.abs(parseFloat(rmsMatch[1])) / 60) })
            }
          })
          .on('end', () => resolve(curve))
          .on('error', () => resolve(curve))
          .run()
      })
    } catch {
      return []
    }
  }

  private inferMood(energyCurve: Array<{ time: number; energy: number }>): string {
    if (energyCurve.length === 0) return 'calm'
    const avg = energyCurve.reduce((s, e) => s + e.energy, 0) / energyCurve.length
    if (avg > 0.6) return 'energetic'
    if (avg > 0.3) return 'dramatic'
    return 'emotional'
  }

  private async arrangeUserMusic(filePath: string, analysis: BGMAnalysis, videoDuration: number): Promise<BGMTrack[]> {
    const tracks: BGMTrack[] = []

    // Simple looping arrangement
    for (let t = 0; t < videoDuration; t += 30) {
      tracks.push({
        filePath,
        startTime: t,
        endTime: Math.min(t + 30, videoDuration),
        volume: t === 0 ? 0.4 : 0.3,
        source: 'user',
      })
    }

    return tracks
  }

  private async generatePlaceholderBGM(
    bgmStyle: string,
    _analysis: BGMAnalysis,
    videoDuration: number
  ): Promise<BGMTrack[]> {
    // Placeholder: generate silent BGM track
    const silencePath = path.join(this.libraryDir, `silence_${randomUUID()}.wav`)
    const tracks: BGMTrack[] = [{
      filePath: silencePath,
      startTime: 0,
      endTime: videoDuration,
      volume: 0,
      source: 'library',
    }]

    return tracks
  }
}

export const bgmMatcherService = new BGMMatcherService()
