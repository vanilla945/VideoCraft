export interface MediaAsset {
  id: string
  filePath: string
  fileName: string
  mediaType: 'video' | 'audio' | 'image'
  metadata: MediaMetadata
  thumbnailPath?: string
  importedAt: string
}

export interface MediaMetadata {
  duration: number
  width: number
  height: number
  codec: string
  bitRate: number
  frameRate: number
  audioCodec?: string
  audioSampleRate?: number
  fileSize: number
}
