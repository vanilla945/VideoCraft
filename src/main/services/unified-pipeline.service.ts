import type { SubtitleItem } from '../../shared/types/subtitle'
import type { CreativeInput } from '../../shared/types/creative-input'
import type { StylePreset } from '../../shared/types/style-preset'
import { modelRouter } from './model-router.service'
import { BUILTIN_PRESETS } from '../../shared/types/style-preset'

export interface UnifiedResult {
  smartSubtitles: SmartSubtitle[]
  narration: NarrationSegment[]
  editDecisions: UnifiedEditDecision[]
  summary: UnifiedSummary
}

export interface SmartSubtitle {
  id: string; startTime: number; endTime: number
  originalText: string; enhancedText: string
  action: 'keep' | 'remove' | 'rewrite'; reason: string
  importance: number; category: 'opening' | 'core_content' | 'transition' | 'highlight' | 'filler' | 'closing'
}

export interface NarrationSegment {
  text: string; startTime: number; endTime: number
  needsImage: boolean; imagePrompt?: string
}

export interface UnifiedEditDecision {
  clipId: string; startTime: number; endTime: number
  action: 'keep' | 'remove' | 'trim' | 'speed'
  reason: string; speedRatio?: number; confidence: number
}

export interface UnifiedSummary {
  totalSegments: number; keptSegments: number; removedSegments: number
  rewrittenSegments: number; estimatedDuration: number
  title?: string; coverImagePrompt?: string; reasoning: string
}

function buildSystemPrompt(preset: StylePreset, input: CreativeInput, chatHistory?: string): string {
  const L = (s: string) => { lines.push(s) }
  const lines: string[] = []

  L('你是专业视频后期制作 AI。你的任务是一次完成三个工作：① 筛选和增强字幕 ② 撰写解说词 ③ 制定剪辑方案。')
  L('你必须严格遵循以下创作约束：')
  L('')
  L(`【风格】${preset.name}`)
  L(`- 整体风格: ${preset.tone.style}`)
  L(`- 用词规范: ${preset.tone.vocabulary}`)
  L(`- 情感曲线: ${preset.tone.emotion}`)
  L(`- 剪辑节奏: ${preset.pacing.cutRhythm}`)
  L(`- 目标受众: ${preset.audience.level}`)
  L(`- 内容深度: ${preset.audience.depth}`)
  L('')
  L('【用户意图】')
  L(`- 剪辑模式: ${input.editingMode}`)

  if (input.targetDuration && input.targetDuration > 0) {
    L(`- 目标时长: ${input.targetDuration}秒（强制约束！只保留最重要的片段，keep 总时长严格控制在 ${Math.round(input.targetDuration * 0.9)}-${Math.round(input.targetDuration * 1.1)} 秒。多余的全部标记为 remove！这是硬性要求。）`)
  } else {
    L('- 目标时长: 自动最优')
  }

  if (input.customTopic) L(`- 主题重点: ${input.customTopic}`)
  if (input.customKeyPoints?.length) {
    for (const kp of input.customKeyPoints) L(`- 关键信息: ${kp}`)
  }
  if (input.customConstraints?.length) {
    for (const c of input.customConstraints) L(`- 约束: ${c}`)
  }

  L('')
  L('【字幕处理原则】')
  L('- 保留有信息量的对话，删除纯填充词（嗯/啊/那个/um/uh）')
  L('- 删除与主题无关的离题内容')
  L('- 标记每个片段类型（opening/core_content/transition/highlight/filler/closing）')

  L('')
  L('【解说词原则】')
  L('- 解说词是对画面的补充，不是复述字幕')
  L('- 需要配图时标记 needsImage=true 并给出 imagePrompt')

  L('')
  L('【剪辑原则 —— 硬性要求，不可协商！】')
  if (input.targetDuration && input.targetDuration > 0) {
    L(`- 目标时长: ${input.targetDuration}秒！你必须大幅删减，只保留最核心的片段。editDecisions 中 keep 的总时长必须在 ${Math.round(input.targetDuration * 0.9)}-${Math.round(input.targetDuration * 1.1)} 秒。`)
    L('- 如果不知道哪些最重要，优先保留开场和结尾，然后按信息密度从高到低选择')
  } else {
    L('- 目标时长: 自动最优')
  }
  L('- 优先保留高信息密度片段，其余果断删除')
  L('- 保持叙事连贯性')

  if (chatHistory) {
    L('')
    L('【AI 助手对话历史——用户的额外指令】')
    L(chatHistory)
    L('请优先执行对话中用户提出的修改要求。')
  }

  return lines.join('\n')
}

