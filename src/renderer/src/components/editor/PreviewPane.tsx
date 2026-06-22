import { useRef, useEffect, useCallback } from 'react'
import { useEditorStore } from '../../stores/useEditorStore'
import { useMediaStore } from '../../stores/useMediaStore'

export function PreviewPane(): JSX.Element {
  const videoRef = useRef<HTMLVideoElement>(null)
  const { selectedClipId, timeline, playbackPosition, isPlaying, setPlaying, setPlaybackPosition, selectClip } = useEditorStore()
  const { assets } = useMediaStore()

  const allClips = timeline.tracks.flatMap((t) => t.clips)
  const selectedClip = selectedClipId
    ? allClips.find((c) => c.id === selectedClipId)
    : allClips[0] || null
  const asset = selectedClip ? assets.find((a) => a.id === selectedClip.assetId) : null
  const clipKey = selectedClip ? `${selectedClip.id}-${selectedClip.sourceStart}` : 'empty'

  // Auto-select first clip
  useEffect(() => {
    if (allClips.length > 0 && !selectedClipId) {
      selectClip(allClips[0].id)
    }
  }, [allClips.length])

  // Set video source
  useEffect(() => {
    const video = videoRef.current
    if (!video || !asset) return
    video.src = `file://${asset.filePath}`
    video.load()
  }, [clipKey, asset?.filePath])

  // Seek after metadata loads
  const handleLoaded = useCallback(() => {
    if (videoRef.current && selectedClip) {
      videoRef.current.currentTime = selectedClip.sourceStart
    }
  }, [selectedClip])

  // Sync position → video (only paused)
  useEffect(() => {
    const video = videoRef.current
    if (!video || isPlaying) return
    if (Math.abs(video.currentTime - playbackPosition) > 0.5) {
      video.currentTime = playbackPosition
    }
  }, [playbackPosition, isPlaying])

  // Play/pause
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (isPlaying && video.paused && video.src) video.play().catch(() => {})
    else if (!isPlaying && !video.paused) video.pause()
  }, [isPlaying, clipKey])

  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current && isPlaying) setPlaybackPosition(videoRef.current.currentTime)
  }, [isPlaying, setPlaybackPosition])

  const handlePlay = useCallback(() => setPlaying(true), [setPlaying])
  const handlePause = useCallback(() => setPlaying(false), [setPlaying])
  const handleClick = useCallback(() => { if (videoRef.current?.src) setPlaying(!isPlaying) }, [isPlaying, setPlaying])

  return (
    <div className="flex-1 bg-black flex items-center justify-center overflow-hidden relative" onClick={handleClick}>
      {asset ? (
        <>
          <video key={clipKey} ref={videoRef} className="max-w-full max-h-full object-contain"
            onTimeUpdate={handleTimeUpdate} onPlay={handlePlay} onPause={handlePause}
            onLoadedMetadata={handleLoaded} />
          {!isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
              <div className="text-5xl opacity-70">▶️</div>
            </div>
          )}
        </>
      ) : allClips.length > 0 ? (
        <div className="text-center text-gray-500">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-400 border-t-transparent mx-auto mb-3" />
          <p className="text-sm">加载素材中...</p>
        </div>
      ) : (
        <div className="text-center text-gray-600">
          <div className="text-4xl mb-3">🎬</div>
          <p className="text-sm">导入素材并添加到时间轴开始编辑</p>
        </div>
      )}
    </div>
  )
}
