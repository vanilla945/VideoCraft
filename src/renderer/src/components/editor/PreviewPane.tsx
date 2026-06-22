import { useRef, useEffect, useCallback } from 'react'
import { useEditorStore } from '../../stores/useEditorStore'
import { useMediaStore } from '../../stores/useMediaStore'

export function PreviewPane(): JSX.Element {
  const videoRef = useRef<HTMLVideoElement>(null)
  const { selectedClipId, timeline, playbackPosition, isPlaying } = useEditorStore()
  const { assets } = useMediaStore()

  const selectedClip = timeline.tracks
    .flatMap((t) => t.clips)
    .find((c) => c.id === selectedClipId)

  const asset = selectedClip
    ? assets.find((a) => a.id === selectedClip.assetId)
    : null

  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      // Don't update position during seek to avoid feedback loop
    }
  }, [])

  const handlePlay = useCallback(() => {
    useEditorStore.getState().setPlaying(true)
  }, [])

  const handlePause = useCallback(() => {
    useEditorStore.getState().setPlaying(false)
  }, [])

  useEffect(() => {
    const video = videoRef.current
    if (!video || !asset) return

    if (Math.abs(video.currentTime - playbackPosition) > 0.5) {
      video.currentTime = playbackPosition
    }

    if (isPlaying && video.paused) {
      video.play().catch(() => {})
    } else if (!isPlaying && !video.paused) {
      video.pause()
    }
  }, [playbackPosition, isPlaying, asset])

  return (
    <div className="flex-1 bg-black flex items-center justify-center overflow-hidden">
      {asset ? (
        <video
          ref={videoRef}
          src={`file://${asset.filePath}`}
          className="max-w-full max-h-full object-contain"
          onTimeUpdate={handleTimeUpdate}
          onPlay={handlePlay}
          onPause={handlePause}
          controls={false}
        />
      ) : (
        <div className="text-center text-gray-600">
          <div className="text-4xl mb-3">🎬</div>
          <p className="text-sm">选择时间轴上的片段进行预览</p>
        </div>
      )}
    </div>
  )
}
