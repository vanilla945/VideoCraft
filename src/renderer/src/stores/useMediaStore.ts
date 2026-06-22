import { create } from 'zustand'
import type { MediaAsset, MediaMetadata } from '@shared/types'

interface MediaState {
  assets: MediaAsset[]
  importing: boolean

  importMedia: () => Promise<void>
  addAssets: (filePaths: string[]) => Promise<void>
  removeAsset: (id: string) => void
  getAsset: (id: string) => MediaAsset | undefined
}

export const useMediaStore = create<MediaState>((set, get) => ({
  assets: [],
  importing: false,

  importMedia: async () => {
    set({ importing: true })
    try {
      const filePaths = await window.api.media.import()
      if (filePaths.length > 0) {
        await get().addAssets(filePaths)
      }
    } finally {
      set({ importing: false })
    }
  },

  addAssets: async (filePaths) => {
    set({ importing: true })
    try {
      const newAssets: MediaAsset[] = []
      for (const filePath of filePaths) {
        const fileName = filePath.split(/[/\\]/).pop() || 'unknown'
        const ext = fileName.split('.').pop()?.toLowerCase() || ''
        const isVideo = ['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext)
        const isAudio = ['mp3', 'wav', 'flac', 'aac'].includes(ext)
        const isImage = ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)

        let metadata: MediaMetadata = {
          duration: 0, width: 0, height: 0, codec: '',
          bitRate: 0, frameRate: 0, fileSize: 0
        }
        let thumbnailPath: string | undefined

        if (isVideo || isAudio) {
          try {
            metadata = await window.api.media.probe(filePath)
          } catch { /* probe failed, use defaults */ }
        }

        if (isVideo) {
          try {
            thumbnailPath = await window.api.media.extractThumbnail(filePath, metadata.duration * 0.3 || 1)
          } catch { /* thumbnail failed */ }
        }

        newAssets.push({
          id: crypto.randomUUID(),
          filePath,
          fileName,
          mediaType: isImage ? 'image' : isAudio ? 'audio' : 'video',
          metadata,
          thumbnailPath,
          importedAt: new Date().toISOString()
        })
      }

      set((state) => ({ assets: [...state.assets, ...newAssets] }))
    } finally {
      set({ importing: false })
    }
  },

  removeAsset: (id) => {
    set((state) => ({ assets: state.assets.filter((a) => a.id !== id) }))
  },

  getAsset: (id) => {
    return get().assets.find((a) => a.id === id)
  }
}))
