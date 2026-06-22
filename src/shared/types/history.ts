import type { Project } from './project'

export interface ProjectSnapshot {
  id: string
  timestamp: string
  label: string
  trigger: 'ai_operation' | 'manual_edit' | 'manual_save'
  projectState: Project
  diff?: SnapshotDiff
}

export interface SnapshotDiff {
  addedClips: number
  removedClips: number
  modifiedClips: number
  subtitleChanges: number
}
