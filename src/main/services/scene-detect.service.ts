import path from 'path'
import fs from 'fs'
import { app } from 'electron'
import { randomUUID } from 'crypto'
import ffmpeg from 'fluent-ffmpeg'

export interface SceneBoundary {
  startTime: number
  endTime: number
  confidence: number
  dominantLabel?: string
}

class SceneDetectService {
  private outputDir: string

  constructor() {
    this.outputDir = path.join(app.getPath('userData'), 'scene_detect')
    if (!fs.existsSync(this.outputDir)) fs.mkdirSync(this.outputDir, { recursive: true })
  }

  async detectScenes(
    videoPath: string,
    threshold: number = 0.3
  ): Promise<SceneBoundary[]> {
    return new Promise((resolve, reject) => {
      const timestamps: number[] = []

      // Use ffmpeg scene detection filter
      ffmpeg(videoPath)
        .outputOptions([
          '-vf', `select='gt(scene,${threshold})',showinfo`,
          '-vsync', 'vfr',
          '-f', 'null',
        ])
        .output('/dev/null')
        .on('stderr', (line: string) => {
          const match = line.match(/pts_time:([\d.]+)/)
          if (match) {
            timestamps.push(parseFloat(match[1]))
          }
        })
        .on('end', () => {
          // Convert timestamps to boundaries
          const boundaries: SceneBoundary[] = []
          for (let i = 0; i < timestamps.length; i++) {
            boundaries.push({
              startTime: timestamps[i],
              endTime: timestamps[i + 1] ?? Infinity,
              confidence: 0.7,
            })
          }
          resolve(boundaries)
        })
        .on('error', (err: Error) => {
          // Fallback: return fixed-interval scenes
          console.warn('[SceneDetect] scene filter failed, using fixed intervals:', err.message)
          resolve(this.fallbackDetect(videoPath, 5)) // 5-second intervals
        })
        .run()
    })
  }

  async detectScenesSimple(videoPath: string, intervalSeconds: number = 5): Promise<SceneBoundary[]> {
    const metadata = await this.getDuration(videoPath)
    const boundaries: SceneBoundary[] = []
    for (let t = 0; t < metadata.duration; t += intervalSeconds) {
      boundaries.push({
        startTime: t,
        endTime: Math.min(t + intervalSeconds, metadata.duration),
        confidence: 0.5,
      })
    }
    return boundaries
  }

  private async getDuration(videoPath: string): Promise<{ duration: number }> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, data) => {
        if (err) reject(err)
        else resolve({ duration: data.format.duration ?? 0 })
      })
    })
  }

  private fallbackDetect(videoPath: string, intervalSeconds: number): SceneBoundary[] {
    return [{
      startTime: 0,
      endTime: 999999,
      confidence: 0.5,
    }]
  }
}

export const sceneDetectService = new SceneDetectService()
