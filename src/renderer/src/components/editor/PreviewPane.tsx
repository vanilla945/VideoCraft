import { useRef, useEffect, useCallback, useState } from 'react'
import { useEditorStore } from '../../stores/useEditorStore'
import { useMediaStore } from '../../stores/useMediaStore'

export function PreviewPane(): JSX.Element {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [videoSrc, setVideoSrc] = useState<string>('')
  const [videoReady, setVideoReady] = useState(false)
  const readyRef = useRef(false)
  const { selectedClipId, timeline, playbackPosition, isPlaying, setPlaying, setPlaybackPosition, selectClip } = useEditorStore()
  const { assets } = useMediaStore()

  const allClips = timeline.tracks.flatMap((t) => t.clips)
  const selectedClip = selectedClipId
    ? allClips.find((c) => c.id === selectedClipId)
    : allClips[0] || null
  const asset = selectedClip ? assets.find((a) => a.id === selectedClip.assetId) : null

  // Auto-select first clip
  useEffect(() => {
    if (allClips.length > 0 && !selectedClipId) {
      selectClip(allClips[0].id)
    }
  }, [allClips.length])

  // Load video when asset file changes
  useEffect(() => {
    if (!asset) return
    const src = `file://${asset.filePath}`
    if (videoSrc === src) return // already loaded

    setVideoSrc(src)
    setVideoReady(false)
    readyRef.current = false

    const video = videoRef.current
    if (!video) return
    video.src = src
    video.load()
  }, [asset?.filePath])

  // When metadata loaded
  const handleLoaded = useCallback(() => {
    readyRef.current = true
    setVideoReady(true)
    if (videoRef.current && selectedClip) {
      videoRef.current.currentTime = selectedClip.sourceStart
    }
  }, [selectedClip])

  // When clip/seek position changes but same video, just seek
  useEffect(() => {
    const video = videoRef.current
    if (!video || !selectedClip || !readyRef.current) return
    if (Math.abs(video.currentTime - selectedClip.sourceStart) > 0.3) {
      video.currentTime = selectedClip.sourceStart
    }
  }, [selectedClip?.id, selectedClip?.sourceStart])

  // Sync playback position from store → video (only paused)
  useEffect(() => {
    const video = videoRef.current
    if (!video || isPlaying || !readyRef.current) return
    if (Math.abs(video.currentTime - playbackPosition) > 0.5) {
      video.currentTime = playbackPosition
    }
  }, [playbackPosition, isPlaying])

  // Play/pause
  useEffect(() => {
    const video = videoRef.current
    if (!video || !readyRef.current) return
    if (isPlaying && video.paused && video.src) video.play().catch(() => {})
    else if (!isPlaying && !video.paused) video.pause()
  }, [isPlaying])

  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current && isPlaying) setPlaybackPosition(videoRef.current.currentTime)
  }, [isPlaying, setPlaybackPosition])

  const handlePlay = useCallback(() => setPlaying(true), [setPlaying])
  const handlePause = useCallback(() => setPlaying(false), [setPlaying])
  const handleClick = useCallback(() => { if (videoRef.current?.src) setPlaying(!isPlaying) }, [isPlaying, setPlaying])

  return (
    <div className="flex-1 bg-black flex items-center justify-center overflow-hidden relative" onClick={handleClick}>
      {asset && (
        <video ref={videoRef} className="max-w-full max-h-full object-contain"
          onTimeUpdate={handleTimeUpdate} onPlay={handlePlay} onPause={handlePause}
          onLoadedMetadata={handleLoaded}
          style={{ display: videoReady ? 'block' : 'none' }} />
      )}

      {/* Loading */}
      {asset && !videoReady && (
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

      {/* Empty */}
      {allClips.length === 0 && !asset && (
        <div className="text-center text-gray-600">
          <div className="text-4xl mb-3">🎬</div>
          <p className="text-sm">导入素材并添加到时间轴开始编辑</p>
        </div>
      )}
    </div>
  )
}
