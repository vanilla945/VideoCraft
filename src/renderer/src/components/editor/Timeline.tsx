import { useState } from 'react'
import { useEditorStore } from '../../stores/useEditorStore'
import { useMediaStore } from '../../stores/useMediaStore'
import { ClipItem } from './ClipItem'

const ZOOM_LEVELS = [
  { label: '25%', value: 20 },
  { label: '50%', value: 40 },
  { label: '100%', value: 80 },
  { label: '150%', value: 120 },
  { label: '200%', value: 160 },
  { label: '300%', value: 240 },
]

export function Timeline(): JSX.Element {
  const { timeline, selectedClipId, selectClip, addClipToTrack } = useEditorStore()
  const { assets } = useMediaStore()
  const [zoomIdx, setZoomIdx] = useState(2)  // default to 100% = 80px/s
  const pxPerSec = ZOOM_LEVELS[zoomIdx].value

  const videoTrack = timeline.tracks.find((t) => t.type === 'video')
    || timeline.tracks[0]

  const handleDragOver = (e: React.DragEvent): void => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent): void => {
    e.preventDefault()
    const assetId = e.dataTransfer.getData('assetId')
    if (assetId && videoTrack) {
      const asset = assets.find((a) => a.id === assetId)
      addClipToTrack(assetId, videoTrack.id, asset?.metadata.duration || 5)
    }
  }

  const formatTime = (sec: number): string => {
    const m = Math.floor(sec / 60)
    const s = Math.floor(sec % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const duration = Math.max(timeline.duration || 30, 30)
  const tickInterval = pxPerSec >= 160 ? 1 : pxPerSec >= 80 ? 2 : 5

  return (
    <div
      className="h-40 bg-gray-850 border-t border-gray-700 flex flex-col"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="px-4 py-1.5 border-b border-gray-750 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400 uppercase tracking-wider">时间轴</span>
          {/* Zoom controls */}
          <div className="flex items-center gap-0.5 bg-gray-700/50 rounded px-1 py-0.5">
            <button
              onClick={() => setZoomIdx(Math.max(0, zoomIdx - 1))}
              disabled={zoomIdx === 0}
              className="text-xs px-1.5 text-gray-400 hover:text-white disabled:opacity-30"
            >
              −
            </button>
            <span className="text-xs text-gray-300 min-w-[40px] text-center">
              {ZOOM_LEVELS[zoomIdx].label}
            </span>
            <button
              onClick={() => setZoomIdx(Math.min(ZOOM_LEVELS.length - 1, zoomIdx + 1))}
              disabled={zoomIdx === ZOOM_LEVELS.length - 1}
              className="text-xs px-1.5 text-gray-400 hover:text-white disabled:opacity-30"
            >
              +
            </button>
          </div>
        </div>
        <span className="text-xs text-gray-500">
          {timeline.tracks.length > 0 ? `${timeline.tracks[0].clips.length} 个片段` : '空'}
          {' · '}
          {formatTime(timeline.duration)}
        </span>
      </div>
      <div className="flex-1 overflow-x-auto overflow-y-hidden relative">
        {/* Time ruler */}
        <div className="h-5 border-b border-gray-750 flex items-end relative" style={{ minWidth: `${duration * pxPerSec}px` }}>
          {Array.from({ length: Math.ceil(duration / tickInterval) + 1 }).map((_, i) => {
            const t = i * tickInterval
            return (
              <div
                key={i}
                className="absolute bottom-0 text-[10px] text-gray-500"
                style={{ left: `${t * pxPerSec}px` }}
              >
                <div className="h-2 w-px bg-gray-600 mx-auto mb-0.5" />
                {formatTime(t)}
              </div>
            )
          })}
        </div>
        {/* Tracks */}
        <div className="relative" style={{ minWidth: `${duration * pxPerSec}px`, minHeight: '80px' }}>
          {timeline.tracks.map((track) => (
            <div key={track.id} className="h-16 relative border-b border-gray-750/50">
              {track.clips.map((clip) => {
                const asset = assets.find((a) => a.id === clip.assetId)
                return (
                  <ClipItem
                    key={clip.id}
                    clip={clip}
                    asset={asset}
                    isSelected={clip.id === selectedClipId}
                    onSelect={() => selectClip(clip.id)}
                    pxPerSec={pxPerSec}
                  />
                )
              })}
              {track.clips.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-600">
                  拖拽素材到此处
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
