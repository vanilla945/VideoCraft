import { useRef, useEffect, useCallback, useState } from 'react'
import { useEditorStore } from '../../stores/useEditorStore'
import { useMediaStore } from '../../stores/useMediaStore'

export function PreviewPane(): JSX.Element {
  const videoRef = useRef<HTMLVideoElement>(null)
  const { selectedClipId, timeline, playbackPosition, isPlaying, setPlaying, setPlaybackPosition, selectClip } = useEditorStore()
  const { assets } = useMediaStore()

  // All clips on timeline
  const allClips = timeline.tracks.flatMap((t) => t.clips)

  // Find current clip — selected first, then first available
  const selectedClip = selectedClipId
    ? allClips.find((c) => c.id === selectedClipId)
    : allClips[0] || null

  const asset = selectedClip
    ? assets.find((a) => a.id === selectedClip.assetId)
    : null

  // Persistent key: forces video element remount when clip source changes
  const clipKey = selectedClip ? `${selectedClip.id}-${selectedClip.sourceStart}` : 'empty'

  // Auto-select first clip when clips are added to timeline
  useEffect(() => {
    if (allClips.length > 0 && !selectedClipId) {
      selectClip(allClips[0].id)
    }
  }, [allClips.length])

  // Set video source and seek
  useEffect(() => {
    const video = videoRef.current
    if (!video || !asset) return

    const src = `file://${asset.filePath}`
    video.src = src
    video.load()
    video.currentTime = selectedClip?.sourceStart || 0
  }, [clipKey, asset?.filePath])

  // Sync playback position from store → video (only when not playing)
  useEffect(() => {
    const video = videoRef.current
    if (!video || isPlaying) return
    if (Math.abs(video.currentTime - playbackPosition) > 0.5) {
      video.currentTime = playbackPosition
    }
  }, [playbackPosition, isPlaying])

  // Sync play/pause
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (isPlaying && video.paused && video.src) {
      video.play().catch(() => {})
    } else if (!isPlaying && !video.paused) {
      video.pause()
    }
  }, [isPlaying, clipKey])

  // Forward video events → store
  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current && isPlaying) {
      setPlaybackPosition(videoRef.current.currentTime)
    }
  }, [isPlaying, setPlaybackPosition])

  const handlePlay = useCallback(() => setPlaying(true), [setPlaying])
  const handlePause = useCallback(() => setPlaying(false), [setPlaying])

  // Click canvas to play/pause
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
      {asset ? (
        <>
          <video
            key={clipKey}
            ref={videoRef}
            className="max-w-full max-h-full object-contain"
            onTimeUpdate={handleTimeUpdate}
            onPlay={handlePlay}
            onPause={handlePause}
            onLoadedMetadata={() => {
              // Seek to clip start position after metadata loads
              if (videoRef.current && selectedClip) {
                videoRef.current.currentTime = selectedClip.sourceStart
              }
            }}
            onError={() => {
              // Keep video element but show error state
            }}
          />
          {/* Play overlay when paused */}
          {!isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 cursor-pointer pointer-events-none">
              <div className="text-5xl opacity-70">▶️</div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center text-gray-600">
          <div className="text-4xl mb-3">
            {allClips.length > 0 ? '▶️' : '🎬'}
          </div>
          <p className="text-sm">
            {allClips.length > 0
              ? '点击时间轴片段选择预览'
              : '导入素材并添加到时间轴开始编辑'}
          </p>
        </div>
      )}
    </div>
  )
}
