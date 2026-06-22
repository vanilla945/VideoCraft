import { create } from 'zustand'
import type { Timeline, Clip } from '@shared/types'

interface AIEditRecord {
  removedClipIds: string[]
  modifiedClips: Map<string, Partial<Clip>>
  addedClipIds: string[]
  timestamp: number
}

interface EditorState {
  timeline: Timeline
  selectedClipId: string | null
  playbackPosition: number
  isPlaying: boolean
  aiEditApplied: boolean
  lastAIEditRecord: AIEditRecord | null

  addClipToTrack: (assetId: string, trackId: string, duration?: number) => void
  ensureDefaultTrack: () => void
  removeClip: (clipId: string) => void
  selectClip: (clipId: string | null) => void
  trimClip: (clipId: string, sourceStart: number, sourceEnd: number) => void
  moveClip: (clipId: string, newTimelineStart: number) => void
  setPlaybackPosition: (seconds: number) => void
  setPlaying: (playing: boolean) => void
  updateTimelineDuration: () => void

  // AI edit — rebuilds timeline from EDL decisions (time-based, not clipId-based)
  applyAIEdits: (decisions: Array<{
    clipId?: string; startTime: number; endTime: number
    action: string; reason?: string; confidence?: number
    speedRatio?: number
  }>) => void
  revertAIEdits: () => void
}

export const useEditorStore = create<EditorState>((set, get) => ({
  timeline: { tracks: [], duration: 0 },
  selectedClipId: null,
  playbackPosition: 0,
  isPlaying: false,
  aiEditApplied: false,
  lastAIEditRecord: null,

  ensureDefaultTrack: () => {
    const { timeline } = get()
    if (timeline.tracks.length === 0) {
      set({
        timeline: {
          ...timeline,
          tracks: [{ id: 'default-video-track', type: 'video', clips: [] }]
        }
      })
    }
  },

  addClipToTrack: (assetId, trackId, duration = 0) => {
    get().ensureDefaultTrack()
    set((state) => {
      const tracks = state.timeline.tracks.map((track) => {
        if (track.id !== trackId) return track
        const lastClip = track.clips[track.clips.length - 1]
        const timelineStart = lastClip ? lastClip.timelineStart + lastClip.duration : 0
        const newClip: Clip = {
          id: crypto.randomUUID(),
          assetId,
          trackId,
          sourceStart: 0,
          sourceEnd: duration || 5,
          timelineStart,
          duration: duration || 5
        }
        return { ...track, clips: [...track.clips, newClip] }
      })
      return { timeline: { ...state.timeline, tracks } }
    })
    get().updateTimelineDuration()
  },

  removeClip: (clipId) => {
    set((state) => ({
      timeline: {
        ...state.timeline,
        tracks: state.timeline.tracks.map((track) => ({
          ...track,
          clips: track.clips.filter((c) => c.id !== clipId)
        }))
      },
      selectedClipId: state.selectedClipId === clipId ? null : state.selectedClipId
    }))
    get().updateTimelineDuration()
  },

  selectClip: (clipId) => {
    set({ selectedClipId: clipId })
  },

  trimClip: (clipId, sourceStart, sourceEnd) => {
    set((state) => ({
      timeline: {
        ...state.timeline,
        tracks: state.timeline.tracks.map((track) => ({
          ...track,
          clips: track.clips.map((c) =>
            c.id === clipId
              ? { ...c, sourceStart, sourceEnd, duration: sourceEnd - sourceStart }
              : c
          )
        }))
      }
    }))
    get().updateTimelineDuration()
  },

  moveClip: (clipId, newTimelineStart) => {
    set((state) => ({
      timeline: {
        ...state.timeline,
        tracks: state.timeline.tracks.map((track) => ({
          ...track,
          clips: track.clips.map((c) =>
            c.id === clipId ? { ...c, timelineStart: Math.max(0, newTimelineStart) } : c
          )
        }))
      }
    }))
    get().updateTimelineDuration()
  },

  setPlaybackPosition: (seconds) => {
    set({ playbackPosition: seconds })
  },

  setPlaying: (playing) => {
    set({ isPlaying: playing })
  },

  updateTimelineDuration: () => {
    const { timeline } = get()
    let maxEnd = 0
    for (const track of timeline.tracks) {
      for (const clip of track.clips) {
        const end = clip.timelineStart + clip.duration
        if (end > maxEnd) maxEnd = end
      }
    }
    set({ timeline: { ...timeline, duration: maxEnd } })
  },

  // ==========================================
  // AI Edit: rebuild timeline from EDL decisions
  // Works on time ranges — no clipId dependency
  // ==========================================
  applyAIEdits: (decisions) => {
    get().ensureDefaultTrack()
    const state = get()
    const firstTrack = state.timeline.tracks[0]
    if (!firstTrack) return

    const firstClip = firstTrack.clips[0]
    if (!firstClip) return

    const assetId = firstClip.assetId

    // Save full timeline state for revert
    const record: AIEditRecord = {
      removedClipIds: firstTrack.clips.map(c => c.id),
      modifiedClips: new Map(),
      addedClipIds: [],
      timestamp: Date.now(),
    }

    // Filter keep decisions, sort by startTime
    const keepDecisions = decisions
      .filter(d => d.action === 'keep' || d.action === 'speed' || d.action === 'trim')
      .sort((a, b) => a.startTime - b.startTime)

    if (keepDecisions.length === 0) return

    const newClips: Clip[] = []
    let timelinePos = 0

    for (const d of keepDecisions) {
      const duration = d.endTime - d.startTime
      const speedRatio = d.speedRatio || 1
      const actualDuration = duration / speedRatio

      const newClip: Clip = {
        id: crypto.randomUUID(),
        assetId,
        trackId: firstTrack.id,
        sourceStart: d.startTime,
        sourceEnd: d.endTime,
        timelineStart: timelinePos,
        duration: actualDuration,
      }
      newClips.push(newClip)
      record.addedClipIds.push(newClip.id)

      if (speedRatio !== 1) {
        record.modifiedClips.set(newClip.id, { duration: actualDuration, sourceEnd: d.endTime })
      }

      timelinePos += actualDuration
    }

    set({
      timeline: { ...state.timeline, tracks: [{ ...firstTrack, clips: newClips }] },
      aiEditApplied: true,
      lastAIEditRecord: record,
    })
    get().updateTimelineDuration()
  },

  revertAIEdits: () => {
    const { lastAIEditRecord } = get()
    if (!lastAIEditRecord) return

    set((state) => {
      const firstTrack = state.timeline.tracks[0]
      if (!firstTrack) return state

      const keptClips = firstTrack.clips.filter(
        c => !lastAIEditRecord.addedClipIds.includes(c.id)
      )

      return {
        timeline: { ...state.timeline, tracks: [{ ...firstTrack, clips: keptClips }] },
        aiEditApplied: false,
        lastAIEditRecord: null,
      }
    })
    get().updateTimelineDuration()
  },
}))
