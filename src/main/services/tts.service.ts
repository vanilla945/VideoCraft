import { exec } from 'child_process'
import path from 'path'
import fs from 'fs'
import { app } from 'electron'
import { randomUUID } from 'crypto'
import { configService } from './config.service'
import { llmService } from './llm.service'

interface TTSSegment {
  text: string
  startTime: number
  endTime: number
}

class TTSService {
  private outputDir: string

  constructor() {
    this.outputDir = path.join(app.getPath('userData'), 'tts')
    this.ensureDir(this.outputDir)
  }

  private ensureDir(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  }

  async synthesizeText(text: string): Promise<string> {
    const config = configService.getAllConfig()
    const outputPath = path.join(this.outputDir, `tts_${randomUUID()}.mp3`)

    if (config.ttsProvider === 'local') {
      return await this.synthesizeEdgeTTS(text, outputPath)
    } else if (config.ttsProvider === 'minimax') {
      return await this.synthesizeMinimaxTTS(text, outputPath)
    } else if (config.ttsProvider === 'deepseek') {
      return await this.synthesizeOpenAITTSStyle(text, outputPath, 'deepseek')
    }
    throw new Error(`不支持的 TTS 供应商: ${config.ttsProvider}`)
  }

  async synthesizeSegments(segments: TTSSegment[]): Promise<string> {
    const tempFiles: string[] = []

    try {
      for (const seg of segments) {
        const tempPath = path.join(this.outputDir, `tts_seg_${randomUUID()}.mp3`)
        const config = configService.getAllConfig()

        if (config.ttsProvider === 'local') {
          await this.synthesizeEdgeTTS(seg.text, tempPath)
        } else if (config.ttsProvider === 'minimax') {
          await this.synthesizeMinimaxTTS(seg.text, tempPath)
        } else {
          await this.synthesizeOpenAITTSStyle(seg.text, tempPath, config.ttsProvider)
        }
        tempFiles.push(tempPath)
      }

      // Concatenate audio files
      const finalPath = path.join(this.outputDir, `tts_full_${randomUUID()}.mp3`)
      await this.concatAudioFiles(tempFiles, finalPath)
      return finalPath
    } finally {
      for (const f of tempFiles) {
        try { fs.unlinkSync(f) } catch { /* ignore */ }
      }
    }
  }

  private synthesizeEdgeTTS(text: string, outputPath: string): Promise<string> {
    const config = configService.getAllConfig()

    return new Promise((resolve, reject) => {
      const args = [
        '--text', `"${text.replace(/"/g, '\\"')}"`,
        '--voice', config.ttsVoice,
        '--write-media', outputPath,
      ]
      const cmd = `edge-tts ${args.join(' ')}`

      exec(cmd, (error) => {
        if (error) {
          reject(new Error(`Edge-TTS 合成失败: ${error.message}`))
        } else {
          resolve(outputPath)
        }
      })
    })
  }

  private async synthesizeMinimaxTTS(text: string, outputPath: string): Promise<string> {
    throw new Error(
      'Minimax TTS 尚未实现。请使用 Edge-TTS (TTS_PROVIDER=local) 或将 TTS 支持推迟到后续 Phase。'
    )
  }

  private async synthesizeOpenAITTSStyle(
    text: string,
    outputPath: string,
    provider: 'deepseek' | 'minimax'
  ): Promise<string> {
    throw new Error(
      `${provider} TTS 尚未实现。请使用 Edge-TTS (TTS_PROVIDER=local) 或将 TTS 支持推迟到后续 Phase。`
    )
  }

  private concatAudioFiles(inputPaths: string[], outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const listPath = path.join(this.outputDir, `concat_${randomUUID()}.txt`)
      const fileList = inputPaths.map((p) => `file '${p}'`).join('\n')
      fs.writeFileSync(listPath, fileList)

      exec(
        `ffmpeg -f concat -safe 0 -i "${listPath}" -c copy "${outputPath}" -y`,
        (error) => {
          try { fs.unlinkSync(listPath) } catch { /* ignore */ }
          if (error) reject(new Error(`音频拼接失败: ${error.message}`))
          else resolve()
        }
      )
    })
  }

  async estimateDuration(text: string): Promise<number> {
    // Chinese: ~3 chars per second; English: ~12 chars per second
    const chineseChars = (text.match(/[一-鿿]/g) || []).length
    const otherChars = text.length - chineseChars
    return Math.max(1, Math.ceil(chineseChars / 3 + otherChars / 12))
  }
}

export const ttsService = new TTSService()
