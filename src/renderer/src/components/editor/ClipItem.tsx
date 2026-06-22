import type { Clip, MediaAsset } from '@shared/types'

interface ClipItemProps {
  clip: Clip
  asset?: MediaAsset
  isSelected: boolean
  onSelect: () => void
  pxPerSec?: number
}

export function ClipItem({ clip, asset, isSelected, onSelect, pxPerSec = 80 }: ClipItemProps): JSX.Element {
  const left = clip.timelineStart * pxPerSec
  const width = Math.max(clip.duration * pxPerSec, 40)
  const formatTime = (sec: number): string => {
    const m = Math.floor(sec / 60)
    const s = Math.floor(sec % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  return (
    <div
      className={`absolute top-1 h-14 rounded-md cursor-pointer select-none flex flex-col justify-center px-2 overflow-hidden border transition-colors ${
        isSelected
          ? 'bg-blue-700/80 border-blue-400 ring-1 ring-blue-400/50'
          : 'bg-gray-700/80 border-gray-600 hover:bg-gray-600/80'
      }`}
      style={{ left: `${left}px`, width: `${width}px` }}
      onClick={onSelect}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('clipId', clip.id)
      }}
    >
      <p className="text-xs text-white truncate leading-tight">{asset?.fileName || clip.id.slice(0, 8)}</p>
      <p className="text-[10px] text-gray-400">
        {formatTime(clip.sourceStart)} - {formatTime(clip.sourceEnd)}
      </p>
    </div>
  )
}
