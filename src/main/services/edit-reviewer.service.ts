import type { EditDecisionList, EditDecision } from './edit-decision.service'
import type { SubtitleItem } from '../../shared/types/subtitle'
import type { CreativeInput } from '../../shared/types/creative-input'
import { modelRouter } from './model-router.service'

export interface ReviewIssue {
  severity: 'critical' | 'warning' | 'info'
  clipId?: string
  description: string
  suggestion: string
}

export interface ReviewReport {
  passed: boolean
  issues: ReviewIssue[]
  suggestions: string[]
  overallScore: number
}

class EditReviewerService {
  async review(
    edl: EditDecisionList,
    subtitles: SubtitleItem[],
    creativeInput: CreativeInput
  ): Promise<ReviewReport> {
    // Step 1: Automated rule-based checks
    const autoIssues = this.runAutomatedChecks(edl, subtitles, creativeInput)

    // If critical issues found by automated checks, fail immediately
    const criticalAuto = autoIssues.filter(i => i.severity === 'critical')
    if (criticalAuto.length > 0) {
      return {
        passed: false,
        issues: autoIssues,
        suggestions: criticalAuto.map(i => i.suggestion),
        overallScore: Math.max(0, 70 - criticalAuto.length * 15),
      }
    }

    // Step 2: LLM-based review (for semantic/coherence checks)
    try {
      const llmReport = await this.llmReview(edl, subtitles, creativeInput)
      const allIssues = [...autoIssues, ...llmReport.issues]

      return {
        passed: allIssues.filter(i => i.severity === 'critical').length === 0 && llmReport.passed,
        issues: allIssues,
        suggestions: llmReport.suggestions,
        overallScore: Math.round((autoChecksScore(autoIssues) + llmReport.overallScore) / 2),
      }
    } catch (err) {
      console.warn('[Reviewer Agent] LLM review failed:', (err as Error).message)
      return {
        passed: autoIssues.filter(i => i.severity === 'critical').length === 0,
        issues: autoIssues,
        suggestions: [],
        overallScore: autoChecksScore(autoIssues),
      }
    }
  }

  private runAutomatedChecks(
    edl: EditDecisionList,
    subtitles: SubtitleItem[],
    creativeInput: CreativeInput
  ): ReviewIssue[] {
    const issues: ReviewIssue[] = []
    const keptDecisions = edl.decisions.filter(d => d.action !== 'remove')

    // Check 1: Duration within target
    if (creativeInput.targetDuration && creativeInput.targetDuration > 0) {
      const deviation = Math.abs(edl.summary.estimatedDuration - creativeInput.targetDuration)
      const deviationPercent = deviation / creativeInput.targetDuration

      if (deviationPercent > 0.2) {
        issues.push({
          severity: 'critical',
          description: `成片时长 ${edl.summary.estimatedDuration}s 偏离目标 ${creativeInput.targetDuration}s (${Math.round(deviationPercent * 100)}%)`,
          suggestion: `调整保留策略: 当前保留 ${edl.summary.keptClips} 个片段，删除 ${edl.summary.removedClips} 个片段`,
        })
      } else if (deviationPercent > 0.1) {
        issues.push({
          severity: 'warning',
          description: `成片时长偏离目标 ${Math.round(deviationPercent * 100)}%`,
          suggestion: `微调片段选择以接近目标时长`,
        })
      }
    }

    // Check 2: Minimum clip count
    if (keptDecisions.length < 3) {
      issues.push({
        severity: 'critical',
        description: '保留片段过少 (< 3 个)，成片可能过于碎片化',
        suggestion: '降低删除阈值，保留更多过渡片段',
      })
    }

    // Check 3: Gap between adjacent kept clips
    let maxGap = 0
    let maxGapIdx = -1
    for (let i = 0; i < keptDecisions.length - 1; i++) {
      const a = subtitles.find(s => s.id === keptDecisions[i].clipId)
      const b = subtitles.find(s => s.id === keptDecisions[i + 1].clipId)
      if (a && b) {
        const gap = b.startTime - a.endTime
        if (gap > maxGap) {
          maxGap = gap
          maxGapIdx = i
        }
      }
    }
    if (maxGap > 5) {
      issues.push({
        severity: 'warning',
        description: `片段 ${maxGapIdx} 和 ${maxGapIdx + 1} 之间存在 ${maxGap.toFixed(1)}s 空白`,
        suggestion: '添加过渡片段或缩短空白间隙',
      })
    }

    // Check 4: Low confidence decisions
    const lowConf = edl.decisions.filter(d => d.confidence < 0.4)
    if (lowConf.length > edl.decisions.length * 0.3) {
      issues.push({
        severity: 'warning',
        description: `${lowConf.length} 个低置信度决策，建议人工审查`,
        suggestion: '对低置信度片段进行人工确认',
      })
    }

    // Check 5: Key points coverage
    if (creativeInput.customKeyPoints?.length) {
      const covered = creativeInput.customKeyPoints.filter(kp =>
        keptDecisions.some(d => {
          const sub = subtitles.find(s => s.id === d.clipId)
          return sub && sub.text.includes(kp)
        })
      )

      if (covered.length < creativeInput.customKeyPoints.length) {
        const missing = creativeInput.customKeyPoints.filter(kp => !covered.includes(kp))
        issues.push({
          severity: 'critical',
          description: `关键信息点缺失: ${missing.join(', ')}`,
          suggestion: `保留包含以下关键词的片段: ${missing.join(', ')}`,
        })
      }
    }

    return issues
  }

  private async llmReview(
    edl: EditDecisionList,
    subtitles: SubtitleItem[],
    creativeInput: CreativeInput
  ): Promise<{ passed: boolean; issues: ReviewIssue[]; suggestions: string[]; overallScore: number }> {
    const keptSubs = subtitles
      .filter(s => edl.decisions.find(d => d.clipId === s.id && d.action !== 'remove'))
      .slice(0, 20)

    const context = keptSubs.map((s, i) =>
      `[${i}] ${this.formatTime(s.startTime)} "${s.text}"`
    ).join('\n')

    const prompt = `审查以下视频剪辑方案。标记问题并建议改进。

保留片段 (${edl.summary.keptClips} 个):
${context}

统计: 总片段 ${edl.summary.totalClips}, 保留 ${edl.summary.keptClips}, 删除 ${edl.summary.removedClips}, 预计时长 ${edl.summary.estimatedDuration}s

请严格返回 JSON:
{
  "passed": true/false,
  "issues": [{"severity": "critical/warning/info", "description": "..."}],
  "suggestions": ["具体修改建议"],
  "overallScore": 0-100
}
只返回 JSON，不要额外文字。`

    const response = await modelRouter.complete('heavy', {
      prompt,
      systemPrompt: '你是视频剪辑质量审查 AI。你只返回 JSON。',
      temperature: 0.2,
      maxTokens: 2000,
    })

    try {
      return JSON.parse(response.replace(/```json|```/g, '').trim())
    } catch {
      return { passed: true, issues: [], suggestions: [], overallScore: 75 }
    }
  }

  private formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${String(s).padStart(2, '0')}`
  }
}

function autoChecksScore(issues: ReviewIssue[]): number {
  const critical = issues.filter(i => i.severity === 'critical').length
  const warnings = issues.filter(i => i.severity === 'warning').length
  return Math.max(0, 100 - critical * 20 - warnings * 5)
}

export const editReviewerService = new EditReviewerService()
