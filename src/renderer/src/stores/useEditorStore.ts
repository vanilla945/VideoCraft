import { create } from 'zustand'
import type { Timeline, Clip, Track } from '@shared/types'

interface AIEditRecord {
  removedClipIds: string[]
  modifiedClips: Map<string, Partial<Clip>>      // clipId -> original values
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

  // AI edit actions
  applyAIEdits: (decisions: Array<{ clipId: string; action: string; speedRatio?: number }>) => void
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

  applyAIEdits: (decisions) => {
    set((state) => {
      const record: AIEditRecord = {
        removedClipIds: [],
        modifiedClips: new Map(),
        addedClipIds: [],
        timestamp: Date.now(),
      }

      const newTracks = state.timeline.tracks.map((track) => {
        const newClips = [...track.clips]
        const removedSet = new Set<string>()

        for (const d of decisions) {
          const clip = newClips.find((c) => c.id === d.clipId)
          if (!clip) continue

          if (d.action === 'remove') {
            removedSet.add(d.clipId)
            record.removedClipIds.push(d.clipId)
          } else if (d.action === 'speed' && d.speedRatio && d.speedRatio !== 1) {
            // Store original before modifying
            record.modifiedClips.set(d.clipId, {
              duration: clip.duration,
              sourceEnd: clip.sourceEnd,
            })
            // Adjust clip speed (shorter duration = faster playback)
            const newDuration = clip.duration / d.speedRatio
            clip.duration = newDuration
            clip.sourceEnd = clip.sourceStart + newDuration
          }
          // trim, reorder, add_transition — preserve for later phases
        }

        return {
          ...track,
          clips: removedSet.size > 0
            ? newClips.filter((c) => !removedSet.has(c.id))
            : newClips,
        }
      })

      return {
        timeline: { ...state.timeline, tracks: newTracks },
        aiEditApplied: true,
        lastAIEditRecord: record,
      }
    })
    get().updateTimelineDuration()
  },

  revertAIEdits: () => {
    const { lastAIEditRecord } = get()
    if (!lastAIEditRecord) return

    set((state) => {
      const newTracks = state.timeline.tracks.map((track) => {
        const newClips = [...track.clips]

        // Restore modified clips
        for (const [clipId, original] of lastAIEditRecord.modifiedClips) {
          const clip = newClips.find((c) => c.id === clipId)
          if (clip) {
            if (original.duration !== undefined) clip.duration = original.duration
            if (original.sourceEnd !== undefined) clip.sourceEnd = original.sourceEnd
          }
        }

        return { ...track, clips: newClips }
      })

      return {
        timeline: { ...state.timeline, tracks: newTracks },
        aiEditApplied: false,
        lastAIEditRecord: null,
      }
    })
    get().updateTimelineDuration()
  },
}))
