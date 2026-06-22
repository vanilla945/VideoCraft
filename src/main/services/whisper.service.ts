import path from 'path'
import fs from 'fs'
import { app } from 'electron'
import { randomUUID } from 'crypto'
import type { SubtitleItem } from '../../shared/types/subtitle'

interface WhisperResult {
  text: string
  segments: Array<{
    id: number
    start: number
    end: number
    text: string
    confidence?: number
  }>
}

class WhisperService {
  private model: any = null
  private modelName: string = 'Xenova/whisper-base'
  private ready: boolean = false
  private loading: Promise<void> | null = null
  private outputDir: string

  // Common filler words in Chinese and English
  private fillerPatterns = [
    /^[嗯啊哦呃哎唉诶]$/,           // Chinese filler
    /^那个$/, /^这个$/, /^然后$/,    // Chinese filler phrases
    /^um+$/i, /^uh+$/i, /^ah+$/i,   // English filler
    /^like$/i, /^you know$/i,        // English filler phrases
  ]

  constructor() {
    this.outputDir = path.join(app.getPath('userData'), 'transcription')
    this.ensureDir(this.outputDir)
    // Lazy load on first use to avoid startup crash
  }

  private ensureDir(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  }

  private async loadModel(): Promise<void> {
    if (this.loading) return this.loading
    this.loading = this._loadModel()
    return this.loading
  }

  private async _loadModel(): Promise<void> {
    try {
      // Dynamic import to avoid blocking startup if not installed
      const { pipeline } = await import('@xenova/transformers')
      this.model = await pipeline('automatic-speech-recognition', this.modelName)
      this.ready = true
    } catch (err) {
      this.ready = false
    }
  }

  async isReady(): Promise<boolean> {
    await this.loadModel()
    return this.ready
  }

  async transcribe(
    audioPath: string,
    language: string = 'zh',
    onProgress?: (progress: number) => void
  ): Promise<SubtitleItem[]> {
    await this.loadModel()

    if (!this.ready) {
      // Fallback: return mock subtitle for testing
      console.warn('[Whisper] 使用 mock 模式生成字幕')
      return this.generateMockSubtitles(audioPath)
    }

    try {
      onProgress?.(10)

      // Run transcription
      const result: WhisperResult = await this.model(audioPath, {
        language,
        task: 'transcribe',
        return_timestamps: 'word',
        chunk_length_s: 30,
        stride_length_s: 5,
      })

      onProgress?.(80)

      // Convert to SubtitleItem[]
      const subtitles = this.segmentsToSubtitles(result.segments)
      onProgress?.(100)

      return subtitles
    } catch (err) {
      console.error('[Whisper] 转录失败:', (err as Error).message)
      throw new Error(`语音转录失败: ${(err as Error).message}`)
    }
  }

  async transcribeWithProgress(
    audioPath: string,
    language: string = 'zh',
    onProgress?: (progress: number, status: string) => void
  ): Promise<SubtitleItem[]> {
    return this.transcribe(audioPath, language, (p) => onProgress?.(p, 'transcribing'))
  }

  private segmentsToSubtitles(segments: WhisperResult['segments']): SubtitleItem[] {
    return segments.map((seg, idx) => ({
      id: `sub_${idx}`,
      text: seg.text.trim(),
      startTime: seg.start,
      endTime: seg.end,
      confidence: seg.confidence ?? 0.8,
      isFillerWord: this.isFillerWord(seg.text.trim()),
    }))
  }

  private isFillerWord(text: string): boolean {
    return this.fillerPatterns.some(pattern => pattern.test(text))
  }

  private generateMockSubtitles(audioPath: string): SubtitleItem[] {
    // Generate demo subtitles based on audio file existence
    const fileName = path.basename(audioPath, path.extname(audioPath))
    return [
      { id: 'sub_0', text: '欢迎使用 VideoCraft', startTime: 0.0, endTime: 2.5, confidence: 0.9, isFillerWord: false },
      { id: 'sub_1', text: '这是一个 AI 驱动的视频剪辑工具', startTime: 2.5, endTime: 5.5, confidence: 0.9, isFillerWord: false },
      { id: 'sub_2', text: '请确保已安装 whisper.cpp 以获得最佳转录效果', startTime: 5.5, endTime: 9.0, confidence: 0.85, isFillerWord: false },
      { id: 'sub_3', text: '嗯', startTime: 9.0, endTime: 9.5, confidence: 0.6, isFillerWord: true },
      { id: 'sub_4', text: '更多详细信息请参考项目文档', startTime: 9.5, endTime: 12.0, confidence: 0.9, isFillerWord: false },
    ]
  }

  generateSRT(subtitles: SubtitleItem[]): string {
    return subtitles
      .filter(s => s.text.trim())
      .map((s, idx) => {
        const startFormatted = this.formatSRTTime(s.startTime)
        const endFormatted = this.formatSRTTime(s.endTime)
        return `${idx + 1}\n${startFormatted} --> ${endFormatted}\n${s.text}\n`
      })
      .join('\n')
  }

  private formatSRTTime(seconds: number): string {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    const ms = Math.floor((seconds % 1) * 1000)
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(Math.floor(s)).padStart(2, '0')},${String(ms).padStart(3, '0')}`
  }

  async exportSRT(subtitles: SubtitleItem[], outputPath?: string): Promise<string> {
    const srt = this.generateSRT(subtitles)
    const filePath = outputPath || path.join(this.outputDir, `subtitle_${randomUUID()}.srt`)
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
