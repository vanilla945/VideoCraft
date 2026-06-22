export interface ExportPreset {
  name: string
  resolution: { width: number; height: number }
  codec: 'libx264' | 'libx265' | 'h264_videotoolbox'
  format: 'mp4' | 'mov' | 'webm'
  bitRate: number
  frameRate: number
  audioCodec: 'aac' | 'mp3'
  audioBitRate: number
}

export interface ExportConfig {
  preset: ExportPreset
  outputPath: string
  inPoint: number
  outPoint: number
}

export type ExportStatus = 'idle' | 'running' | 'completed' | 'failed'

export interface ExportProgress {
  status: ExportStatus
  percent: number
  fps: number
  timeElapsed: string
  eta: string
  error?: string
}
