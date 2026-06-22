import { ipcMain, BrowserWindow } from 'electron'
import { IPC_CHANNELS } from '../../shared/types/ipc'
import { ffmpegService } from '../services/ffmpeg.service'
import type { Project, ExportConfig, ExportProgress } from '../../shared/types'

const activeExports = new Map<string, { cancelled: boolean }>()

export function registerExportHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.EXPORT_START, async (event, { project, config }: { project: Project; config: ExportConfig }) => {
    const exportId = `${Date.now()}`
    const signal = { cancelled: false }
    activeExports.set(exportId, signal)

    const win = BrowserWindow.fromWebContents(event.sender)
    const sendProgress = (progress: ExportProgress): void => {
      if (win && !win.isDestroyed()) {
        win.webContents.send(IPC_CHANNELS.EXPORT_PROGRESS, progress)
      }
    }

    try {
      await ffmpegService.exportVideo(project, config, sendProgress, signal)
    } catch (err) {
      sendProgress({ status: 'failed', percent: 0, fps: 0, timeElapsed: '', eta: '', error: String(err) })
    } finally {
      activeExports.delete(exportId)
    }
  })

  ipcMain.handle(IPC_CHANNELS.EXPORT_CANCEL, async () => {
    for (const [, signal] of activeExports) {
      signal.cancelled = true
    }
    activeExports.clear()
  })
}
