import { useEditorStore } from '../../stores/useEditorStore'

export function TransportControls(): JSX.Element {
  const { isPlaying, setPlaying, playbackPosition, setPlaybackPosition } = useEditorStore()

  const seek = (delta: number) => {
    const currentTime = playbackPosition
    const newTime = Math.max(0, currentTime + delta)
    // Find all video elements on the page and seek them
    const videos = document.querySelectorAll('video')
    for (const video of videos) {
      video.currentTime = newTime
    }
    setPlaybackPosition(newTime)
  }

  const togglePlay = () => setPlaying(!isPlaying)
  const skipBack = () => seek(-5)
  const skipForward = () => seek(5)
  const goToStart = () => seek(-playbackPosition)

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${String(sec).padStart(2, '0')}`
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-850 border-b border-gray-700">
      <button onClick={goToStart} className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-700 text-gray-400 text-sm" title="跳到开头">⏮</button>
      <button onClick={skipBack} className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-700 text-gray-400 text-sm" title="后退5秒">-5s</button>
      <button onClick={togglePlay} className="w-9 h-9 flex items-center justify-center rounded-full bg-blue-600 hover:bg-blue-500 text-white text-lg" title={isPlaying ? '暂停' : '播放'}>
        {isPlaying ? '⏸' : '▶'}
      </button>
      <button onClick={skipForward} className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-700 text-gray-400 text-sm" title="前进5秒">+5s</button>
      {/* Draggable scrubber */}
      <div className="flex-1 mx-2 relative">
        <input
          type="range"
          min={0}
          max={Math.max(playbackPosition + 10, 60)}
          step={0.1}
          value={playbackPosition}
          onChange={(e) => {
            const t = parseFloat(e.target.value)
            const videos = document.querySelectorAll('video')
            for (const v of videos) v.currentTime = t
            setPlaybackPosition(t)
          }}
          className="w-full h-1 appearance-none bg-gray-600 rounded-full outline-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-400"
        />
      </div>
      <span className="text-xs text-gray-500 tabular-nums min-w-[60px] text-right">{formatTime(playbackPosition)}</span>
    </div>
  )
}
