import { useState } from 'react'
import { useEditorStore } from '../../stores/useEditorStore'
import { useMediaStore } from '../../stores/useMediaStore'
import { ClipItem } from './ClipItem'

export function Timeline(): JSX.Element {
  const { timeline, selectedClipId, selectClip, addClipToTrack } = useEditorStore()
  const { assets } = useMediaStore()
  const [draggedAsset, setDraggedAsset] = useState<string | null>(null)

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
    setDraggedAsset(null)
  }

  const formatTime = (sec: number): string => {
    const m = Math.floor(sec / 60)
    const s = Math.floor(sec % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  return (
    <div
      className="h-40 bg-gray-850 border-t border-gray-700 flex flex-col"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="px-4 py-1.5 border-b border-gray-750 flex items-center justify-between">
        <span className="text-xs text-gray-400 uppercase tracking-wider">时间轴</span>
        <span className="text-xs text-gray-500">
          {timeline.tracks.length > 0 ? `${timeline.tracks[0].clips.length} 个片段` : '空'}
          {' · '}
          {formatTime(timeline.duration)}
        </span>
      </div>
      <div className="flex-1 overflow-x-auto overflow-y-hidden relative">
        {/* Time ruler */}
        <div className="h-5 border-b border-gray-750 flex items-end px-0">
          {Array.from({ length: Math.ceil(timeline.duration / 5) + 1 }).map((_, i) => (
            <div
              key={i}
              className="absolute text-[10px] text-gray-500"
              style={{ left: `${(i * 5) * 80}px` }}
            >
              {formatTime(i * 5)}
            </div>
          ))}
        </div>
        {/* Tracks */}
        <div className="relative" style={{ minHeight: '80px' }}>
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
