import type { SubtitleItem } from '../../shared/types/subtitle'
import type { CreativeInput } from '../../shared/types/creative-input'
import type { StylePreset } from '../../shared/types/style-preset'
import type { EditDecisionList } from './edit-decision.service'
import type { ReviewReport } from './edit-reviewer.service'
import type { HighlightConfig } from './highlight-detector.service'
import type { SilenceRemovalConfig } from './silence-remover.service'
import { editDecisionService } from './edit-decision.service'
import { editReviewerService } from './edit-reviewer.service'
import { highlightDetectorService } from './highlight-detector.service'
import { silenceRemoverService } from './silence-remover.service'

export interface OrchestrationResult {
  edl: EditDecisionList
  reviewReport: ReviewReport
  rounds: number
  history: Array<{ round: number; edl: EditDecisionList; review: ReviewReport }>
  timing: {
    totalMs: number
    editorMs: number
    reviewerMs: number
  }
}

const MAX_ROUNDS = 2

class EditOrchestratorService {
  async run(
    subtitles: SubtitleItem[],
    creativeInput: CreativeInput,
    preset: StylePreset
  ): Promise<OrchestrationResult> {
    const startTime = Date.now()
    const history: Array<{ round: number; edl: EditDecisionList; review: ReviewReport }> = []

    // Build configs from preset
    const silenceConfig: SilenceRemovalConfig = {
      silenceThreshold: preset.editing.silenceThreshold,
      minClipDuration: preset.editing.minClipDuration,
      fillerWordStrategy: preset.editing.fillerWordStrategy,
    }

    const highlightConfig: HighlightConfig = {
      biasTags: preset.editing.highlightBias,
      targetDuration: creativeInput.targetDuration,
    }

    // Round 1: Generate initial EDL
    const editorStart = Date.now()
    let edl = await this.generateEDL(subtitles, creativeInput, silenceConfig, highlightConfig)
    const editorTime = Date.now() - editorStart

    const reviewerStart = Date.now()
    let review = await this.review(edl, subtitles, creativeInput)
    const reviewerTime = Date.now() - reviewerStart
    history.push({ round: 1, edl, review })

    // If passed, return immediately
    if (review.passed) {
      return {
        edl,
        reviewReport: review,
        rounds: 1,
        history,
        timing: { totalMs: Date.now() - startTime, editorMs: editorTime, reviewerMs: reviewerTime },
      }
    }

    // Round 2: Revise based on reviewer feedback
    const suggestionsStr = review.suggestions.join('; ')
    console.log(`[Orchestrator] Round 1 failed (score: ${review.overallScore}). Revising...`)
    console.log(`[Orchestrator] Reviewer suggestions: ${suggestionsStr}`)

    const editorStart2 = Date.now()
    edl = await this.generateEDLWithFeedback(subtitles, creativeInput, silenceConfig, highlightConfig, review)
    const editorTime2 = Date.now() - editorStart2

    const reviewerStart2 = Date.now()
    review = await this.review(edl, subtitles, creativeInput)
    const reviewerTime2 = Date.now() - reviewerStart2
    history.push({ round: 2, edl, review })

    return {
      edl,
      reviewReport: review,
      rounds: 2,
      history,
      timing: {
        totalMs: Date.now() - startTime,
        editorMs: editorTime + editorTime2,
        reviewerMs: reviewerTime + reviewerTime2,
      },
    }
  }

  private async generateEDL(
    subtitles: SubtitleItem[],
    creativeInput: CreativeInput,
    silenceConfig: SilenceRemovalConfig,
    highlightConfig: HighlightConfig
  ): Promise<EditDecisionList> {
    // Score subtitles
    const scores = highlightDetectorService.scoreSubtitles(
      subtitles,
      highlightConfig,
      creativeInput.customKeyPoints
    )

    // Generate EDL
    return editDecisionService.generateEDL(
      subtitles,
      scores,
      creativeInput,
      silenceConfig
    )
  }

  private async generateEDLWithFeedback(
    subtitles: SubtitleItem[],
    creativeInput: CreativeInput,
    silenceConfig: SilenceRemovalConfig,
    highlightConfig: HighlightConfig,
    previousReview: ReviewReport
  ): Promise<EditDecisionList> {
    // Adjust silence config based on feedback
    const adjustedSilence = { ...silenceConfig }

    for (const issue of previousReview.issues) {
      if (issue.description.includes('时长偏离')) {
        // Adjust filler word strategy
        adjustedSilence.fillerWordStrategy = 'aggressive'
        adjustedSilence.silenceThreshold = Math.max(0.5, adjustedSilence.silenceThreshold * 0.7)
      }
      if (issue.description.includes('保留片段过少')) {
        adjustedSilence.fillerWordStrategy = 'lenient'
        adjustedSilence.silenceThreshold = adjustedSilence.silenceThreshold * 1.3
        adjustedSilence.minClipDuration = Math.max(1, adjustedSilence.minClipDuration * 0.7)
      }
    }

    // Regenerate with adjusted configs
    const adjustedHighlight: HighlightConfig = {
      ...highlightConfig,
      biasTags: [
        ...highlightConfig.biasTags,
        ...previousReview.issues
          .filter(i => i.description.includes('关键信息点缺失'))
          .map(i => i.suggestion.replace(/保留包含以下关键词的片段: /, '').split(', '))
          .flat(),
      ],
    }

    const scores = highlightDetectorService.scoreSubtitles(
      subtitles,
      adjustedHighlight,
      creativeInput.customKeyPoints
    )

    return editDecisionService.generateEDL(
      subtitles,
      scores,
      creativeInput,
      adjustedSilence
    )
  }

  private async review(
    edl: EditDecisionList,
    subtitles: SubtitleItem[],
    creativeInput: CreativeInput
  ): Promise<ReviewReport> {
    return editReviewerService.review(edl, subtitles, creativeInput)
  }
}

export const editOrchestratorService = new EditOrchestratorService()
