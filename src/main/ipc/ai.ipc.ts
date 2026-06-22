import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/types/ipc'
import type { SubtitleItem } from '../../shared/types/subtitle'
import type { CreativeInput } from '../../shared/types/creative-input'
import { editOrchestratorService } from '../services/edit-orchestrator.service'
import { conversationService } from '../services/conversation.service'
import { editParserService } from '../services/edit-parser.service'
import { BUILTIN_PRESETS } from '../../shared/types'

export function registerAIHandlers(): void {
  // ====== Editing Engine ======
  ipcMain.handle(IPC_CHANNELS.AI_EDIT_RUN, async (_event, subtitles: SubtitleItem[], creativeInput: CreativeInput) => {
    try {
      const preset = BUILTIN_PRESETS.find(p => p.id === creativeInput.presetId) || BUILTIN_PRESETS[0]

      const result = await editOrchestratorService.run(subtitles, creativeInput, preset)

      return {
        success: true,
        edl: result.edl,
        reviewReport: result.reviewReport,
        rounds: result.rounds,
        timing: result.timing,
      }
    } catch (err) {
      console.error('[AI IPC] 剪辑引擎失败:', (err as Error).message)
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle(IPC_CHANNELS.AI_EDIT_PREVIEW, async (_event, edl: unknown, subtitles: SubtitleItem[], creativeInput: CreativeInput) => {
    try {
      const preset = BUILTIN_PRESETS.find(p => p.id === creativeInput.presetId) || BUILTIN_PRESETS[0]
      const result = await editOrchestratorService.run(subtitles, creativeInput, preset)
      return { success: true, edl: result.edl, reviewReport: result.reviewReport, rounds: result.rounds }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  // ====== Conversational Chat ======
  const chatSessions = new Map<string, boolean>()

  ipcMain.handle(IPC_CHANNELS.AI_CHAT_SEND, async (_event, projectId: string, message: string, subtitles: SubtitleItem[], creativeInput: CreativeInput) => {
    try {
      // Init session if new
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
