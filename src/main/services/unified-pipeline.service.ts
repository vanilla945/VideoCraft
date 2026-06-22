import type { SubtitleItem } from '../../shared/types/subtitle'
import type { CreativeInput } from '../../shared/types/creative-input'
import type { StylePreset } from '../../shared/types/style-preset'
import { modelRouter } from './model-router.service'
import { BUILTIN_PRESETS } from '../../shared/types/style-preset'

// ============================================================
// Unified output: all AI decisions in one pass
// ============================================================
export interface UnifiedResult {
  smartSubtitles: SmartSubtitle[]
  narration: NarrationSegment[]
  editDecisions: UnifiedEditDecision[]
  summary: UnifiedSummary
}

export interface SmartSubtitle {
  id: string
  startTime: number
  endTime: number
  originalText: string
  enhancedText: string          // LLM 润色后的版本
  action: 'keep' | 'remove' | 'rewrite'
  reason: string
  importance: number            // 0-1, how critical this segment is
  category: 'opening' | 'core_content' | 'transition' | 'highlight' | 'filler' | 'closing'
  suggestedCaption?: string     // 建议的屏幕字幕文字
}

export interface NarrationSegment {
  text: string
  startTime: number
  endTime: number
  voiceStyle?: string
  needsImage: boolean
  imagePrompt?: string
}

export interface UnifiedEditDecision {
  clipId: string
  startTime: number
  endTime: number
  action: 'keep' | 'remove' | 'trim' | 'speed'
  reason: string
  speedRatio?: number
  confidence: number
}

export interface UnifiedSummary {
  totalSegments: number
  keptSegments: number
  removedSegments: number
  rewrittenSegments: number
  estimatedDuration: number
  title?: string
  coverImagePrompt?: string
  reasoning: string
}

// ============================================================
// Prompt builder: inject creative input + style preset
// ============================================================
function buildSystemPrompt(preset: StylePreset, input: CreativeInput): string {
  return `你是专业视频后期制作 AI。你的任务是一次完成三个工作：① 筛选和增强字幕 ② 撰写解说词 ③ 制定剪辑方案。

你必须严格遵循以下创作约束：

【风格】${preset.name}
- 整体风格: ${preset.tone.style}
- 用词规范: ${preset.tone.vocabulary}
- 情感曲线: ${preset.tone.emotion}
- 剪辑节奏: ${preset.pacing.cutRhythm}
- 目标受众: ${preset.audience.level}
- 内容深度: ${preset.audience.depth}

【用户意图】
- 剪辑模式: ${input.editingMode}
${input.targetDuration && input.targetDuration > 0 ? `- 目标时长: ${input.targetDuration}秒（必须严格遵守 ±10%）` : '- 目标时长: 自动最优'}
${input.customTopic ? `- 主题重点: ${input.customTopic}` : ''}
${input.customKeyPoints?.length ? `- 必须强调:\n${input.customKeyPoints.map(p => `  - ${p}`).join('\n')}` : ''}
${input.customConstraints?.length ? `- 硬性约束:\n${input.customConstraints.map(c => `  - ${c}`).join('\n')}` : ''}

【字幕处理原则】
- 保留所有有信息量的对话
- 删除纯填充词（嗯/啊/那个/um/uh）
- 删除与主题无关的离题内容
- 对关键段落进行润色（纠正口语表达，不改变原意）
- 标记每个片段的类型（开场/核心/过渡/高光/填充/结尾）

【解说词原则】
- 解说词是对画面的补充，不是复述字幕
- 需要配图时标记 needsImage=true 并给出 imagePrompt
- 解说词要有画面感，帮助观众理解画面

【剪辑原则】
- 严格按目标时长控制（如果指定了）
- 优先保留高信息密度和高情绪价值片段
- 果断舍弃冗余和离题内容
- 保持叙事连贯性和情感曲线自然`
}

function buildPrompt(
  subtitles: SubtitleItem[],
  preset: StylePreset,
  input: CreativeInput,
  videoDuration: number
): string {
  const segmentList = subtitles.map((s, i) =>
    `[${i}] ${formatTime(s.startTime)}-${formatTime(s.endTime)} | ${s.isFillerWord ? '[填充词] ' : ''}${s.text}`
  ).join('\n')

  return `以下是一段视频的原始字幕。请完整处理：

视频总时长: ${formatTime(videoDuration)}
总字幕段数: ${subtitles.length}
${input.targetDuration && input.targetDuration > 0 ? `目标成片时长: ${formatTime(input.targetDuration)}` : '目标: 自动最优'}

原始字幕:
${segmentList.slice(0, 8000)}

请返回完整的 JSON（只返回 JSON，无额外文字）：

{
  "smartSubtitles": [
    {
      "id": "原始id", "startTime": 0.0, "endTime": 2.0,
      "originalText": "原文",
      "enhancedText": "润色后文字（口语转书面但保留原意）",
      "action": "keep|remove|rewrite",
      "reason": "处理原因",
      "importance": 0.8,
      "category": "opening|core_content|transition|highlight|filler|closing"
    }
  ],
  "narration": [
    {
      "text": "解说词段落",
      "startTime": 0, "endTime": 5,
      "voiceStyle": "沉稳|亲切|激昂",
      "needsImage": false,
      "imagePrompt": null
    }
  ],
  "editDecisions": [
    {
      "clipId": "原始id",
      "startTime": 0.0, "endTime": 2.0,
      "action": "keep|remove|trim|speed",
      "reason": "...",
      "confidence": 0.9,
      "speedRatio": 1.0
    }
  ],
  "summary": {
    "totalSegments": ${subtitles.length},
    "keptSegments": 0,
    "removedSegments": 0,
    "rewrittenSegments": 0,
    "estimatedDuration": 0,
    "title": "视频标题",
    "coverImagePrompt": "封面图生成的英文 prompt",
    "reasoning": "整体处理策略说明"
  }
}`
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

// ============================================================
// Unified Pipeline Service
// ============================================================
class UnifiedPipelineService {
  async process(
    subtitles: SubtitleItem[],
    creativeInput: CreativeInput,
    videoDuration?: number
  ): Promise<UnifiedResult | null> {
    const preset = BUILTIN_PRESETS.find(p => p.id === creativeInput.presetId) || BUILTIN_PRESETS[0]
    const systemPrompt = buildSystemPrompt(preset, creativeInput)
    const prompt = buildPrompt(subtitles, preset, creativeInput, videoDuration || 60)

    try {
      const response = await modelRouter.complete('heavy', {
        prompt,
        systemPrompt,
        temperature: 0.4,
        maxTokens: 8000,
      })

      const json = extractJSON(response)
      if (!json) return null

      return {
        smartSubtitles: json.smartSubtitles || [],
        narration: json.narration || [],
        editDecisions: json.editDecisions || [],
        summary: json.summary || {
          totalSegments: subtitles.length,
          keptSegments: 0, removedSegments: 0, rewrittenSegments: 0,
          estimatedDuration: 0, reasoning: '处理完成',
        },
      }
    } catch (err) {
      console.error('[UnifiedPipeline] LLM 处理失败:', (err as Error).message)
      return null
    }
  }
}

function extractJSON(response: string): any {
  try {
    return JSON.parse(response.replace(/```json|```/g, '').trim())
  } catch {
    const match = response.match(/\{[\s\S]*\}/)
    if (match) {
      try { return JSON.parse(match[0]) } catch { /* fall through */ }
    }
    return null
  }
}

export const unifiedPipelineService = new UnifiedPipelineService()
