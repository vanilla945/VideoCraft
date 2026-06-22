import type { SubtitleItem } from '../../shared/types/subtitle'
import type { CreativeInput } from '../../shared/types/creative-input'
import type { SilenceRemovalConfig } from './silence-remover.service'
import type { HighlightScore } from './highlight-detector.service'
import { silenceRemoverService } from './silence-remover.service'
import { highlightDetectorService } from './highlight-detector.service'
import { modelRouter } from './model-router.service'

export interface EditDecision {
  clipId: string
  action: 'keep' | 'remove' | 'trim' | 'speed' | 'reorder' | 'add_transition'
  reason: string
  trimRange?: { start: number; end: number }
  speedRatio?: number
  newPosition?: number
  transitionType?: 'hard' | 'fade' | 'zoom' | 'slide'
  confidence: number
}

export interface EditDecisionList {
  decisions: EditDecision[]
  summary: {
    totalClips: number
    keptClips: number
    removedClips: number
    modifiedClips: number
    estimatedDuration: number
    reasoning: string
  }
  generatedAt: string
}

class EditDecisionService {
  async generateEDL(
    subtitles: SubtitleItem[],
    highlightScores: HighlightScore[],
    creativeInput: CreativeInput,
    silenceConfig: SilenceRemovalConfig
  ): Promise<EditDecisionList> {
    // Step 1: Local rule-based decisions (fast, deterministic, no LLM cost)
    const ruleDecisions = this.generateRuleBasedDecisions(
      subtitles, highlightScores, silenceConfig
    )

    // Step 2: LLM-based refinement (for complex decisions: reorder, transitions, speed)
    try {
      const llmDecisions = await this.llmRefinement(
        subtitles, highlightScores, ruleDecisions, creativeInput
      )
      // Merge: LLM decisions override rule-based where confidence > 0.7
      return this.mergeDecisions(ruleDecisions, llmDecisions, subtitles)
    } catch (err) {
      console.warn('[Editor Agent] LLM refinement failed, using rule-based only:', (err as Error).message)
      return this.buildDecisionList(ruleDecisions, subtitles)
    }
  }

  private generateRuleBasedDecisions(
    subtitles: SubtitleItem[],
    scores: HighlightScore[],
    silenceConfig: SilenceRemovalConfig
  ): EditDecision[] {
    const decisions: EditDecision[] = []
    const scoreMap = new Map(scores.map(s => [s.subtitleId, s]))

    // Detect silence/filler regions first
    const silenceRegions = silenceRemoverService.detectSilenceFromSubtitles(subtitles, silenceConfig)

    for (const sub of subtitles) {
      const score = scoreMap.get(sub.id)

      // Filler words and silence → remove
      if (sub.isFillerWord) {
        decisions.push({
          clipId: sub.id,
          action: 'remove',
          reason: '填充词',
          confidence: 0.95,
        })
        continue
      }

      // Low score → remove
      if (score && score.label === '可删' && score.confidence > 0.6) {
        decisions.push({
          clipId: sub.id,
          action: 'remove',
          reason: `低信息密度 (${score.score}分)`,
          confidence: score.confidence,
        })
        continue
      }

      // High score → keep with potential speed-up
      if (score && score.label === '高光') {
        decisions.push({
          clipId: sub.id,
          action: 'keep',
          reason: `高光片段 (${score.score}分)`,
          confidence: score.confidence,
        })
        continue
      }

      // Very long segments → consider trimming or speed-up
      const duration = sub.endTime - sub.startTime
      if (duration > 15 && score && score.label === '过渡') {
        decisions.push({
          clipId: sub.id,
          action: 'speed',
          reason: '长过渡片段加速',
          speedRatio: 1.3,
          confidence: 0.6,
        })
        continue
      }

      // Default: keep
      decisions.push({
        clipId: sub.id,
        action: 'keep',
        reason: '正常保留',
        confidence: 0.8,
      })
    }

    return decisions
  }

