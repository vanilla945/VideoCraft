import type { MediaAsset } from './media'
import type { Timeline } from './timeline'
import type { ExportPreset } from './export'

export interface ProjectConfig {
  name: string
  resolution: Resolution
  frameRate: number
  createdAt: string
  updatedAt: string
}

export interface Resolution {
  width: number
  height: number
}

export interface Project {
  version: '1.0.0'
  config: ProjectConfig
  assets: MediaAsset[]
  timeline: Timeline
  exportPresets: ExportPreset[]
}
