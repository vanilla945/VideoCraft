import { useRef, useEffect, useCallback, useState } from 'react'
import { useEditorStore } from '../../stores/useEditorStore'
import { useMediaStore } from '../../stores/useMediaStore'

export function PreviewPane(): JSX.Element {
  const videoRef = useRef<HTMLVideoElement>(null)
  const { selectedClipId, timeline, playbackPosition, isPlaying, setPlaying, setPlaybackPosition } = useEditorStore()
  const { assets } = useMediaStore()
  const [currentSrc, setCurrentSrc] = useState<string | null>(null)

  // Find current clip to display — selected first, then first clip on timeline
  const allClips = timeline.tracks.flatMap((t) => t.clips)
  const selectedClip = selectedClipId
    ? allClips.find((c) => c.id === selectedClipId)
    : allClips[0]

  const asset = selectedClip
    ? assets.find((a) => a.id === selectedClip.assetId)
    : null

  // Update video source when selected clip changes
  useEffect(() => {
    if (asset && videoRef.current) {
      const src = `file://${asset.filePath}`
      if (videoRef.current.src !== src) {
        videoRef.current.src = src
        videoRef.current.currentTime = selectedClip?.sourceStart || 0
        setCurrentSrc(src)
      }
    }
  }, [asset?.filePath, selectedClip?.sourceStart])

  // Sync playback position from store → video
  useEffect(() => {
    const video = videoRef.current
    if (!video || !asset) return

    if (Math.abs(video.currentTime - playbackPosition) > 0.5) {
      video.currentTime = playbackPosition
    }
  }, [playbackPosition, asset])

  // Sync play/pause state
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    if (isPlaying && video.paused && video.src) {
      video.play().catch(() => {})
    } else if (!isPlaying && !video.paused) {
      video.pause()
    }
  }, [isPlaying])

  // Forward video events → store
  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current && isPlaying) {
      setPlaybackPosition(videoRef.current.currentTime)
    }
  }, [isPlaying, setPlaybackPosition])

  const handlePlay = useCallback(() => {
    setPlaying(true)
  }, [setPlaying])

  const handlePause = useCallback(() => {
    setPlaying(false)
  }, [setPlaying])

  // Click on empty area to play/pause
  const handleCanvasClick = useCallback(() => {
    if (videoRef.current?.src) {
      setPlaying(!isPlaying)
    }
  }, [isPlaying, setPlaying])

  return (
    <div
      className="flex-1 bg-black flex items-center justify-center overflow-hidden relative"
      onClick={handleCanvasClick}
    >
      {asset && currentSrc ? (
        <video
          ref={videoRef}
          className="max-w-full max-h-full object-contain"
          onTimeUpdate={handleTimeUpdate}
          onPlay={handlePlay}
          onPause={handlePause}
        />
      ) : (
        <div className="text-center text-gray-600">
          <div className="text-4xl mb-3">
            {allClips.length > 0 ? '▶️' : '🎬'}
          </div>
          <p className="text-sm">
            {allClips.length > 0
              ? '选择时间轴片段或点击播放'
              : '导入素材并添加到时间轴开始编辑'}
          </p>
        </div>
      )}
      {/* Click-to-play overlay for empty state with clips */}
      {!isPlaying && asset && currentSrc && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer">
          <div className="text-5xl opacity-80 hover:opacity-100 transition-opacity">▶️</div>
        </div>
      )}
    </div>
  )
}
