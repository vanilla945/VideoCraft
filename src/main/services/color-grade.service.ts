import ffmpeg from 'fluent-ffmpeg'
import path from 'path'
import fs from 'fs'
import { app } from 'electron'
import { randomUUID } from 'crypto'

export interface ColorGradeConfig {
  brightness?: number       // -1 to 1, default 0
  contrast?: number        // 0.5 to 2, default 1
  saturation?: number      // 0 to 3, default 1
  temperature?: 'warm' | 'cool' | 'neutral'
  preset?: string          // e.g. 'cinematic' | 'vintage' | 'vibrant'
}

class ColorGradeService {
  private outputDir: string

  constructor() {
    this.outputDir = path.join(app.getPath('userData'), 'graded')
    if (!fs.existsSync(this.outputDir)) fs.mkdirSync(this.outputDir, { recursive: true })
  }

  async apply(
    inputPath: string,
    config: ColorGradeConfig
  ): Promise<string> {
    const outputPath = path.join(this.outputDir, `graded_${randomUUID()}.mp4`)

    const filters = this.buildFilters(config)

    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .output(outputPath)
        .videoCodec('libx264')
        .audioCodec('aac')
        .outputOptions(['-vf', filters])
        .on('end', () => resolve(outputPath))
        .on('error', reject)
        .run()
    })
  }

  autoGrade(description: string): ColorGradeConfig {
    const d = description.toLowerCase()

    // Warm/vintage look
    if (d.includes('暖') || d.includes('温暖') || d.includes('vintage') || d.includes('golden')) {
      return { brightness: 0.05, contrast: 1.05, saturation: 1.1, temperature: 'warm', preset: 'vintage' }
    }

    // Cinematic/cool
    if (d.includes('电影') || d.includes('cinematic') || d.includes('专业') || d.includes('暗')) {
      return { brightness: -0.05, contrast: 1.15, saturation: 1.0, temperature: 'cool', preset: 'cinematic' }
    }

    // Vibrant/bright
    if (d.includes('活力') || d.includes('亮') || d.includes('vibrant') || d.includes('鲜艳')) {
      return { brightness: 0.1, contrast: 1.1, saturation: 1.3, temperature: 'warm', preset: 'vibrant' }
    }

    // Default: subtle enhancement
    return { brightness: 0.02, contrast: 1.05, saturation: 1.05, temperature: 'neutral' }
  }

  private buildFilters(config: ColorGradeConfig): string {
    const parts: string[] = []

    const brightness = config.brightness ?? 0
    const contrast = config.contrast ?? 1
    const saturation = config.saturation ?? 1

    parts.push(`eq=brightness=${brightness}:contrast=${contrast}:saturation=${saturation}`)

    if (config.temperature === 'warm') {
      parts.push('colorbalance=rs=0.1:gs=0:bs=-0.1')
    } else if (config.temperature === 'cool') {
      parts.push('colorbalance=rs=-0.1:gs=0:bs=0.1')
    }

    return parts.join(',')
  }
}

export const colorGradeService = new ColorGradeService()