function buildPrompt(
  subtitles: SubtitleItem[],
  _preset: StylePreset,
  input: CreativeInput,
  videoDuration: number
): string {
  const segmentList = subtitles.map((s, i) =>
    `[${i}] ${fmt(s.startTime)}-${fmt(s.endTime)} | ${s.isFillerWord ? '[填充词] ' : ''}${s.text}`
  ).join('\n')

  const durationHint = input.targetDuration && input.targetDuration > 0 && videoDuration > 0
    ? `目标成片时长: ${fmt(input.targetDuration)}（当前 ${fmt(videoDuration)}，需删减约 ${Math.round((1 - input.targetDuration / videoDuration) * 100)}%）`
    : '目标: 自动最优'

  return `以下是一段视频的原始字幕。请完整处理：

视频总时长: ${fmt(videoDuration)} | 总段数: ${subtitles.length}
${durationHint}

原始字幕:
${segmentList.slice(0, 8000)}

返回 JSON（只返回 JSON，无额外文字）:
{
  "smartSubtitles": [
    {"id": "sub_N", "startTime": 0.0, "endTime": 2.0, "originalText": "原文", "enhancedText": "润色后", "action": "keep|remove|rewrite", "reason": "...", "importance": 0.8, "category": "opening|core_content|transition|highlight|filler|closing"}
  ],
  "narration": [
    {"text": "解说词", "startTime": 0, "endTime": 5, "needsImage": false}
  ],
  "editDecisions": [
    {"clipId": "sub_N", "startTime": 0.0, "endTime": 2.0, "action": "keep|remove|trim|speed", "reason": "...", "confidence": 0.9}
  ],
  "summary": {
    "totalSegments": ${subtitles.length}, "keptSegments": 0, "removedSegments": 0,
    "rewrittenSegments": 0, "estimatedDuration": ${Math.round(input.targetDuration || videoDuration)},
    "reasoning": "处理策略说明"
  }
}`
}

function fmt(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

class UnifiedPipelineService {
  async process(
    subtitles: SubtitleItem[],
    creativeInput: CreativeInput,
    videoDuration?: number,
    chatHistory?: string
  ): Promise<UnifiedResult | null> {
    const preset = BUILTIN_PRESETS.find(p => p.id === creativeInput.presetId) || BUILTIN_PRESETS[0]
    const duration = videoDuration || 60
    const systemPrompt = buildSystemPrompt(preset, creativeInput, chatHistory)
    const prompt = buildPrompt(subtitles, preset, creativeInput, duration)

    try {
      const response = await modelRouter.complete('heavy', {
        prompt, systemPrompt, temperature: 0.4, maxTokens: 8000,
      })
      const json = extractJSON(response)
      if (json && (json.editDecisions?.length || json.smartSubtitles?.length)) {
        return { smartSubtitles: json.smartSubtitles || [], narration: json.narration || [], editDecisions: json.editDecisions || [], summary: json.summary || this.emptySummary(subtitles) }
      }
    } catch { /* fallback below */ }

    // Fallback: time-based cutting
    if (creativeInput.targetDuration && creativeInput.targetDuration > 0 && duration > creativeInput.targetDuration * 1.2) {
      return this.timeCut(subtitles, creativeInput.targetDuration)
    }
    return null
  }

  private timeCut(subtitles: SubtitleItem[], target: number): UnifiedResult {
    const sorted = [...subtitles].sort((a, b) => a.startTime - b.startTime)
    const decisions: UnifiedEditDecision[] = []
    const smart: SmartSubtitle[] = []
    let kept = 0, dur = 0, removed = 0
    for (const s of sorted) {
      const d = s.endTime - s.startTime
      if (dur + d <= target * 1.05) {
        smart.push({ id: s.id, startTime: s.startTime, endTime: s.endTime, originalText: s.text, enhancedText: s.text, action: 'keep', reason: '时长限制内保留', importance: 0.6, category: 'core_content' })
        decisions.push({ clipId: s.id, startTime: s.startTime, endTime: s.endTime, action: 'keep', reason: '时长限制内保留', confidence: 0.8 })
        dur += d; kept++
      } else {
        decisions.push({ clipId: s.id, startTime: s.startTime, endTime: s.endTime, action: 'remove', reason: `超出目标时长(${target}s)`, confidence: 0.9 })
        removed++
      }
    }
    return { smartSubtitles: smart, narration: [], editDecisions: decisions, summary: { totalSegments: sorted.length, keptSegments: kept, removedSegments: removed, rewrittenSegments: 0, estimatedDuration: Math.round(dur), reasoning: `自动裁剪: 保留前 ${kept} 段，总时长 ${Math.round(dur)}s，目标 ${target}s` } }
  }

  private emptySummary(subs: SubtitleItem[]): UnifiedSummary {
    return { totalSegments: subs.length, keptSegments: 0, removedSegments: 0, rewrittenSegments: 0, estimatedDuration: 0, reasoning: '处理完成' }
  }
}

function extractJSON(response: string): any {
  try { return JSON.parse(response.replace(/```json|```/g, '').trim()) } catch {
    const m = response.match(/\{[\s\S]*\}/)
    if (m) try { return JSON.parse(m[0]) } catch { /* nope */ }
    return null
  }
}

export const unifiedPipelineService = new UnifiedPipelineService()
