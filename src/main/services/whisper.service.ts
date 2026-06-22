import path from 'path'
import fs from 'fs'
import { app } from 'electron'
import { randomUUID } from 'crypto'
import type { SubtitleItem } from '../../shared/types/subtitle'

/**
 * Real transcription pipeline. Priority:
 * 1. whisper.cpp CLI (local, free)
 * 2. Minimax STT API (cloud, uses existing API key)
 */

class WhisperService {
  private outputDir: string

  private fillerPatterns = [
    /^[嗯啊哦呃哎唉诶]$/,
    /^那个$/, /^这个$/, /^然后$/,
    /^um+$/i, /^uh+$/i, /^ah+$/i,
    /^like$/i, /^you know$/i,
  ]

  constructor() {
    this.outputDir = path.join(app.getPath('userData'), 'transcription')
    if (!fs.existsSync(this.outputDir)) fs.mkdirSync(this.outputDir, { recursive: true })
  }

  // ---- public API ----

  async isReady(): Promise<boolean> {
    return await this.checkWhisperCPP() || !!process.env.MINIMAX_API_KEY
  }

  async transcribe(
    audioPath: string,
    language: string = 'zh',
    onProgress?: (progress: number) => void
  ): Promise<SubtitleItem[]> {
    onProgress?.(5)

    // Try whisper.cpp first (local, free)
    if (await this.checkWhisperCPP()) {
      onProgress?.(15)
      const subtitles = await this.transcribeViaWhisperCPP(audioPath, language)
      onProgress?.(90)
      return subtitles
    }

    // Try Minimax cloud API
    const apiKey = process.env.MINIMAX_API_KEY
    if (apiKey) {
      onProgress?.(15)
      const subtitles = await this.transcribeViaMinimax(audioPath, language, apiKey)
      onProgress?.(90)
      return subtitles
    }

    throw new Error(
      '语音转录失败。未检测到 whisper.cpp 也未配置 MINIMAX_API_KEY。\n' +
      '请安装 whisper.cpp 或在 .env 中配置 MINIMAX_API_KEY。'
    )
  }

  // ---- provider checks ----

  private async checkWhisperCPP(): Promise<boolean> {
    try {
      const { execSync } = await import('child_process')
      execSync('whisper --version 2>/dev/null || whisper-cpp --version 2>/dev/null', { stdio: 'pipe', timeout: 3000 })
      return true
    } catch {
      return false
    }
  }

  // ---- whisper.cpp transcription ----

  private async transcribeViaWhisperCPP(audioPath: string, language: string): Promise<SubtitleItem[]> {
    const { execSync } = await import('child_process')
    const lang = language === 'zh' ? 'zh' : 'en'
    const outDir = path.join(this.outputDir, 'whisper_tmp')
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })

    const cmd = `whisper "${audioPath}" --model base --language ${lang} --output_format srt --output_dir "${outDir}" --task transcribe`
    execSync(cmd, { timeout: 300000, stdio: 'pipe' })

    const baseName = path.basename(audioPath, path.extname(audioPath))
    const srtPath = path.join(outDir, `${baseName}.srt`)
    if (fs.existsSync(srtPath)) {
      return this.parseSRT(fs.readFileSync(srtPath, 'utf-8'))
    }
    return []
  }

  // ---- Minimax STT cloud ----

  private async transcribeViaMinimax(audioPath: string, language: string, apiKey: string): Promise<SubtitleItem[]> {
    const wavBuffer = fs.readFileSync(audioPath)
    const base64 = wavBuffer.toString('base64')

    const langMap: Record<string, string> = { zh: 'zh', en: 'en', ja: 'ja', ko: 'ko' }

    const response = await fetch('https://api.minimaxi.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'speech-01',
        file: base64,
        language: langMap[language] || 'zh',
        response_format: 'verbose_json',
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`Minimax STT 错误 ${response.status}: ${err.slice(0, 200)}`)
    }

    const data: any = await response.json()
    const segments = data.segments || data.text ? [{ text: data.text, start: 0, end: 5 }] : []

    return segments.map((seg: any, idx: number) => ({
      id: `sub_${idx}`,
      text: seg.text?.trim() || '',
      startTime: seg.start || seg.start_time || Number(seg.startTime) || 0,
      endTime: seg.end || seg.end_time || Number(seg.endTime) || 0,
      confidence: seg.confidence || seg.score || 0.8,
      isFillerWord: this.isFillerWord(seg.text?.trim() || ''),
    }))
  }

  // ---- SRT parser ----

  private parseSRT(srtContent: string): SubtitleItem[] {
    const blocks = srtContent.split(/\n\n+/)
    const items: SubtitleItem[] = []
    for (const block of blocks) {
      const lines = block.trim().split('\n')
      if (lines.length < 3) continue
      const timeMatch = lines[1].match(
        /(\d+):(\d+):(\d+)[.,](\d+)\s*-->\s*(\d+):(\d+):(\d+)[.,](\d+)/
      )
      if (!timeMatch) continue
      const startTime =
        parseInt(timeMatch[1]) * 3600 + parseInt(timeMatch[2]) * 60 +
        parseInt(timeMatch[3]) + parseInt(timeMatch[4]) / 1000
      const endTime =
        parseInt(timeMatch[5]) * 3600 + parseInt(timeMatch[6]) * 60 +
        parseInt(timeMatch[7]) + parseInt(timeMatch[8]) / 1000
      const text = lines.slice(2).join(' ').trim()
      items.push({
        id: `sub_${items.length}`,
        text,
        startTime,
        endTime,
        confidence: 0.95,
        isFillerWord: this.isFillerWord(text),
      })
    }
    return items
  }

  // ---- helpers ----

  private isFillerWord(text: string): boolean {
    return this.fillerPatterns.some(p => p.test(text))
  }

  generateSRT(subtitles: SubtitleItem[]): string {
    return subtitles
      .filter(s => s.text.trim())
      .map((s, idx) => {
        const sf = this.srtTime(s.startTime)
        const ef = this.srtTime(s.endTime)
        return `${idx + 1}\n${sf} --> ${ef}\n${s.text}\n`
      })
      .join('\n')
  }

  private srtTime(sec: number): string {
    const h = Math.floor(sec / 3600)
    const m = Math.floor((sec % 3600) / 60)
    const s = sec % 60
    const ms = Math.floor((s % 1) * 1000)
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(Math.floor(s)).padStart(2, '0')},${String(ms).padStart(3, '0')}`
  }

  async exportSRT(subtitles: SubtitleItem[], outputPath?: string): Promise<string> {
    const srt = this.generateSRT(subtitles)
    const filePath = outputPath || path.join(this.outputDir, `sub_${randomUUID()}.srt`)
    fs.writeFileSync(filePath, srt, 'utf-8')
    return filePath
  }

  markFillerWords(subtitles: SubtitleItem[]): SubtitleItem[] {
    return subtitles.map(s => ({
      ...s,
      isFillerWord: s.isFillerWord || this.isFillerWord(s.text.trim()),
    }))
  }
}

export const whisperService = new WhisperService()
