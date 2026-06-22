import path from 'path'
import fs from 'fs'
import { app } from 'electron'
import { randomUUID } from 'crypto'
import { ttsService } from './tts.service'
import type { ScriptSegment, GeneratedScript } from './script-gen.service'

interface TTSPipelineResult {
  audioPath: string
  segments: Array<{ audioPath: string; startTime: number; endTime: number; text: string }>
  totalDuration: number
}

class TTSPipelineService {
  private outputDir: string

  constructor() {
    this.outputDir = path.join(app.getPath('userData'), 'tts')
    if (!fs.existsSync(this.outputDir)) fs.mkdirSync(this.outputDir, { recursive: true })
  }

  async synthesizeScript(script: GeneratedScript): Promise<TTSPipelineResult> {
    const tempFiles: Array<{ path: string; startTime: number; endTime: number; text: string }> = []

    // Synthesize each segment individually
    for (const seg of script.segments) {
      if (!seg.text.trim()) continue

      try {
        const segmentPath = await ttsService.synthesizeText(seg.text)
        tempFiles.push({
          path: segmentPath,
          startTime: seg.startTime,
          endTime: seg.endTime,
          text: seg.text,
        })
      } catch (err) {
        console.warn(`[TTS Pipeline] 段落合成失败 (${seg.startTime}s):`, (err as Error).message)
        // Continue with other segments, don't block the pipeline
      }
    }

    if (tempFiles.length === 0) {
      throw new Error('TTS 合成失败：所有段落都无法合成')
    }

    // Concatenate in order
    const finalPath = path.join(this.outputDir, `narration_${randomUUID()}.mp3`)

    if (tempFiles.length === 1) {
      fs.copyFileSync(tempFiles[0].path, finalPath)
    } else {
      await this.concatAudioFiles(
        tempFiles.map(t => t.path),
        finalPath
      )
    }

    // Clean temp files
    for (const f of tempFiles) {
      try { fs.unlinkSync(f.path) } catch { /* ignore */ }
    }

    return {
      audioPath: finalPath,
      segments: tempFiles.map(t => ({
        audioPath: t.path,
        startTime: t.startTime,
        endTime: t.endTime,
        text: t.text,
      })),
      totalDuration: await this.getAudioDuration(finalPath),
    }
  }

  async synthesizeSegments(
    segments: Array<{ text: string; startTime: number; endTime: number }>
  ): Promise<TTSPipelineResult> {
    return this.synthesizeScript({
      segments: segments.map(s => ({
        text: s.text,
        startTime: s.startTime,
        endTime: s.endTime,
        needsImage: false,
      })),
      totalDuration: 0,
      metadata: { wordCount: 0, estimatedTTSSDuration: 0, imageCount: 0 },
    })
  }

  private concatAudioFiles(inputPaths: string[], outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const listPath = path.join(this.outputDir, `concat_${randomUUID()}.txt`)
      const fileList = inputPaths.map(p => `file '${p}'`).join('\n')
      fs.writeFileSync(listPath, fileList)

      const { exec } = require('child_process')
      exec(
        `ffmpeg -f concat -safe 0 -i "${listPath}" -c copy "${outputPath}" -y`,
        (error: Error | null) => {
          try { fs.unlinkSync(listPath) } catch { /* ignore */ }
          if (error) reject(new Error(`音频拼接失败: ${error.message}`))
          else resolve()
        }
      )
    })
  }

  private getAudioDuration(audioPath: string): Promise<number> {
    return new Promise((resolve) => {
      const { exec } = require('child_process')
      exec(
        `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`,
        (_err: Error | null, stdout: string) => {
          const dur = parseFloat(stdout.trim())
          resolve(isNaN(dur) ? 0 : dur)
        }
      )
    })
  }
}

export const ttsPipelineService = new TTSPipelineService()
