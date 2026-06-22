import { create } from 'zustand'
import type { Project, ProjectConfig } from '@shared/types'

interface ProjectState {
  project: Project | null
  filePath: string | null
  isDirty: boolean
  recentProjects: string[]

  createProject: (config: ProjectConfig) => Promise<void>
  loadProject: (filePath: string) => Promise<void>
  saveProject: () => Promise<void>
  saveProjectAs: () => Promise<void>
  updateConfig: (patch: Partial<ProjectConfig>) => void
  loadRecentProjects: () => Promise<void>
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  project: null,
  filePath: null,
  isDirty: false,
  recentProjects: [],

  createProject: async (config) => {
    const project = await window.api.project.create(config)
    set({ project, filePath: null, isDirty: true })
  },

  loadProject: async (filePath) => {
    const project = await window.api.project.load(filePath)
    set({ project, filePath, isDirty: false })
  },

  saveProject: async () => {
    const { project, filePath } = get()
    if (!project) return

    let targetPath = filePath
    if (!targetPath) {
      targetPath = await window.api.dialog.saveFile('untitled.vcraft', [
        { name: 'VideoCraft Project', extensions: ['vcraft'] }
      ])
      if (!targetPath) return
    }

    await window.api.project.save(project, targetPath)
    set({ filePath: targetPath, isDirty: false })
  },

  saveProjectAs: async () => {
    const { project } = get()
    if (!project) return

    const targetPath = await window.api.dialog.saveFile('untitled.vcraft', [
      { name: 'VideoCraft Project', extensions: ['vcraft'] }
    ])
    if (!targetPath) return

    await window.api.project.save(project, targetPath)
    set({ filePath: targetPath, isDirty: false })
  },

  updateConfig: (patch) => {
    const { project } = get()
    if (!project) return
    set({
      project: {
        ...project,
        config: { ...project.config, ...patch, updatedAt: new Date().toISOString() }
      },
      isDirty: true
    })
  },

  loadRecentProjects: async () => {
    const recentProjects = await window.api.project.getRecent()
    set({ recentProjects })
  }
}))
