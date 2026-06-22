export interface PipelineSkill {
  id: string
  name: string
  presetId: string
  editingMode: string
  processingSteps: string[]
  targetDuration?: number
  modelPreferences: Record<string, string>
  exportPresetIds: string[]
  createdAt: string
}
