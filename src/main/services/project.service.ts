import fs from 'fs'
import path from 'path'
import { app } from 'electron'
import type { Project, ProjectConfig } from '../../shared/types'

class ProjectService {
  private _recentProjectsPath: string | null = null

  private get recentProjectsPath(): string {
    if (!this._recentProjectsPath) {
      this._recentProjectsPath = path.join(app.getPath('userData'), 'recent_projects.json')
    }
    return this._recentProjectsPath
  }

  createProject(config: ProjectConfig): Project {
    const now = new Date().toISOString()
    return {
      version: '1.0.0',
      config: {
        ...config,
        createdAt: now,
        updatedAt: now
      },
      assets: [],
      timeline: {
        tracks: [],
        duration: 0
      },
      exportPresets: [
        {
          name: '1080p H.264',
          resolution: { width: 1920, height: 1080 },
          codec: 'libx264',
          format: 'mp4',
          bitRate: 5000000,
          frameRate: config.frameRate,
          audioCodec: 'aac',
          audioBitRate: 192000
        }
      ]
    }
  }

  saveProject(project: Project, filePath: string): void {
    project.config.updatedAt = new Date().toISOString()
    const json = JSON.stringify(project, null, 2)
    fs.writeFileSync(filePath, json, 'utf-8')
    this.addRecentProject(filePath)
  }

  loadProject(filePath: string): Project {
    const json = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(json) as Project
  }

  getRecentProjects(): string[] {
    try {
      if (fs.existsSync(this.recentProjectsPath)) {
        const json = fs.readFileSync(this.recentProjectsPath, 'utf-8')
        return JSON.parse(json) as string[]
      }
    } catch { /* ignore */ }
    return []
  }

  private addRecentProject(filePath: string): void {
    let recent = this.getRecentProjects()
    recent = recent.filter((p) => p !== filePath)
    recent.unshift(filePath)
    recent = recent.slice(0, 10)
    fs.writeFileSync(this.recentProjectsPath, JSON.stringify(recent), 'utf-8')
  }
}

export const projectService = new ProjectService()
