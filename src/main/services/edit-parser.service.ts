import type { SubtitleItem } from '../../shared/types/subtitle'
import type { CreativeInput } from '../../shared/types/creative-input'
import { modelRouter } from './model-router.service'

export type EditCommandType =
  | 'delete_clip'
  | 'speed_up'
  | 'slow_down'
  | 'add_transition'
  | 'reorder'
  | 'add_title'
  | 'change_style'
  | 'add_music'
  | 'trim'
  | 'split'
  | 'crop_to_vertical'
  | 'generate_cover'
  | 'unknown'

export interface ParsedCommand {
  type: EditCommandType
  originalText: string
  confidence: number
  params: Record<string, any>
  explanation: string               // 用通俗语言解释 AI 要做什么
  previewDescription?: string       // 预览执行效果
}

class EditParserService {
  async parse(text: string, context: { subtitles: SubtitleItem[]; creativeInput: CreativeInput }): Promise<ParsedCommand> {
    // Step 1: Rule-based classification for simple commands
    const ruleResult = this.classifyByRules(text, context)
    if (ruleResult && ruleResult.confidence > 0.8) {
      return ruleResult
    }

    // Step 2: LLM-based parsing for complex/ambiguous commands
    try {
      return await this.llmParse(text, context)
    } catch {
      return this.fallbackCommand(text)
    }
  }

  private classifyByRules(text: string, context: { subtitles: SubtitleItem[] }): ParsedCommand | null {
    const t = text.toLowerCase()

    // Delete/clip removal
    if (t.includes('删除') || t.includes('删掉') || t.includes('剪掉') || t.includes('去掉') || t.includes('切除')) {
      const keyword = this.extractKeyword(text)
      return {
        type: 'delete_clip',
        originalText: text,
        confidence: 0.85,
        params: { keyword },
        explanation: `删除包含"${keyword}"的片段`,
        previewDescription: `找到包含"${keyword}"的片段并将其从时间线移除`,
      }
    }

    // Speed up
    if (t.includes('加速') || t.includes('快点') || t.includes('快进') || t.includes('倍速')) {
      const ratio = this.extractSpeed(text) || 1.5
      return {
        type: 'speed_up',
        originalText: text,
        confidence: 0.85,
        params: { ratio, keyword: this.extractKeyword(text) },
        explanation: `将相关片段加速 ${ratio}x`,
        previewDescription: `视频播放速度提升至 ${ratio}x`,
      }
    }

    // Slow down
    if (t.includes('减速') || t.includes('慢点') || t.includes('慢放')) {
      const ratio = this.extractSpeed(text) || 0.75
      return {
        type: 'slow_down',
        originalText: text,
        confidence: 0.85,
        params: { ratio },
        explanation: `将相关片段减速至 ${ratio}x`,
      }
    }

    // Add transition
    if (t.includes('转场') || t.includes('过渡') || t.includes('淡入淡出') || t.includes('过渡效果')) {
      let transition = 'fade'
      if (t.includes('缩放')) transition = 'zoom'
      else if (t.includes('滑动')) transition = 'slide'
      return {
        type: 'add_transition',
        originalText: text,
        confidence: 0.8,
        params: { transition, keyword: this.extractKeyword(text) },
        explanation: `添加${transition}转场效果`,
      }
    }

    // Reorder/crop
    if (t.includes('重排') || t.includes('调整顺序') || t.includes('移到')) {
      return {
        type: 'reorder',
        originalText: text,
        confidence: 0.7,
        params: { keyword: this.extractKeyword(text) },
        explanation: '重新排列片段顺序',
      }
    }

    // Add title card
    if (t.includes('标题') || t.includes('字幕卡') || t.includes('标题卡') || t.includes('片头')) {
      return {
        type: 'add_title',
        originalText: text,
        confidence: 0.8,
        params: { text: this.extractKeyword(text) },
        explanation: `添加标题卡片`,
      }
    }

    // Vertical crop
    if (t.includes('竖屏') || t.includes('9:16') || t.includes('抖音')) {
      return {
        type: 'crop_to_vertical',
        originalText: text,
        confidence: 0.9,
        params: { autoCrop: true },
        explanation: '智能裁剪为竖屏 9:16',
        previewDescription: 'AI 将自动跟踪主体位置，逐段裁剪为竖屏',
      }
    }

    // Generate cover
    if (t.includes('封面') || t.includes('封面图') || t.includes('缩略图')) {
      return {
        type: 'generate_cover',
        originalText: text,
        confidence: 0.85,
        params: {},
        explanation: '自动生成封面图',
        previewDescription: '根据视频内容和标题自动生成封面',
      }
    }

    // Change style
    if (t.includes('风格') || t.includes('换个风格') || t.includes('改风格')) {
      return {
        type: 'change_style',
        originalText: text,
        confidence: 0.75,
        params: { keyword: this.extractKeyword(text) },
        explanation: '切换剪辑风格',
      }
    }

    return null
  }

  private async llmParse(text: string, context: { subtitles: SubtitleItem[]; creativeInput: CreativeInput }): Promise<ParsedCommand> {
    const subSummary = context.subtitles.slice(0, 20)
      .map(s => `[${s.startTime.toFixed(1)}s] ${s.text}`)
      .join('\n')

    const prompt = `用户指令: "${text}"

当前视频信息:
${subSummary}

当前风格: ${context.creativeInput.presetId}
当前模式: ${context.creativeInput.editingMode}

请解析用户的编辑指令，返回 JSON:
{
  "type": "delete_clip|speed_up|slow_down|add_transition|reorder|add_title|change_style|add_music|trim|split|crop_to_vertical|generate_cover|unknown",
  "confidence": 0.0-1.0,
  "params": {},
  "explanation": "通俗解释",
  "previewDescription": "执行效果描述"
}
只返回 JSON。`

    const response = await modelRouter.complete('fast', {
      prompt,
      systemPrompt: '你是视频编辑指令解析 AI。你只返回 JSON。',
      temperature: 0.1,
      maxTokens: 500,
    })

    try {
      return JSON.parse(response.replace(/```json|```/g, '').trim())
    } catch {
      return this.fallbackCommand(text)
    }
  }

  private extractKeyword(text: string): string {
    // Extract quoted text
    const quoted = text.match(/["“](.+?)["”]/) || text.match(/['‘](.+?)['’]/)
    if (quoted) return quoted[1]

    // Remove action verbs
    const actions = ['删除', '删掉', '剪掉', '去掉', '加速', '减速', '添加', '移到', '调整', '修改']
    let keyword = text
    for (const a of actions) {
      keyword = keyword.replace(new RegExp(a, 'g'), '')
    }
    return keyword.trim().slice(0, 30)
  }

  private extractSpeed(text: string): number | null {
    const match = text.match(/(\d+\.?\d*)\s*[倍xX]/)
    return match ? parseFloat(match[1]) : null
  }

  private fallbackCommand(text: string): ParsedCommand {
    return {
      type: 'unknown',
      originalText: text,
      confidence: 0.3,
      params: {},
      explanation: `无法精确理解该指令，但已记录: "${text.slice(0, 60)}"`,
      previewDescription: '该指令暂不支持，将在后续版本中完善',
    }
  }
}

export const editParserService = new EditParserService()
