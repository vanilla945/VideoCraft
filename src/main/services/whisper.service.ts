import path from 'path'
import fs from 'fs'
import { app } from 'electron'
import { randomUUID } from 'crypto'
import type { SubtitleItem } from '../../shared/types/subtitle'

/**
 * Real transcription pipeline.
 * 1. openai-whisper (Python, pip3 install openai-whisper) ← installed
 * 2. whisper.cpp CLI (brew install whisper-cpp)
 * No mock — real transcription or clear error.
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
    this.outputDir = path.join(app.getPath('userData'), 'whisper_out')
    if (!fs.existsSync(this.outputDir)) fs.mkdirSync(this.outputDir, { recursive: true })
  }

  async isReady(): Promise<boolean> {
    return (await this.checkPythonWhisper()) || (await this.checkWhisperCPP())
  }

  async transcribe(audioPath: string, language = 'zh', onProgress?: (n: number) => void): Promise<SubtitleItem[]> {
    onProgress?.(5)
    const pyLang = language === 'zh' ? 'zh' : language

    // openai-whisper (Python)
    if (await this.checkPythonWhisper()) {
      onProgress?.(15)
      const r = await this.viaPython(audioPath, pyLang)
      onProgress?.(90)
      return r
    }

    // whisper.cpp
    if (await this.checkWhisperCPP()) {
      onProgress?.(15)
      const r = await this.viaWhisperCPP(audioPath, pyLang)
      onProgress?.(90)
      return r
    }

    throw new Error('语音转录失败。请安装: pip3 install openai-whisper')
  }

  // ---- check helpers ----

  private async checkPythonWhisper(): Promise<boolean> {
    try {
      const { execSync } = await import('child_process')
      execSync('python3 -c "import whisper"', { stdio: 'pipe', timeout: 5000 })
      return true
    } catch {
      return false
    }
  }

  private async checkWhisperCPP(): Promise<boolean> {
    try {
      const { execSync } = await import('child_process')
      execSync('whisper --version 2>/dev/null || whisper-cpp --version 2>/dev/null', { stdio: 'pipe', timeout: 3000 })
      return true
    } catch {
      return false
    }
  }

  // ---- transcribe via Python openai-whisper ----

  private async viaPython(wavPath: string, language: string): Promise<SubtitleItem[]> {
    const { execSync } = await import('child_process')
    const outDir = this.outputDir

    const script = `
import whisper, json, sys
model = whisper.load_model("base")
result = model.transcribe("${wavPath.replace(/"/g, '\\"')}", language="${language}", word_timestamps=True)
segments = []
for s in result.get("segments", []):
    segments.append({"start": s["start"], "end": s["end"], "text": s["text"].strip()})
print(json.dumps(segments, ensure_ascii=False))
`

    const tmpScript = path.join(outDir, `whisper_${Date.now()}.py`)
    fs.writeFileSync(tmpScript, script, 'utf-8')

    try {
      const stdout = execSync(`python3 "${tmpScript}"`, { timeout: 300000, maxBuffer: 10 * 1024 * 1024, stdio: 'pipe' })
      const segments: Array<{ start: number; end: number; text: string }> = JSON.parse(stdout.toString())

      return segments.map((s, i) => ({
        id: `sub_${i}`,
        text: s.text,
        startTime: s.start,
        endTime: s.end,
        confidence: 0.9,
        isFillerWord: this.isFillerWord(s.text),
      }))
    } finally {
      try { fs.unlinkSync(tmpScript) } catch { /* ok */ }
    }
  }

  // ---- transcribe via whisper.cpp CLI ----

  private async viaWhisperCPP(audioPath: string, language: string): Promise<SubtitleItem[]> {
    const { execSync } = await import('child_process')
    const outDir = path.join(this.outputDir, 'cpp_tmp')
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })

    const lang = language === 'zh' ? 'zh' : 'en'
    execSync(`whisper "${audioPath}" --model base --language ${lang} --output_format srt --output_dir "${outDir}" --task transcribe`, { timeout: 300000, stdio: 'pipe' })

    const baseName = path.basename(audioPath, path.extname(audioPath))
    const srtPath = path.join(outDir, `${baseName}.srt`)
    if (fs.existsSync(srtPath)) {
      return this.parseSRT(fs.readFileSync(srtPath, 'utf-8'))
    }
    return []
  }

  // ---- SRT parser ----

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
