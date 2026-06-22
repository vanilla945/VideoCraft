import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/types/ipc'
import { projectService } from '../services/project.service'
import type { ProjectConfig, Project } from '../../shared/types'

export function registerProjectHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.PROJECT_CREATE, async (_event, config: ProjectConfig) => {
    return projectService.createProject(config)
  })

  ipcMain.handle(IPC_CHANNELS.PROJECT_SAVE, async (_event, { project, filePath }: { project: Project; filePath?: string }) => {
    projectService.saveProject(project, filePath!)
    return filePath!
  })

  ipcMain.handle(IPC_CHANNELS.PROJECT_LOAD, async (_event, { filePath }: { filePath: string }) => {
    return projectService.loadProject(filePath)
  })

  ipcMain.handle(IPC_CHANNELS.PROJECT_GET_RECENT, async () => {
    return projectService.getRecentProjects()
  })
}
