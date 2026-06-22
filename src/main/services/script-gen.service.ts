import type { SubtitleItem } from '../../shared/types/subtitle'
import type { CreativeInput } from '../../shared/types/creative-input'
import type { VisionResult } from './vision.service'
import { modelRouter } from './model-router.service'

export interface ScriptSegment {
  text: string
  startTime: number
  endTime: number
  needsImage: boolean
  imagePrompt?: string
  voiceStyle?: string
}

export interface GeneratedScript {
  segments: ScriptSegment[]
  totalDuration: number
  coverImagePrompt?: string
  title?: string
  metadata: {
    wordCount: number
    estimatedTTSSDuration: number
    imageCount: number
  }
}

class ScriptGenService {
  async generate(
    subtitles: SubtitleItem[],
    creativeInput: CreativeInput,
    visionResults?: VisionResult[],
    videoDuration?: number
  ): Promise<GeneratedScript> {
    const nonFiller = subtitles.filter(s => !s.isFillerWord)
    const transcript = nonFiller.map(s => `[${this.formatTime(s.startTime)}] ${s.text}`).join('\n')

    // Build system prompt from creative input and preset
    const constraints = this.buildConstraints(creativeInput)

    const prompt = `以下是一段视频的转录文本。请为其撰写专业解说词。

视频转录:
${transcript.slice(0, 6000)}

视频时长: ${videoDuration ? Math.round(videoDuration) : '未知'}秒
目标成片时长: ${creativeInput.targetDuration || '自动判断'}秒

${constraints}

请你:
1. 撰写解说词，每个段落标注起始时间
2. 标记需要配图的段落（封面图也要生成提示词）
3. 输出为 JSON 格式

格式:
{
  "title": "视频标题",
  "segments": [
    { "text": "解说词段落", "startTime": 0, "endTime": 5, "needsImage": false, "voiceStyle": "沉稳" },
    { "text": "解说词段落2", "startTime": 5, "endTime": 12, "needsImage": true, "imagePrompt": "产品内部结构示意图" }
  ],
  "coverImagePrompt": "封面图生成的prompt"
}
只返回 JSON，不要额外文字。`

    try {
      const response = await modelRouter.complete('heavy', {
        prompt,
        systemPrompt: '你是专业视频解说词撰写 AI。你只返回 JSON。',
        temperature: 0.7,
        maxTokens: 6000,
      })

      const json = this.parseJSON(response)
      if (json) {
        return this.postProcess(json, subtitles)
      }
    } catch (err) {
      console.warn('[ScriptGen] LLM 生成失败，使用 fallback:', (err as Error).message)
    }

    return this.fallbackScript(subtitles, creativeInput)
  }

  generateBrief(
    subtitles: SubtitleItem[],
    topic: string,
    targetDuration: number
  ): string {
    const nonFiller = subtitles.filter(s => !s.isFillerWord)
    const transcript = nonFiller.map(s => s.text).join(' ').slice(0, 4000)

    return `视频主题: ${topic || '未指定'}
目标时长: ${targetDuration || '自动'}秒
内容摘要: ${transcript.slice(0, 500)}

请用 2-3 句话概括这段视频的核心内容，作为解说的开场白。`
  }

  private buildConstraints(input: CreativeInput): string {
    const parts: string[] = []

    parts.push(`风格: ${input.presetId}`)
    if (input.targetDuration && input.targetDuration > 0) {
      parts.push(`目标时长: ${input.targetDuration} 秒。解说词长度必须适配这个时长。`)
    }
    if (input.customTopic) {
      parts.push(`主题重点: ${input.customTopic}`)
    }
    if (input.customKeyPoints?.length) {
      parts.push(`必须包含的关键信息:\n${input.customKeyPoints.map(p => `  - ${p}`).join('\n')}`)
    }
    if (input.customConstraints?.length) {
      parts.push(`特殊要求:\n${input.customConstraints.map(c => `  - ${c}`).join('\n')}`)
    }

    return parts.join('\n')
  }

  private fallbackScript(
    subtitles: SubtitleItem[],
    creativeInput: CreativeInput
  ): GeneratedScript {
    const nonFiller = subtitles.filter(s => !s.isFillerWord).slice(0, 10)
    const segments: ScriptSegment[] = nonFiller.map((s, i) => ({
      text: `第${i + 1}段: ${s.text}`,
      startTime: s.startTime,
      endTime: s.endTime,
      needsImage: i % 3 === 0,
      imagePrompt: i % 3 === 0 ? `${creativeInput.customTopic || '视频'} 配图` : undefined,
    }))

    return {
      segments,
      totalDuration: nonFiller.length > 0 ? nonFiller[nonFiller.length - 1].endTime : 0,
      title: creativeInput.customTopic || '未命名视频',
      metadata: {
        wordCount: segments.reduce((s, seg) => s + seg.text.length, 0),
        estimatedTTSSDuration: Math.ceil(segments.reduce((s, seg) => s + seg.text.length, 0) / 3),
        imageCount: segments.filter(s => s.needsImage).length,
      },
    }
  }

  private postProcess(json: any, subtitles: SubtitleItem[]): GeneratedScript {
    const segments: ScriptSegment[] = (json.segments || []).map((seg: any) => ({
      text: seg.text || '',
      startTime: seg.startTime || 0,
      endTime: seg.endTime || 0,
      needsImage: seg.needsImage || false,
      imagePrompt: seg.imagePrompt,
      voiceStyle: seg.voiceStyle,
    }))

    return {
      segments,
      totalDuration: subtitles.length > 0 ? Math.max(...subtitles.map(s => s.endTime)) : 0,
      title: json.title,
      coverImagePrompt: json.coverImagePrompt,
      metadata: {
        wordCount: segments.reduce((s, seg) => s + seg.text.length, 0),
        estimatedTTSSDuration: Math.ceil(segments.reduce((s, seg) => s + seg.text.length, 0) / 3),
        imageCount: segments.filter(s => s.needsImage).length,
      },
    }
  }

  private parseJSON(response: string): any {
    try {
      return JSON.parse(response.replace(/```json|```/g, '').trim())
    } catch {
      const match = response.match(/\{[\s\S]*\}/)
      if (match) {
        try { return JSON.parse(match[0]) } catch { return null }
      }
      return null
    }
  }

  private formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${String(s).padStart(2, '0')}`
  }
}

export const scriptGenService = new ScriptGenService()
