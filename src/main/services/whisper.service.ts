import path from 'path'
import fs from 'fs'
import { app } from 'electron'
import { randomUUID } from 'crypto'
import type { SubtitleItem } from '../../shared/types/subtitle'

/**
 * Transcription provider priority:
 * 1. SiliconFlow (FunAudioLLM/SenseVoiceSmall, free cloud API)
 * 2. Python openai-whisper (local, free)
 * 3. whisper.cpp CLI (local, free)
 */

class WhisperService {
  private outputDir: string

  private fillerPatterns = [
    /^[嗯啊哦呃哎唉诶]$/, /^那个$/, /^这个$/, /^然后$/,
    /^um+$/i, /^uh+$/i, /^ah+$/i, /^like$/i,
  ]

  constructor() {
    this.outputDir = path.join(app.getPath('userData'), 'whisper_out')
    if (!fs.existsSync(this.outputDir)) fs.mkdirSync(this.outputDir, { recursive: true })
  }

  async isReady(): Promise<boolean> {
    if (process.env.SILICONFLOW_API_KEY) return true
    return await this.checkPythonWhisper() || await this.checkWhisperCPP()
  }

  async transcribe(audioPath: string, language = 'zh', onProgress?: (n: number) => void): Promise<SubtitleItem[]> {
    onProgress?.(5)

    // 1. SiliconFlow (free cloud)
    if (process.env.SILICONFLOW_API_KEY) {
      onProgress?.(15)
      const r = await this.viaSiliconFlow(audioPath)
      onProgress?.(90)
      return r
    }

    // 2. Python openai-whisper (local)
    if (await this.checkPythonWhisper()) {
      onProgress?.(15)
      const r = await this.viaPython(audioPath)
      onProgress?.(90)
      return r
    }

    // 3. whisper.cpp CLI
    if (await this.checkWhisperCPP()) {
      onProgress?.(15)
      const r = await this.viaWhisperCPP(audioPath)
      onProgress?.(90)
      return r
    }

    throw new Error(
      '语音转录失败。请配置 SILICONFLOW_API_KEY（免费）或安装 pip3 install openai-whisper'
    )
  }

  // ==================== SiliconFlow ====================