  private async llmRefinement(
    subtitles: SubtitleItem[],
    scores: HighlightScore[],
    ruleDecisions: EditDecision[],
    creativeInput: CreativeInput
  ): Promise<EditDecision[]> {
    // Build a compact summary for the LLM
    const summary = subtitles.slice(0, 50).map((s, i) => {
      const sc = scores.find(x => x.subtitleId === s.id)
      return `[${i}] ${this.formatTime(s.startTime)} "${s.text}" (${sc?.label || '?'} ${sc?.score || 0}分 ${s.isFillerWord ? 'FILLER' : ''})`
    }).join('\n')

    const prompt = `以下是一个视频片段列表及其质量评分。请生成剪辑决策:

${summary}

用户要求:
- 风格: ${creativeInput.presetId}
- 目标时长: ${creativeInput.targetDuration || '自动'}秒
- 额外要求: ${creativeInput.customTopic || '无'}

请返回 JSON 格式的剪辑决策数组。对每个片段的 action 为 keep/remove/trim/speed/reorder。
对于 reorder 的片段，给出 newPosition。对于 trim 的片段，给出 trimRange。
只返回 JSON，不要额外文字。
格式: [{"clipIndex": 0, "action": "keep", "reason": "...", "confidence": 0.8}]`

    const response = await modelRouter.complete('heavy', {
      prompt,
      systemPrompt: '你是专业视频剪辑 AI。你只返回 JSON 数组，没有任何额外文字。',
      temperature: 0.3,
      maxTokens: 4000,
    })

    try {
      const json = JSON.parse(response.replace(/```json|```/g, '').trim())
      if (!Array.isArray(json)) return []

      return json.map((d: { clipIndex: number; action: string; reason: string; confidence: number; newPosition?: number; trimRange?: { start: number; end: number } }) => ({
        clipId: subtitles[d.clipIndex]?.id || `clip_${d.clipIndex}`,
        action: d.action as EditDecision['action'],
        reason: d.reason || 'LLM 建议',
        confidence: d.confidence || 0.7,
        newPosition: d.newPosition,
        trimRange: d.trimRange,
      }))
    } catch {
      return []
    }
  }

  private mergeDecisions(
    rule: EditDecision[],
    llm: EditDecision[],
    subtitles: SubtitleItem[]
  ): EditDecisionList {
    const merged = new Map<string, EditDecision>()

    // Start with rule decisions
    for (const d of rule) {
      merged.set(d.clipId, d)
    }

    // Override with higher-confidence LLM decisions
    for (const d of llm) {
      const existing = merged.get(d.clipId)
      if (!existing || d.confidence > existing.confidence + 0.1) {
        merged.set(d.clipId, d)
      }
    }

    return this.buildDecisionList(Array.from(merged.values()), subtitles)
  }

  private buildDecisionList(decisions: EditDecision[], subtitles: SubtitleItem[]): EditDecisionList {
    const keptClips = decisions.filter(d => d.action !== 'remove')
    const removedClips = decisions.filter(d => d.action === 'remove')
    const modifiedClips = decisions.filter(d => ['trim', 'speed', 'reorder'].includes(d.action))

    const keptDurations = keptClips.map(d => {
      const sub = subtitles.find(s => s.id === d.clipId)
      return sub ? sub.endTime - sub.startTime : 0
    })

    return {
      decisions,
      summary: {
        totalClips: decisions.length,
        keptClips: keptClips.length,
        removedClips: removedClips.length,
        modifiedClips: modifiedClips.length,
        estimatedDuration: Math.round(keptDurations.reduce((a, b) => a + b, 0)),
        reasoning: `保留 ${keptClips.length} 个片段，删除 ${removedClips.length} 个片段，修改 ${modifiedClips.length} 个片段。预计成片时长约 ${Math.round(keptDurations.reduce((a, b) => a + b, 0))} 秒。`,
      },
      generatedAt: new Date().toISOString(),
    }
  }

  private formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${String(s).padStart(2, '0')}`
  }
}

export const editDecisionService = new EditDecisionService()
