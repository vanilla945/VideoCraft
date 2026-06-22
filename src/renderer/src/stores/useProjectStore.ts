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

    // Restore media assets
    if (project.assets?.length > 0) {
      const { useMediaStore } = await import('./useMediaStore')
      useMediaStore.getState().addAssets(project.assets.map(a => a.filePath))
    }

    // Restore editor timeline
    if (project.timeline) {
      const { useEditorStore } = await import('./useEditorStore')
      useEditorStore.setState({ timeline: project.timeline })
    }

    // Restore subtitles (if saved in project)
    const proj = project as any
    if (proj.subtitles?.length > 0) {
      const { useSubtitleStore } = await import('./useSubtitleStore')
      useSubtitleStore.setState({ subtitles: proj.subtitles })
    }

    // Restore AI creative input (if saved)
    if (proj.creativeInput) {
      const { useAIStore } = await import('./useAIStore')
      useAIStore.getState().loadCreativeInput(proj.creativeInput)
    }
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

    // Merge current state into project before saving
    const merged = await mergeStateIntoProject(project)
    await window.api.project.save(merged, targetPath)
    set({ filePath: targetPath, isDirty: false })
  },

  saveProjectAs: async () => {
    const { project } = get()
    if (!project) return

    const targetPath = await window.api.dialog.saveFile('untitled.vcraft', [
      { name: 'VideoCraft Project', extensions: ['vcraft'] }
    ])
    if (!targetPath) return

    const merged = await mergeStateIntoProject(project)
    await window.api.project.save(merged, targetPath)
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

// Collect current runtime state from all stores and merge into Project
async function mergeStateIntoProject(project: Project): Promise<any> {
  const { useEditorStore } = await import('./useEditorStore')
  const { useSubtitleStore } = await import('./useSubtitleStore')
  const { useAIStore } = await import('./useAIStore')
  const { useMediaStore } = await import('./useMediaStore')

  const editor = useEditorStore.getState()
  const subtitle = useSubtitleStore.getState()
  const ai = useAIStore.getState()
  const media = useMediaStore.getState()

  return {
    ...project,
    assets: media.assets,
    timeline: editor.timeline,
    subtitles: subtitle.subtitles,
    creativeInput: ai.getCreativeInput(),
    savedAt: new Date().toISOString(),
  }
}
