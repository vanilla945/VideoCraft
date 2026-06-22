import { ipcMain, dialog, BrowserWindow, app } from 'electron'
import fs from 'fs'
import path from 'path'
import { IPC_CHANNELS } from '../../shared/types/ipc'

// Directories under userData that can be safely cleared
const CACHE_DIRS = ['thumbnails', 'temp', 'transcription', 'tts', 'drafts', 'graded', 'scene_detect', 'generated_images', 'bgm_library', 'nle_export']

function getDirSize(dir: string): number {
  let size = 0
  try {
    if (!fs.existsSync(dir)) return 0
    const files = fs.readdirSync(dir)
    for (const file of files) {
      const filePath = path.join(dir, file)
      try {
        const stat = fs.statSync(filePath)
        if (stat.isDirectory()) {
          size += getDirSize(filePath)
        } else {
          size += stat.size
        }
      } catch { /* skip */ }
    }
  } catch { /* skip */ }
  return size
}

function removeDir(dir: string): void {
  try {
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true })
      fs.mkdirSync(dir, { recursive: true })
    }
  } catch { /* skip */ }
}

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
    return app.getPath(name)
  })

  ipcMain.handle(IPC_CHANNELS.APP_GET_CACHE_SIZE, async () => {
    const userData = app.getPath('userData')
    let totalSize = 0
    for (const dir of CACHE_DIRS) {
      totalSize += getDirSize(path.join(userData, dir))
    }
    return { size: totalSize, formatted: formatBytes(totalSize) }
  })

  ipcMain.handle(IPC_CHANNELS.APP_CLEAR_CACHE, async () => {
    const userData = app.getPath('userData')
    let totalCleared = 0
    for (const dir of CACHE_DIRS) {
      const dirPath = path.join(userData, dir)
      totalCleared += getDirSize(dirPath)
      removeDir(dirPath)
    }
    return { cleared: totalCleared, formatted: formatBytes(totalCleared) }
  })
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}
