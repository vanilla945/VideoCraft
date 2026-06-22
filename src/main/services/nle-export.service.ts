import path from 'path'
import fs from 'fs'
import { app } from 'electron'
import { randomUUID } from 'crypto'
import type { Project } from '../../shared/types'

export interface NLEProject {
  format: 'premiere_xml' | 'fcpxml' | 'fcpx'
  timeline: { tracks: string[]; markers: NLEMarker[]; duration: number }
  settings: { resolution: { width: number; height: number }; frameRate: number }
}

export interface NLEMarker {
  name: string
  start: number
  end?: number
  color?: string
  comment?: string
}

class NLEExportService {
  private outputDir: string

  constructor() {
    this.outputDir = path.join(app.getPath('userData'), 'nle_export')
    if (!fs.existsSync(this.outputDir)) fs.mkdirSync(this.outputDir, { recursive: true })
  }

  async exportPremiereXML(project: Project): Promise<string> {
    const outputPath = path.join(this.outputDir, `${project.config.name}_${randomUUID()}.xml`)
    const fps = project.config.frameRate || 30

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE xmeml>
<xmeml version="5">
  <sequence>
    <name>${this.escapeXml(project.config.name)}</name>
    <duration>${project.timeline.duration * fps}</duration>
    <rate><timebase>${fps}</timebase><ntsc>${fps === 30 ? 'TRUE' : 'FALSE'}</ntsc></rate>
    <media>
      <video>
        <format><samplecharacteristics>
          <width>${project.config.resolution.width}</width>
          <height>${project.config.resolution.height}</height>
          <pixelaspectratio>square</pixelaspectratio>
        </samplecharacteristics></format>
        ${project.timeline.tracks.map(track => `
        <track>
          ${track.clips.map(clip => {
            const asset = project.assets.find(a => a.id === clip.assetId)
            const srcPath = asset?.filePath || ''
            return `
          <clipitem id="${clip.id}">
            <name>${this.escapeXml(asset?.fileName || clip.id)}</name>
            <duration>${Math.round(clip.duration * fps)}</duration>
            <rate><timebase>${fps}</timebase><ntsc>FALSE</ntsc></rate>
            <start>${Math.round(clip.timelineStart * fps)}</start>
            <end>${Math.round((clip.timelineStart + clip.duration) * fps)}</end>
            <in>${Math.round(clip.sourceStart * fps)}</in>
            <out>${Math.round(clip.sourceEnd * fps)}</out>
            <file id="${asset?.id || clip.id}"><name>${this.escapeXml(srcPath)}</name></file>
          </clipitem>`
          }).join('\n          ')}
        </track>`).join('\n        ')}
      </video>
    </media>
  </sequence>
</xmeml>`

    fs.writeFileSync(outputPath, xml, 'utf-8')
    return outputPath
  }

  async exportDaVinciResolve(project: Project): Promise<string> {
    const outputPath = path.join(this.outputDir, `${project.config.name}_${randomUUID()}.fcpxml`)
    const fps = project.config.frameRate || 30

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE fcpxml>
<fcpxml version="1.9">
  <project name="${this.escapeXml(project.config.name)}">
    <format id="r1" width="${project.config.resolution.width}" height="${project.config.resolution.height}" frameRate="${fps}"/>
    <sequence format="r1" duration="${this.toFcpxTime(project.timeline.duration, fps)}" tcStart="0s" tcFormat="NDF">
      ${project.timeline.tracks.map(track => `
      <spine>
        ${track.clips.map(clip => {
          const asset = project.assets.find(a => a.id === clip.assetId)
          return `
        <asset-clip ref="${clip.id}" name="${this.escapeXml(asset?.fileName || clip.id)}"
          src="${asset?.filePath || ''}"
          offset="${this.toFcpxTime(clip.timelineStart, fps)}"
          duration="${this.toFcpxTime(clip.duration, fps)}"
          start="${this.toFcpxTime(clip.sourceStart, fps)}"/>`
        }).join('\n        ')}
      </spine>`).join('\n      ')}
    </sequence>
  </project>
</fcpxml>`

    fs.writeFileSync(outputPath, xml, 'utf-8')
    return outputPath
  }

  async exportFinalCutPro(project: Project): Promise<string> {
    return this.exportDaVinciResolve(project) // Reuse FCPXML format
  }

  private escapeXml(str: string): string {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  }

  private toFcpxTime(seconds: number, fps: number): string {
    const totalFrames = Math.round(seconds * fps)
    const s = Math.floor(totalFrames / fps)
    const f = totalFrames % fps
    return `${s}s${f}f`
  }
}

export const nleExportService = new NLEExportService()
