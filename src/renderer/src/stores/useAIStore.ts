import { create } from 'zustand'
import type { EditingMode } from '@shared/types/editing-mode'
import type { CreativeInput, MusicSource } from '@shared/types/creative-input'

interface AnalysisStatus {
  phase: string
  progress: number      // 0-100
  message: string
}

interface AIState {
  // Creative input
  editingMode: EditingMode
  selectedPresetId: string
  musicSource: MusicSource
  musicFilePath: string | null
  targetDuration: number
  customTopic: string
  customKeyPoints: string[]
  customConstraints: string[]

  // Analysis
  isAnalyzing: boolean
  analysisStatus: AnalysisStatus | null
  analysisResults: Record<string, unknown>

  // Chat
  chatMessages: Array<{ role: 'user' | 'ai'; text: string; timestamp: number }>
  isChatProcessing: boolean

  // Actions
  setEditingMode: (mode: EditingMode) => void
  setSelectedPreset: (presetId: string) => void
  setMusicSource: (source: MusicSource) => void
  setMusicFilePath: (path: string | null) => void
  setTargetDuration: (seconds: number) => void
  setCustomTopic: (topic: string) => void
  setCustomKeyPoints: (points: string[]) => void
  setCustomConstraints: (constraints: string[]) => void
  setAnalyzing: (isAnalyzing: boolean) => void
  setAnalysisStatus: (status: AnalysisStatus | null) => void
  setAnalysisResults: (results: Record<string, unknown>) => void
  addChatMessage: (role: 'user' | 'ai', text: string) => void
  setChatProcessing: (processing: boolean) => void
  getCreativeInput: () => CreativeInput
  loadCreativeInput: (input: CreativeInput) => void
  resetToDefault: () => void
}

export const useAIStore = create<AIState>((set, get) => ({
  editingMode: 'ai_narrate',
  selectedPresetId: 'product-launch',
  musicSource: 'auto',
  musicFilePath: null,
  targetDuration: 0,
  customTopic: '',
  customKeyPoints: [],
  customConstraints: [],

  isAnalyzing: false,
  analysisStatus: null,
  analysisResults: {},

  chatMessages: [],
  isChatProcessing: false,

  setEditingMode: (mode) => set({ editingMode: mode }),
  setSelectedPreset: (presetId) => set({ selectedPresetId: presetId }),
  setMusicSource: (source) => set({ musicSource: source }),
  setMusicFilePath: (path) => set({ musicFilePath: path }),
  setTargetDuration: (seconds) => set({ targetDuration: seconds }),
  setCustomTopic: (topic) => set({ customTopic: topic }),
  setCustomKeyPoints: (points) => set({ customKeyPoints: points }),
  setCustomConstraints: (constraints) => set({ customConstraints: constraints }),

  setAnalyzing: (isAnalyzing) => set({ isAnalyzing }),
  setAnalysisStatus: (status) => set({ analysisStatus: status }),
  setAnalysisResults: (results) => set({ analysisResults: results }),

  addChatMessage: (role, text) =>
    set((state) => ({
      chatMessages: [...state.chatMessages, { role, text, timestamp: Date.now() }],
    })),
  setChatProcessing: (processing) => set({ isChatProcessing: processing }),

  getCreativeInput: () => {
    const s = get()
    return {
      editingMode: s.editingMode,
      presetId: s.selectedPresetId,
      musicSource: s.musicSource,
      musicFilePath: s.musicFilePath || undefined,
      targetDuration: s.targetDuration,
      customTopic: s.customTopic || undefined,
      customKeyPoints: s.customKeyPoints,
      customConstraints: s.customConstraints,
    }
  },

  loadCreativeInput: (input) => {
    set({
      editingMode: input.editingMode || 'ai_narrate',
      selectedPresetId: input.presetId || 'product-launch',
      musicSource: input.musicSource || 'auto',
      musicFilePath: input.musicFilePath || null,
      targetDuration: input.targetDuration || 0,
      customTopic: input.customTopic || '',
      customKeyPoints: input.customKeyPoints || [],
      customConstraints: input.customConstraints || [],
    })
  },

  resetToDefault: () => set({
    editingMode: 'ai_narrate',
    selectedPresetId: 'product-launch',
    musicSource: 'auto',
    musicFilePath: null,
    targetDuration: 0,
    customTopic: '',
    customKeyPoints: [],
    customConstraints: [],
  }),
}))
