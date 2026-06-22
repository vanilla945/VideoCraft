import { registerProjectHandlers } from './project.ipc'
import { registerMediaHandlers } from './media.ipc'
import { registerExportHandlers } from './export.ipc'
import { registerDialogHandlers } from './dialog.ipc'
import { registerSettingsIpcHandlers } from './settings.ipc'
import { registerTranscriptionHandlers } from './transcription.ipc'
import { registerAIHandlers } from './ai.ipc'

export function registerAllIpcHandlers(): void {
  registerProjectHandlers()
  registerMediaHandlers()
  registerExportHandlers()
  registerDialogHandlers()
  registerSettingsIpcHandlers()
  registerTranscriptionHandlers()
  registerAIHandlers()
}
