import { useRef, useEffect, useCallback, useState } from 'react'
import { useEditorStore } from '../../stores/useEditorStore'
import { useMediaStore } from '../../stores/useMediaStore'

export function PreviewPane(): JSX.Element {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [videoReady, setVideoReady] = useState(false)
  const { selectedClipId, timeline, playbackPosition, isPlaying, setPlaying, setPlaybackPosition, selectClip } = useEditorStore()
  const { assets } = useMediaStore()

  const allClips = timeline.tracks.flatMap((t) => t.clips)
  const selectedClip = selectedClipId
    ? allClips.find((c) => c.id === selectedClipId)
    : allClips[0] || null
  const asset = selectedClip ? assets.find((a) => a.id === selectedClip.assetId) : null

  // Only track asset file changes — not source range changes
  const assetKey = asset?.filePath || 'none'
  const prevAssetRef = useRef<string | null>(null)

  // Auto-select first clip
  useEffect(() => {
    if (allClips.length > 0 && !selectedClipId) {
      selectClip(allClips[0].id)
    }
  }, [allClips.length])

  // Set video src ONLY when the actual video file changes
  useEffect(() => {
    const video = videoRef.current
    if (!video || !asset) return

    if (prevAssetRef.current !== asset.filePath) {
      prevAssetRef.current = asset.filePath
      setVideoReady(false)
      video.src = `file://${asset.filePath}`
      video.load()
    }
  }, [assetKey])

  // When clip changes or metadata loads, seek to correct position
  const handleLoaded = useCallback(() => {
    if (videoRef.current && selectedClip) {
      videoRef.current.currentTime = selectedClip.sourceStart
      setVideoReady(true)
    }
  }, [selectedClip])

  // When selected clip changes but same video file, just seek
  useEffect(() => {
    const video = videoRef.current
    if (!video || !selectedClip) return
    if (videoReady && prevAssetRef.current === asset?.filePath) {
      video.currentTime = selectedClip.sourceStart
    }
  }, [selectedClip?.id, selectedClip?.sourceStart, videoReady])

  // Sync position → video (only paused)
  useEffect(() => {
    const video = videoRef.current
    if (!video || isPlaying || !videoReady) return
    if (Math.abs(video.currentTime - playbackPosition) > 0.5) {
      video.currentTime = playbackPosition
    }
  }, [playbackPosition, isPlaying, videoReady])

  // Play/pause
  useEffect(() => {
    const video = videoRef.current
    if (!video || !videoReady) return
    if (isPlaying && video.paused && video.src) video.play().catch(() => {})
    else if (!isPlaying && !video.paused) video.pause()
  }, [isPlaying, videoReady])

  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current && isPlaying) setPlaybackPosition(videoRef.current.currentTime)
  }, [isPlaying, setPlaybackPosition])

  const handlePlay = useCallback(() => setPlaying(true), [setPlaying])
  const handlePause = useCallback(() => setPlaying(false), [setPlaying])
  const handleClick = useCallback(() => { if (videoRef.current?.src) setPlaying(!isPlaying) }, [isPlaying, setPlaying])

  const showSpinner = allClips.length > 0 && !videoReady

  return (
    <div className="flex-1 bg-black flex items-center justify-center overflow-hidden relative" onClick={handleClick}>
      {asset && (
        <video ref={videoRef} className="max-w-full max-h-full object-contain"
          onTimeUpdate={handleTimeUpdate} onPlay={handlePlay} onPause={handlePause}
          onLoadedMetadata={handleLoaded}
          style={{ display: videoReady ? 'block' : 'none' }} />
      )}

      {/* Loading spinner */}
      {showSpinner && asset && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-500 bg-black">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-400 border-t-transparent mx-auto mb-3" />
            <p className="text-sm">加载素材中...</p>
          </div>
        </div>
      )}

      {/* Pause overlay */}
      {!isPlaying && videoReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
          <div className="text-5xl opacity-70">▶️</div>
        </div>
      )}

      {/* Empty state */}
      {allClips.length === 0 && !asset && (
        <div className="text-center text-gray-600">
          <div className="text-4xl mb-3">🎬</div>
          <p className="text-sm">导入素材并添加到时间轴开始编辑</p>
        </div>
      )}
    </div>
  )
}
