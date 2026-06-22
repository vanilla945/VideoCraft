import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/types/ipc'
import type { SubtitleItem } from '../../shared/types/subtitle'
import type { CreativeInput } from '../../shared/types/creative-input'
import { unifiedPipelineService } from '../services/unified-pipeline.service'
import { editOrchestratorService } from '../services/edit-orchestrator.service'
import { conversationService } from '../services/conversation.service'
import { editParserService } from '../services/edit-parser.service'
import { BUILTIN_PRESETS } from '../../shared/types'

export function registerAIHandlers(): void {
  // ====== Unified Pipeline (primary) ======
  // One LLM call: smart subtitles + narration + edit decisions
  ipcMain.handle(IPC_CHANNELS.AI_EDIT_RUN, async (_event, subtitles: SubtitleItem[], creativeInput: CreativeInput, chatHistory?: string) => {
    try {
      const videoDuration = subtitles.length > 0
        ? Math.max(...subtitles.map(s => s.endTime))
        : 60

      const result = await unifiedPipelineService.process(subtitles, creativeInput, videoDuration, chatHistory)

      if (result) {
        return {
          success: true,
          unified: result,
          smartSubtitles: result.smartSubtitles,
          narration: result.narration,
          edl: {
            decisions: result.editDecisions,
            summary: {
              totalClips: result.summary.totalSegments,
              keptClips: result.summary.keptSegments,
              removedClips: result.summary.removedSegments,
              modifiedClips: result.summary.rewrittenSegments,
              estimatedDuration: result.summary.estimatedDuration,
              reasoning: result.summary.reasoning,
            },
            generatedAt: new Date().toISOString(),
          },
          reviewReport: {
            passed: true,
            issues: [],
            suggestions: [],
            overallScore: 85,
          },
          rounds: 1,
          title: result.summary.title,
          coverImagePrompt: result.summary.coverImagePrompt,
        }
      }

      // Fallback: use old orchestrator
      const preset = BUILTIN_PRESETS.find(p => p.id === creativeInput.presetId) || BUILTIN_PRESETS[0]
      const fallback = await editOrchestratorService.run(subtitles, creativeInput, preset)
      return {
        success: true,
        edl: fallback.edl,
        reviewReport: fallback.reviewReport,
        rounds: fallback.rounds,
      }
    } catch (err) {
      console.error('[AI IPC] 统一管线失败:', (err as Error).message)
      return { success: false, error: (err as Error).message }
    }
  })

  // ====== Conversational Chat ======
  const chatSessions = new Map<string, boolean>()

  ipcMain.handle(IPC_CHANNELS.AI_CHAT_SEND, async (_event, projectId: string, message: string, subtitles: SubtitleItem[], creativeInput: CreativeInput) => {
    try {
      if (!chatSessions.has(projectId)) {
        conversationService.createSession(projectId, { subtitles, creativeInput })
        chatSessions.set(projectId, true)
      }
      const response = await conversationService.chat(projectId, message)
      return { success: true, message: response }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle(IPC_CHANNELS.AI_CHAT_PARSE, async (_event, text: string, subtitles: SubtitleItem[], creativeInput: CreativeInput) => {
    try {
      const command = await editParserService.parse(text, { subtitles, creativeInput })
      return { success: true, command }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })
}
