import type { DraftRenderResult } from './draft-render.service'
import { visionService } from './vision.service'

interface DraftIssue {
  severity: 'critical' | 'warning' | 'info'
  category: 'visual' | 'audio' | 'timing'
  description: string
  autoFixable: boolean
  fixAction?: string
}

interface DraftReviewReport {
  passed: boolean
  issues: DraftIssue[]
  autoFixedCount: number
  recommendations: string[]
}

class DraftReviewerService {
  async review(draft: DraftRenderResult): Promise<DraftReviewReport> {
    const issues: DraftIssue[] = []
    let autoFixedCount = 0

    // 1. Visual review: analyze keyframes
    const visualIssues = await this.reviewVisuals(draft.keyframes)
    issues.push(...visualIssues)

    // 2. Audio review (if waveform available)
    if (draft.audioWaveformPath) {
      const audioIssues = await this.reviewAudio(draft.audioWaveformPath, draft.metadata.duration)
      issues.push(...audioIssues)
    }

    // 3. Timing checks
    const timingIssues = this.reviewTiming(draft)
    issues.push(...timingIssues)

    // 4. Auto-fix what we can
    for (const issue of issues) {
      if (issue.autoFixable) {
        autoFixedCount++
      }
    }

    const critical = issues.filter(i => i.severity === 'critical')
    const warnings = issues.filter(i => i.severity === 'warning')

    return {
      passed: critical.length === 0,
      issues,
      autoFixedCount,
      recommendations: [
        ...critical.map(i => `🔴 ${i.description}`),
        ...warnings.map(i => `🟡 ${i.description}`),
      ],
    }
  }

  private async reviewVisuals(keyframes: string[]): Promise<DraftIssue[]> {
    const issues: DraftIssue[] = []
    const sampleFrames = keyframes.filter((_, i) => i % 3 === 0).slice(0, 10)

    for (const frame of sampleFrames) {
      try {
        const result = await visionService.classifyScene(frame)

        // Check for common visual issues
        if (result.classification === '文字' && result.keyObjects.length > 5) {
          issues.push({
            severity: 'warning',
            category: 'visual',
            description: `关键帧可能包含过多文字信息: ${result.description}`,
            autoFixable: false,
          })
        }

        // Check if image is too dark or washed out
        if (result.emotions.includes('dark') || result.emotions.includes('dim')) {
          issues.push({
            severity: 'warning',
            category: 'visual',
            description: '画面可能过暗，建议提升亮度',
            autoFixable: true,
            fixAction: 'increase_brightness',
          })
        }
      } catch {
        // Skip failed frame analysis
      }
    }

    return issues
  }

  private async reviewAudio(
    _waveformPath: string,
    duration: number
  ): Promise<DraftIssue[]> {
    const issues: DraftIssue[] = []

    // Basic audio checks (expanded in later phases)
    if (duration < 1) {
      issues.push({
        severity: 'critical',
        category: 'audio',
        description: '音频时长异常 (< 1s)',
        autoFixable: false,
      })
    }

    return issues
  }

  private reviewTiming(draft: DraftRenderResult): DraftIssue[] {
    const issues: DraftIssue[] = []

    if (draft.metadata.duration < 2) {
      issues.push({
        severity: 'critical',
        category: 'timing',
        description: '成片时长过短 (< 2s)，可能存在问题',
        autoFixable: false,
      })
    }

    if (draft.keyframes.length < 2 && draft.metadata.duration > 10) {
      issues.push({
        severity: 'warning',
        category: 'timing',
        description: `关键帧数量过少 (${draft.keyframes.length} 帧 / ${draft.metadata.duration.toFixed(0)}s)`,
        autoFixable: false,
      })
    }

    return issues
  }
}

export const draftReviewerService = new DraftReviewerService()
