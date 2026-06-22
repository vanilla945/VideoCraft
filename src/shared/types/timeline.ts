export interface Timeline {
  tracks: Track[]
  duration: number
}

export interface Track {
  id: string
  type: 'video' | 'audio'
  clips: Clip[]
}

export interface Clip {
  id: string
  assetId: string
  trackId: string
  sourceStart: number
  sourceEnd: number
  timelineStart: number
  duration: number
}
