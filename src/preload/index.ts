import { contextBridge, ipcRenderer } from 'electron'

const api = {
  project: {
    create: (config: unknown): Promise<unknown> =>
      ipcRenderer.invoke('project:create', config),
    save: (project: unknown, filePath?: string): Promise<string> =>
      ipcRenderer.invoke('project:save', { project, filePath }),
    load: (filePath: string): Promise<unknown> =>
      ipcRenderer.invoke('project:load', { filePath }),
    getRecent: (): Promise<string[]> =>
      ipcRenderer.invoke('project:get-recent')
  },
  media: {
    import: (): Promise<string[]> =>
      ipcRenderer.invoke('media:import'),
    probe: (filePath: string): Promise<unknown> =>
      ipcRenderer.invoke('media:probe', { filePath }),
    extractThumbnail: (filePath: string, timeSeconds: number): Promise<string> =>
      ipcRenderer.invoke('media:extract-thumbnail', { filePath, timeSeconds }),
    extractKeyframes: (filePath: string, intervalSeconds: number): Promise<string[]> =>
      ipcRenderer.invoke('media:extract-keyframes', { filePath, intervalSeconds })
  },
  export: {
    start: (project: unknown, config: unknown): Promise<void> =>
      ipcRenderer.invoke('export:start', { project, config }),
    cancel: (): Promise<void> =>
      ipcRenderer.invoke('export:cancel'),
    onProgress: (callback: (progress: unknown) => void): (() => void) => {
      const handler = (_event: Electron.IpcRendererEvent, progress: unknown): void => callback(progress)
      ipcRenderer.on('export:progress', handler)
      return () => ipcRenderer.removeListener('export:progress', handler)
    }
  },
  dialog: {
    openFile: (filters?: unknown[]): Promise<string[]> =>
      ipcRenderer.invoke('dialog:open-file', { filters }),
    saveFile: (defaultName?: string, filters?: unknown[]): Promise<string | null> =>
      ipcRenderer.invoke('dialog:save-file', { defaultName, filters })
  },
  app: {
    getPath: (name: string): Promise<string> =>
      ipcRenderer.invoke('app:get-path', { name }),
    clearCache: (): Promise<{ cleared: number; formatted: string }> =>
      ipcRenderer.invoke('app:clear-cache'),
    getCacheSize: (): Promise<{ size: number; formatted: string }> =>
      ipcRenderer.invoke('app:get-cache-size'),
  },
  settings: {
    getConfig: (): Promise<unknown> =>
      ipcRenderer.invoke('settings:get-config'),
    getKeyStatus: (): Promise<unknown> =>
      ipcRenderer.invoke('settings:get-key-status'),
    updateModel: (category: string, provider: string, model: string): Promise<unknown> =>
      ipcRenderer.invoke('settings:update-model', category, provider, model)
  },
  transcription: {
    checkReady: (): Promise<boolean> =>
      ipcRenderer.invoke('transcription:check-ready'),
    start: (audioPath: string, language?: string): Promise<{ success: boolean; subtitles?: unknown; error?: string }> =>
      ipcRenderer.invoke('transcription:start', audioPath, language),
    getResult: (subtitles: unknown): Promise<{ srt: string; withFillers: unknown }> =>
      ipcRenderer.invoke('transcription:result', subtitles),
    exportSRT: (subtitles: unknown, outputPath?: string): Promise<{ success: boolean; path?: string; error?: string }> =>
      ipcRenderer.invoke('transcription:export-srt', subtitles, outputPath)
  },
  ai: {
    runEdit: (subtitles: unknown, creativeInput: unknown, chatHistory?: string): Promise<unknown> =>
      ipcRenderer.invoke('ai:edit-run', subtitles, creativeInput, chatHistory),
    chatSend: (projectId: string, message: string, subtitles: unknown, creativeInput: unknown): Promise<unknown> =>
      ipcRenderer.invoke('ai:chat-send', projectId, message, subtitles, creativeInput),
    chatParse: (text: string, subtitles: unknown, creativeInput: unknown): Promise<unknown> =>
      ipcRenderer.invoke('ai:chat-parse', text, subtitles, creativeInput),
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error('Failed to expose API:', error)
  }
} else {
  // @ts-ignore
  window.api = api
}
