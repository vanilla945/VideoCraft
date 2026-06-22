import path from 'path'
import fs from 'fs'
import ffmpeg from 'fluent-ffmpeg'
import { app } from 'electron'
import { randomUUID } from 'crypto'

export interface BeatGrid {
  bpm: number
  beatDuration: number       // seconds per beat
  barDuration: number         // seconds per bar (4 beats)
  beats: number[]             // time points of each beat
  sections: BeatSection[]     // intro/verse/chorus/bridge etc
}

export interface BeatSection {
  startTime: number
  endTime: number
  type: 'intro' | 'verse' | 'chorus' | 'bridge' | 'outro' | 'unknown'
  energyLevel: number         // 0-1
}

export interface BeatSyncResult {
  segments: Array<{
    startTime: number
    endTime: number
    cutPosition: number       // which beat to cut on
    speedRatio: number         // 1.0 normal, >1 faster, <1 slower
    transition: 'hard' | 'speed_ramp' | 'beat_drop'
  }>
}

class BeatSyncService {
  async detectBPM(audioPath: string): Promise<BeatGrid> {
    const bpm = await this.estimateBPM(audioPath)

    // Build a basic beat grid
    const beatDuration = 60 / bpm
    const barDuration = beatDuration * 4
    const totalBeats: number[] = []

    // Get audio duration
    const duration = await this.getAudioDuration(audioPath)
    for (let t = 0; t < duration; t += beatDuration) {
      totalBeats.push(Math.round(t * 1000) / 1000)
    }

    return {
      bpm,
      beatDuration,
      barDuration,
      beats: totalBeats,
      sections: this.estimateSections(duration, bpm),
    }
  }

  private async estimateBPM(audioPath: string): Promise<number> {
    return new Promise((resolve) => {
      let detectedBpm = 0
      ffmpeg(audioPath)
        .outputOptions(['-af', 'abpmeter=output=raw', '-f', 'null'])
        .output('/dev/null')
        .on('stderr', (line: string) => {
          const match = line.match(/BPM:\s*(\d+\.?\d*)/i)
          if (match) {
            detectedBpm = parseFloat(match[1])
          }
        })
        .on('end', () => resolve(detectedBpm > 0 ? detectedBpm : 120))
        .on('error', () => resolve(120))
        .run()
    })
  }

  private estimateSections(duration: number, bpm: number): BeatSection[] {
    // Simple heuristic: divide into intro/verse/chorus based on position
    const sections: BeatSection[] = []
    const totalBars = Math.floor(duration / (60 / bpm * 4))

    if (totalBars <= 0) {
      sections.push({ startTime: 0, endTime: duration, type: 'unknown', energyLevel: 0.5 })
      return sections
    }

    const introBars = Math.max(1, Math.floor(totalBars * 0.15))
    const outroBars = Math.max(1, Math.floor(totalBars * 0.1))
    const midBars = totalBars - introBars - outroBars

    sections.push({
      startTime: 0,
      endTime: introBars * 60 / bpm * 4,
      type: 'intro',
      energyLevel: 0.3,
    })

    if (midBars > 0) {
      const verseBars = Math.floor(midBars * 0.6)
      sections.push({
        startTime: introBars * 60 / bpm * 4,
        endTime: (introBars + verseBars) * 60 / bpm * 4,
        type: 'verse',
        energyLevel: 0.6,
      })
      sections.push({
        startTime: (introBars + verseBars) * 60 / bpm * 4,
        endTime: (introBars + midBars) * 60 / bpm * 4,
        type: 'chorus',
        energyLevel: 0.9,
      })
    }

    sections.push({
      startTime: (introBars + midBars) * 60 / bpm * 4,
      endTime: duration,
      type: 'outro',
      energyLevel: 0.4,
    })

    return sections
  }

  syncToBeats(
    segmentTimes: Array<{ startTime: number; endTime: number }>,
    grid: BeatGrid
  ): BeatSyncResult {
    const result: BeatSyncResult = { segments: [] }

    for (const seg of segmentTimes) {
      const duration = seg.endTime - seg.startTime
      const beatsInSegment = grid.beats.filter(b => b >= seg.startTime && b < seg.endTime)

      // Snap to nearest beat
      const snapStart = this.snapToNearestBeat(seg.startTime, grid.beats)
      const snapEnd = this.snapToNearestBeat(seg.endTime, grid.beats)

      // Determine section for speed adjustment
      const section = grid.sections.find(s =>
        seg.startTime >= s.startTime && seg.startTime < s.endTime
      )

      let speedRatio = 1.0
      let transition: 'hard' | 'speed_ramp' | 'beat_drop' = 'hard'

      if (section) {
        if (section.type === 'chorus') {
          speedRatio = 1.2     // faster during chorus
          transition = 'beat_drop'
        } else if (section.type === 'intro' || section.type === 'outro') {
          speedRatio = 0.9     // slightly slower
        }
      }

      result.segments.push({
        startTime: snapStart,
        endTime: snapEnd,
        cutPosition: beatsInSegment.length > 0 ? beatsInSegment[Math.floor(beatsInSegment.length / 2)] : snapStart,
        speedRatio,
        transition,
      })
    }

    return result
  }

  private snapToNearestBeat(time: number, beats: number[]): number {
    let nearest = time
    let minDist = Infinity
    for (const beat of beats) {
      const dist = Math.abs(beat - time)
      if (dist < minDist) {
        minDist = dist
        nearest = beat
      }
    }
    return nearest
  }

  private getAudioDuration(audioPath: string): Promise<number> {
    return new Promise((resolve) => {
      ffmpeg.ffprobe(audioPath, (err, data) => {
        if (err) resolve(60)
        else resolve(data.format.duration ?? 60)
      })
    })
  }
}

export const beatSyncService = new BeatSyncService()
