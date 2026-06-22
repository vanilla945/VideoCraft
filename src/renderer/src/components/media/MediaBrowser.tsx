import { useMediaStore } from '../../stores/useMediaStore'
import { useEditorStore } from '../../stores/useEditorStore'

export function MediaBrowser(): JSX.Element {
  const { assets, importing } = useMediaStore()
  const { timeline, addClipToTrack } = useEditorStore()

  // Count how many times each asset is used on the timeline
  const getUsageCount = (assetId: string): number => {
    let count = 0
    for (const track of timeline.tracks) {
      for (const clip of track.clips) {
        if (clip.assetId === assetId) count++
      }
    }
    return count
  }

  const handleAddToTimeline = (assetId: string, duration: number): void => {
    const videoTrack = timeline.tracks.find((t) => t.type === 'video')
    const trackId = videoTrack?.id || 'default-video-track'
    addClipToTrack(assetId, trackId, duration)
  }

  return (
    <div className="flex-1 overflow-y-auto p-3">
      {importing && (
        <div className="text-center py-8 text-gray-400 text-sm">
          正在导入...
        </div>
      )}
      {!importing && assets.length === 0 && (
        <div className="text-center py-8 text-gray-500 text-sm">
          点击工具栏"导入媒体"添加素材
        </div>
      )}
      <div className="space-y-2">
        {assets.map((asset) => (
          <MediaCard
            key={asset.id}
            asset={asset}
            usageCount={getUsageCount(asset.id)}
            onAddToTimeline={() => handleAddToTimeline(asset.id, asset.metadata.duration)}
          />
        ))}
      </div>
    </div>
  )
}

function MediaCard({
  asset,
  usageCount,
  onAddToTimeline
}: {
  asset: import('@shared/types').MediaAsset
  usageCount: number
  onAddToTimeline: () => void
}): JSX.Element {
  const formatDuration = (sec: number): string => {
    const m = Math.floor(sec / 60)
    const s = Math.floor(sec % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  return (
    <div
      className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700 hover:border-gray-500 transition-colors group cursor-grab active:cursor-grabbing relative"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('assetId', asset.id)
        e.dataTransfer.effectAllowed = 'move'
      }}
    >
      {/* Usage count badge */}
      {usageCount > 0 && (
        <div className="absolute top-2 right-2 z-10 bg-blue-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-lg">
          {usageCount}
        </div>
      )}
      <div className="aspect-video bg-gray-750 flex items-center justify-center overflow-hidden">
        {asset.thumbnailPath ? (
          <img
            src={`file://${asset.thumbnailPath}`}
            alt={asset.fileName}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="text-gray-500 text-xs text-center p-2">
            {asset.mediaType === 'video' ? '视频' : asset.mediaType === 'audio' ? '音频' : '图片'}
          </div>
        )}
      </div>
      <div className="p-2">
        <p className="text-xs text-gray-300 truncate" title={asset.fileName}>{asset.fileName}</p>
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-gray-500">
            {asset.metadata.duration > 0 ? formatDuration(asset.metadata.duration) : ''}
            {asset.metadata.width > 0 ? ` ${asset.metadata.width}x${asset.metadata.height}` : ''}
          </span>
          <button
            onClick={onAddToTimeline}
            className="text-xs text-blue-400 hover:text-blue-300 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            + 添加
          </button>
        </div>
      </div>
    </div>
  )
}
