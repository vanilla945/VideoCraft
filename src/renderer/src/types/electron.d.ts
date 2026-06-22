import type { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      project: {
        create: (config: import('@shared/types').ProjectConfig) => Promise<import('@shared/types').Project>
        save: (project: import('@shared/types').Project, filePath?: string) => Promise<string>
        load: (filePath: string) => Promise<import('@shared/types').Project>
        getRecent: () => Promise<string[]>
      }
      media: {
        import: () => Promise<string[]>
        probe: (filePath: string) => Promise<import('@shared/types').MediaMetadata>
        extractThumbnail: (filePath: string, timeSeconds: number) => Promise<string>
        extractKeyframes: (filePath: string, intervalSeconds: number) => Promise<string[]>
      }
      export: {
        start: (project: import('@shared/types').Project, config: import('@shared/types').ExportConfig) => Promise<void>
        cancel: () => Promise<void>
        onProgress: (callback: (progress: import('@shared/types').ExportProgress) => void) => () => void
      }
      dialog: {
        openFile: (filters?: { name: string; extensions: string[] }[]) => Promise<string[]>
        saveFile: (defaultName?: string, filters?: { name: string; extensions: string[] }[]) => Promise<string | null>
      }
      app: {
        getPath: (name: string) => Promise<string>
      }
      settings: {
        getConfig: () => Promise<{
          fastModelProvider: string; fastModelName: string
          heavyModelProvider: string; heavyModelName: string
          ttsProvider: string; ttsModelName: string
          ttsVoice: string; ttsLanguage: string
          imageProvider: string; imageModelName: string
          imageMaxPerProject: number; whisperModel: string
        }>
        getKeyStatus: () => Promise<Record<string, 'configured' | 'missing'>>
        updateModel: (category: string, provider: string, model: string) => Promise<unknown>
      }
      transcription: {
        checkReady: () => Promise<boolean>
        start: (audioPath: string, language?: string) => Promise<{ success: boolean; subtitles?: import('@shared/types/subtitle').SubtitleItem[]; error?: string }>
        getResult: (subtitles: import('@shared/types/subtitle').SubtitleItem[]) => Promise<{ srt: string; withFillers: import('@shared/types/subtitle').SubtitleItem[] }>
        exportSRT: (subtitles: import('@shared/types/subtitle').SubtitleItem[], outputPath?: string) => Promise<{ success: boolean; path?: string; error?: string }>
      }
      ai: {
        runEdit: (subtitles: import('@shared/types/subtitle').SubtitleItem[], creativeInput: import('@shared/types/creative-input').CreativeInput) => Promise<{ success: boolean; edl?: any; reviewReport?: any; rounds?: number; timing?: any; error?: string }>
        chatSend: (projectId: string, message: string, subtitles: import('@shared/types/subtitle').SubtitleItem[], creativeInput: import('@shared/types/creative-input').CreativeInput) => Promise<{ success: boolean; message?: { role: string; content: string; timestamp: number }; error?: string }>
        chatParse: (text: string, subtitles: import('@shared/types/subtitle').SubtitleItem[], creativeInput: import('@shared/types/creative-input').CreativeInput) => Promise<{ success: boolean; command?: any; error?: string }>
      }
    }
  }
}
