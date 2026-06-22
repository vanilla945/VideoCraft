import { create } from 'zustand'
import type { SubtitleItem } from '@shared/types/subtitle'

interface SubtitleState {
  subtitles: SubtitleItem[]
  isTranscribing: boolean
  transcriptionError: string | null
  srtContent: string | null
  selectedSubtitleId: string | null

  // Actions
  setSubtitles: (subtitles: SubtitleItem[]) => void
  updateSubtitleText: (id: string, text: string) => void
  updateSubtitleTime: (id: string, startTime: number, endTime: number) => void
  removeSubtitle: (id: string) => void
  removeSubtitles: (ids: string[]) => void
  selectSubtitle: (id: string | null) => void
  setTranscribing: (isTranscribing: boolean) => void
  setTranscriptionError: (error: string | null) => void
  setSrtContent: (srt: string | null) => void
  clearSubtitles: () => void

  // Transcription trigger
  startTranscription: (audioPath: string, language?: string) => Promise<void>
  checkReady: () => Promise<boolean>
  getSubtitlesForClip: (clipId: string, startTime: number, endTime: number) => SubtitleItem[]
}

export const useSubtitleStore = create<SubtitleState>((set, get) => ({
  subtitles: [],
  isTranscribing: false,
  transcriptionError: null,
  srtContent: null,
  selectedSubtitleId: null,

  setSubtitles: (subtitles) => set({ subtitles }),

  updateSubtitleText: (id, text) =>
    set((state) => ({
      subtitles: state.subtitles.map((s) => (s.id === id ? { ...s, text } : s)),
    })),

  updateSubtitleTime: (id, startTime, endTime) =>
    set((state) => ({
      subtitles: state.subtitles.map((s) =>
        s.id === id ? { ...s, startTime, endTime } : s
      ),
    })),

  removeSubtitle: (id) =>
    set((state) => ({
      subtitles: state.subtitles.filter((s) => s.id !== id),
      selectedSubtitleId: state.selectedSubtitleId === id ? null : state.selectedSubtitleId,
    })),

  removeSubtitles: (ids) =>
    set((state) => ({
      subtitles: state.subtitles.filter((s) => !ids.includes(s.id)),
      selectedSubtitleId: ids.includes(state.selectedSubtitleId || '') ? null : state.selectedSubtitleId,
    })),

  selectSubtitle: (id) => set({ selectedSubtitleId: id }),

  setTranscribing: (isTranscribing) => set({ isTranscribing }),

  setTranscriptionError: (error) => set({ transcriptionError: error }),

  setSrtContent: (srt) => set({ srtContent: srt }),

  clearSubtitles: () =>
    set({
      subtitles: [],
      srtContent: null,
      selectedSubtitleId: null,
      transcriptionError: null,
    }),

  startTranscription: async (audioPath, language = 'zh') => {
    set({ isTranscribing: true, transcriptionError: null })
    try {
      const result = await window.api.transcription.start(audioPath, language)
      if (result.success) {
        set({ subtitles: result.subtitles, isTranscribing: false })
      } else {
        set({ transcriptionError: result.error || '转录失败', isTranscribing: false })
      }
    } catch (err) {
      set({
        transcriptionError: (err as Error).message || '转录异常',
        isTranscribing: false,
      })
    }
  },

  checkReady: async () => {
    try {
      return await window.api.transcription.checkReady()
    } catch {
      return false
    }
  },

  getSubtitlesForClip: (_clipId, startTime, endTime) => {
    return get().subtitles.filter(
      (s) => s.startTime >= startTime && s.endTime <= endTime
    )
  },
}))
