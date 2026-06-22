import { ipcMain, dialog, BrowserWindow } from 'electron'
import { IPC_CHANNELS } from '../../shared/types/ipc'
import { ffmpegService } from '../services/ffmpeg.service'

export function registerMediaHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.MEDIA_IMPORT, async () => {
    const win = BrowserWindow.getFocusedWindow()
    if (!win) return []
    const result = await dialog.showOpenDialog(win, {
      properties: ['openFile', 'multiSelections'],
      filters: [
        {
          name: '媒体文件',
          extensions: ['mp4', 'mov', 'avi', 'mkv', 'webm', 'mp3', 'wav', 'png', 'jpg', 'jpeg']
        },
        { name: '所有文件', extensions: ['*'] }
      ]
    })
    return result.filePaths
  })

  ipcMain.handle(IPC_CHANNELS.MEDIA_PROBE, async (_event, { filePath }) => {
    return ffmpegService.probe(filePath)
  })

  ipcMain.handle(IPC_CHANNELS.MEDIA_EXTRACT_THUMBNAIL, async (_event, { filePath, timeSeconds }) => {
    return ffmpegService.extractThumbnail(filePath, timeSeconds)
  })

  ipcMain.handle(IPC_CHANNELS.MEDIA_EXTRACT_KEYFRAMES, async (_event, { filePath, intervalSeconds }) => {
    return ffmpegService.extractKeyframes(filePath, intervalSeconds)
  })
}