  private async viaSiliconFlow(audioPath: string): Promise<SubtitleItem[]> {
    const apiKey = process.env.SILICONFLOW_API_KEY!
    const fileExt = path.extname(audioPath).toLowerCase()
    const mimeMap: Record<string, string> = {
      '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg',
      '.flac': 'audio/flac', '.m4a': 'audio/mp4', '.aac': 'audio/aac',
    }
    const mimeType = mimeMap[fileExt] || 'audio/wav'

    // Read file and build multipart form
    const fileBuffer = fs.readFileSync(audioPath)
    const formData = new FormData()
    formData.append('file', new Blob([fileBuffer], { type: mimeType }), path.basename(audioPath))
    formData.append('model', 'FunAudioLLM/SenseVoiceSmall')

    const response = await fetch('https://api.siliconflow.cn/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: formData,
    })

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`SiliconFlow STT ${response.status}: ${err.slice(0, 200)}`)
    }

    const data: any = await response.json()
    const fullText: string = data.text || ''

    // SenseVoiceSmall returns full text with punctuation but no timestamps.
    // Split into segments by Chinese/English punctuation marks.
    return this.segmentText(fullText, audioPath)
  }

  // ==================== Python openai-whisper ====================

  private async checkPythonWhisper(): Promise<boolean> {
    try {
      const { execSync } = await import('child_process')
      execSync('python3 -c "import whisper"', { stdio: 'pipe', timeout: 5000 })
      return true
    } catch { return false }
  }

  private async viaPython(wavPath: string): Promise<SubtitleItem[]> {
    const { execSync } = await import('child_process')
    const outDir = this.outputDir

    const script = `
import whisper, json, sys
model = whisper.load_model("base")
result = model.transcribe("${wavPath.replace(/"/g, '\\"')}", language="zh", word_timestamps=True)
segments = []
for s in result.get("segments", []):
    segments.append({"start": s["start"], "end": s["end"], "text": s["text"].strip()})
print(json.dumps(segments, ensure_ascii=False))
`
    const tmpScript = path.join(outDir, `whisper_${Date.now()}.py`)
    fs.writeFileSync(tmpScript, script, 'utf-8')
    try {
      const stdout = execSync(`python3 "${tmpScript}"`, {
        timeout: 300000, maxBuffer: 10 * 1024 * 1024, stdio: 'pipe',
      })
      const segs: Array<{ start: number; end: number; text: string }> = JSON.parse(stdout.toString())
      return segs.map((s, i) => ({ id: `sub_${i}`, text: s.text, startTime: s.start, endTime: s.end, confidence: 0.9, isFillerWord: this.isFillerWord(s.text) }))
    } finally {
      try { fs.unlinkSync(tmpScript) } catch { /* ok */ }
    }
  }

  // ==================== whisper.cpp ====================

  private async checkWhisperCPP(): Promise<boolean> {
    try {
      const { execSync } = await import('child_process')
      execSync('whisper --version 2>/dev/null || whisper-cpp --version 2>/dev/null', { stdio: 'pipe', timeout: 3000 })
      return true
    } catch { return false }
  }

  private async viaWhisperCPP(audioPath: string): Promise<SubtitleItem[]> {
    const { execSync } = await import('child_process')
    const outDir = path.join(this.outputDir, 'cpp_tmp')
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })
    execSync(`whisper "${audioPath}" --model base --language zh --output_format srt --output_dir "${outDir}" --task transcribe`, { timeout: 300000, stdio: 'pipe' })
    const baseName = path.basename(audioPath, path.extname(audioPath))
    const srtPath = path.join(outDir, `${baseName}.srt`)
    if (fs.existsSync(srtPath)) return this.parseSRT(fs.readFileSync(srtPath, 'utf-8'))
    return []
  }

  // ==================== Segment text (for SiliconFlow raw text) ====================

  private segmentText(fullText: string, audioPath: string): SubtitleItem[] {
    const duration = this.getAudioDurationSync(audioPath)
    const charsPerSecond = duration > 0 ? fullText.length / duration : 5
    const items: SubtitleItem[] = []
    let pos = 0
    let id = 0

    // Split by punctuation then group into ~15-char segments
    const sentences = fullText.split(/(?<=[。！？，、；：\n.?!,;:])/g)

    let buffer = ''
    let bufferStart = 0

    for (let i = 0; i < sentences.length; i++) {
      buffer += sentences[i]

      if (buffer.length >= 12 || i === sentences.length - 1) {
        const endTime = Math.min(duration, (pos + buffer.length) / charsPerSecond)
        items.push({
          id: `sub_${id++}`,
          text: buffer.trim(),
          startTime: bufferStart,
          endTime,
          confidence: 0.85,
          isFillerWord: this.isFillerWord(buffer.trim()),
        })
        pos += buffer.length
        bufferStart = endTime
        buffer = ''
      }
    }

    return items.length > 0 ? items : [
      { id: 'sub_0', text: fullText, startTime: 0, endTime: duration || 5, confidence: 0.85, isFillerWord: false },
    ]
  }

  private getAudioDurationSync(audioPath: string): number {
    try {
      const { execSync } = require('child_process')
      const out = execSync(
        `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`,
        { stdio: 'pipe', timeout: 5000 }
      )
      return parseFloat(out.toString()) || 30
    } catch {
      return 30
    }
  }

  // ==================== helpers ====================

  private parseSRT(srt: string): SubtitleItem[] {
    const items: SubtitleItem[] = []
    for (const block of srt.split(/\n\n+/)) {
      const lines = block.trim().split('\n')
      if (lines.length < 3) continue
      const m = lines[1].match(/(\d+):(\d+):(\d+)[.,](\d+)\s*-->\s*(\d+):(\d+):(\d+)[.,](\d+)/)
      if (!m) continue
      const st = +m[1] * 3600 + +m[2] * 60 + +m[3] + +m[4] / 1000
      const et = +m[5] * 3600 + +m[6] * 60 + +m[7] + +m[8] / 1000
      const text = lines.slice(2).join(' ').trim()
      items.push({ id: `sub_${items.length}`, text, startTime: st, endTime: et, confidence: 0.95, isFillerWord: this.isFillerWord(text) })
    }
    return items
  }

  private isFillerWord(text: string): boolean {
    return this.fillerPatterns.some(p => p.test(text))
  }

  generateSRT(subtitles: SubtitleItem[]): string {
    return subtitles.filter(s => s.text.trim()).map((s, i) => {
      const f = (t: number) => { const h = ~~(t / 3600), m = ~~((t % 3600) / 60), sec = t % 60; return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(~~sec).padStart(2, '0')},${String(~~((sec % 1) * 1000)).padStart(3, '0')}` }
      return `${i + 1}\n${f(s.startTime)} --> ${f(s.endTime)}\n${s.text}\n`
    }).join('\n')
  }

  async exportSRT(subtitles: SubtitleItem[], outputPath?: string): Promise<string> {
    const srt = this.generateSRT(subtitles)
    const fp = outputPath || path.join(this.outputDir, `sub_${randomUUID()}.srt`)
    fs.writeFileSync(fp, srt, 'utf-8')
    return fp
  }

  markFillerWords(subtitles: SubtitleItem[]): SubtitleItem[] {
    return subtitles.map(s => ({ ...s, isFillerWord: s.isFillerWord || this.isFillerWord(s.text.trim()) }))
  }
}

export const whisperService = new WhisperService()
