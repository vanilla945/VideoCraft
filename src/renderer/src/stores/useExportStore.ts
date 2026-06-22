import { create } from 'zustand'
import type { ExportConfig, ExportPreset, ExportProgress } from '@shared/types'
import { useProjectStore } from './useProjectStore'

const DEFAULT_PRESET: ExportPreset = {
  name: '1080p H.264',
  resolution: { width: 1920, height: 1080 },
  codec: 'libx264',
  format: 'mp4',
  bitRate: 5000000,
  frameRate: 30,
  audioCodec: 'aac',
  audioBitRate: 192000
}

interface ExportState {
  isDialogOpen: boolean
  config: ExportConfig | null
  progress: ExportProgress | null

  openDialog: () => void
  closeDialog: () => void
  setConfig: (config: ExportConfig) => void
  startExport: () => Promise<void>
  cancelExport: () => Promise<void>
  cleanup: () => void
}

export const useExportStore = create<ExportState>((set, get) => ({
  isDialogOpen: false,
  config: null,
  progress: null,

  openDialog: () => {
    const { project } = useProjectStore.getState()
    if (!project) return

    set({
      isDialogOpen: true,
      config: {
        preset: project.exportPresets[0] || DEFAULT_PRESET,
        outputPath: '',
        inPoint: 0,
        outPoint: project.timeline.duration || 60
      },
      progress: null
    })
  },

  closeDialog: () => {
    get().cleanup()
    set({ isDialogOpen: false })
  },

  setConfig: (config) => {
    set({ config })
  },

  startExport: async () => {
    const { project } = useProjectStore.getState()
    const { config } = get()
    if (!project || !config) return

    if (!config.outputPath) {
      const path = await window.api.dialog.saveFile('output.mp4', [
        { name: 'MP4 Video', extensions: ['mp4'] }
      ])
      if (!path) return
      config.outputPath = path
    }

    set({
      progress: { status: 'running', percent: 0, fps: 0, timeElapsed: '', eta: '' }
    })

    window.api.export.onProgress((progress) => {
      set({ progress })
    })

    try {
      await window.api.export.start(project, config)
    } catch (err) {
      set({
        progress: { status: 'failed', percent: 0, fps: 0, timeElapsed: '', eta: '', error: String(err) }
      })
    }
  },

  cancelExport: async () => {
    await window.api.export.cancel()
    set({ progress: { status: 'failed', percent: 0, fps: 0, timeElapsed: '', eta: '', error: '已取消' } })
  },

  cleanup: () => {
    set({ config: null, progress: null })
  }
}))
