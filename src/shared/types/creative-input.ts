import type { StylePreset } from './style-preset'
import type { EditingMode } from './editing-mode'

export type MusicSource = 'auto' | 'user' | 'none'

export interface CreativeInput {
  editingMode: EditingMode
  presetId: string
  musicSource: MusicSource
  musicFilePath?: string
  targetDuration?: number            // seconds, 0 = auto
  customTopic?: string
  customKeyPoints?: string[]
  customConstraints?: string[]
  customSteps?: string[]
}

export const DEFAULT_CREATIVE_INPUT: CreativeInput = {
  editingMode: 'ai_narrate',
  presetId: 'product-launch',
  musicSource: 'auto',
  targetDuration: 0,                // auto
}
