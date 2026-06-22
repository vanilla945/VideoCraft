import type { StylePreset } from '../../shared/types/style-preset'

interface UserPreference {
  preferredPresetId: string
  preferredMode: string
  avgSilenceThreshold: number
  avgMinClipDuration: number
  fillerWordTolerance: number
  preferredExportPresets: string[]
  musicSourcePreference: string
  totalProjects: number
  lastUpdated: string
}

class PreferenceLearnerService {
  private defaults: UserPreference = {
    preferredPresetId: 'product-launch',
    preferredMode: 'ai_narrate',
    avgSilenceThreshold: 1.5,
    avgMinClipDuration: 2,
    fillerWordTolerance: 0.5,
    preferredExportPresets: ['1080p-landscape'],
    musicSourcePreference: 'auto',
    totalProjects: 0,
    lastUpdated: new Date().toISOString(),
  }

  private current: UserPreference = { ...this.defaults }

  load(prefs: Partial<UserPreference>): void {
    this.current = { ...this.defaults, ...prefs }
  }

  save(): UserPreference {
    this.current.lastUpdated = new Date().toISOString()
    this.current.totalProjects++
    return { ...this.current }
  }

  learnFromUserAction(action: string, value: any): void {
    switch (action) {
      case 'restore_clip':
        // User restored a clip AI wanted to remove → increase min duration
        this.current.avgMinClipDuration = Math.min(5, this.current.avgMinClipDuration * 1.1)
        break
      case 'aggressive_remove':
        // User manually removed more → decrease thresholds
        this.current.avgSilenceThreshold = Math.max(0.3, this.current.avgSilenceThreshold * 0.9)
        this.current.fillerWordTolerance = Math.max(0, this.current.fillerWordTolerance - 0.1)
        break
      case 'lenient_keep':
        // User kept filler words → increase tolerance
        this.current.fillerWordTolerance = Math.min(1, this.current.fillerWordTolerance + 0.1)
        break
      case 'change_preset':
        this.current.preferredPresetId = value
        break
      case 'change_mode':
        this.current.preferredMode = value
        break
      case 'select_export_preset':
        if (!this.current.preferredExportPresets.includes(value)) {
          this.current.preferredExportPresets.push(value)
        }
        break
      case 'change_music_source':
        this.current.musicSourcePreference = value
        break
    }
  }

  getCurrent(): UserPreference {
    return { ...this.current }
  }

  getRecommendedPresetId(): string {
    return this.current.preferredPresetId
  }

  getRecommendedMode(): string {
    return this.current.preferredMode
  }

  getSilenceConfig(): { threshold: number; minDuration: number; fillerTolerance: number } {
    return {
      threshold: Math.round(this.current.avgSilenceThreshold * 10) / 10,
      minDuration: Math.round(this.current.avgMinClipDuration),
      fillerTolerance: Math.round(this.current.fillerWordTolerance * 100) / 100,
    }
  }
}

export const preferenceLearner = new PreferenceLearnerService()
