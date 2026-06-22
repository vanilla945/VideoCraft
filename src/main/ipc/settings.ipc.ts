import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/types/ipc'
import { configService } from '../services/config.service'

export function registerSettingsIpcHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET_CONFIG, async () => {
    return configService.getAllConfig()
  })

  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET_KEY_STATUS, async () => {
    return configService.getApiKeyStatus()
  })

  ipcMain.handle(IPC_CHANNELS.SETTINGS_UPDATE_MODEL, async (_event, category: string, provider: string, model: string) => {
    // Update process.env for current session
    switch (category) {
      case 'fast':
        process.env.FAST_MODEL_PROVIDER = provider
        process.env.FAST_MODEL_NAME = model
        break
      case 'heavy':
        process.env.HEAVY_MODEL_PROVIDER = provider
        process.env.HEAVY_MODEL_NAME = model
        break
      case 'tts':
        process.env.TTS_PROVIDER = provider
        process.env.TTS_MODEL_NAME = model
        break
      case 'image':
        process.env.IMAGE_PROVIDER = provider
        process.env.IMAGE_MODEL_NAME = model
        break
    }

    // Reload config service to pick up changes
    configService.reload()

    // Return updated config
    return configService.getAllConfig()
  })
}
