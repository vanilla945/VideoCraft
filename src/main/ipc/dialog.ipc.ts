import { ipcMain, dialog, BrowserWindow } from 'electron'
import { IPC_CHANNELS } from '../../shared/types/ipc'

export function registerDialogHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.DIALOG_OPEN_FILE, async (_event, { filters }) => {
    const win = BrowserWindow.getFocusedWindow()
    if (!win) return []
    const result = await dialog.showOpenDialog(win, {
      properties: ['openFile'],
      filters: filters || [{ name: '所有文件', extensions: ['*'] }]
    })
    return result.filePaths
  })

  ipcMain.handle(IPC_CHANNELS.DIALOG_SAVE_FILE, async (_event, { defaultName, filters }) => {
    const win = BrowserWindow.getFocusedWindow()
    if (!win) return null
    const result = await dialog.showSaveDialog(win, {
      defaultPath: defaultName,
      filters: filters || [
        { name: 'VideoCraft 项目', extensions: ['vcraft'] }
      ]
    })
    return result.filePath || null
  })

  ipcMain.handle(IPC_CHANNELS.APP_GET_PATH, async (_event, { name }) => {
    const { app } = require('electron')
    return app.getPath(name)
  })
}
