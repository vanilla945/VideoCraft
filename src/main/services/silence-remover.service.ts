import type { SubtitleItem } from '../../shared/types/subtitle'

export interface SilenceRegion {
  startTime: number
  endTime: number
  duration: number
  type: 'silence' | 'filler_word' | 'low_quality'
}

export interface SilenceRemovalConfig {
  silenceThreshold: number       // seconds, default 1.5
  minClipDuration: number        // seconds, default 2
  fillerWordStrategy: 'aggressive' | 'moderate' | 'lenient'
}

class SilenceRemoverService {
  detectSilenceFromSubtitles(
    subtitles: SubtitleItem[],
    config: SilenceRemovalConfig
  ): SilenceRegion[] {
    const regions: SilenceRegion[] = []
    const sorted = [...subtitles].sort((a, b) => a.startTime - b.startTime)

    for (let i = 0; i < sorted.length; i++) {
      const current = sorted[i]

      // Mark filler words
      if (current.isFillerWord) {
        const shouldRemove =
          config.fillerWordStrategy === 'aggressive' ||
          (config.fillerWordStrategy === 'moderate' &&
            (current.endTime - current.startTime) < 1.5) // short fillers only

        if (shouldRemove) {
          regions.push({
            startTime: current.startTime,
            endTime: current.endTime,
            duration: current.endTime - current.startTime,
            type: 'filler_word',
          })
        }
      }

      // Detect silence gaps between subtitles
      if (i < sorted.length - 1) {
        const next = sorted[i + 1]
        const gap = next.startTime - current.endTime

        if (gap >= config.silenceThreshold) {
          regions.push({
            startTime: current.endTime,
            endTime: next.startTime,
            duration: gap,
            type: 'silence',
          })
        }
      }
    }

    // Mark subtitles shorter than minClipDuration as low_quality
    // (only when aggressive strategy)
    if (config.fillerWordStrategy === 'aggressive') {
      for (const sub of sorted) {
        if (!sub.isFillerWord && (sub.endTime - sub.startTime) < config.minClipDuration * 0.5) {
          regions.push({
            startTime: sub.startTime,
            endTime: sub.endTime,
            duration: sub.endTime - sub.startTime,
            type: 'low_quality',
          })
        }
      }
    }

    return regions.sort((a, b) => a.startTime - b.startTime)
  }

  computeCleanTimeline(
    subtitles: SubtitleItem[],
    config: SilenceRemovalConfig
  ): { keptSubtitles: SubtitleItem[]; removedSubtitles: SubtitleItem[]; stats: { removedCount: number; removedDuration: number; totalDuration: number } } {
    const silentRegions = this.detectSilenceFromSubtitles(subtitles, config)
    const removedIds = new Set<string>()

    // Collect removed subtitle ids
    for (const region of silentRegions) {
      for (const sub of subtitles) {
        if (
          sub.startTime >= region.startTime &&
          sub.endTime <= region.endTime
        ) {
          removedIds.add(sub.id)
        }
      }
    }

    const keptSubtitles = subtitles.filter(s => !removedIds.has(s.id))
    const removedSubtitles = subtitles.filter(s => removedIds.has(s.id))
    const removedDuration = silentRegions.reduce((sum, r) => sum + r.duration, 0)
    const totalDuration = subtitles.length > 0
      ? Math.max(...subtitles.map(s => s.endTime))
      : 0

    return {
      keptSubtitles,
      removedSubtitles,
      stats: {
        removedCount: removedSubtitles.length,
        removedDuration: Math.round(removedDuration),
        totalDuration: Math.round(totalDuration),
      },
    }
  }
}

export const silenceRemoverService = new SilenceRemoverService()
