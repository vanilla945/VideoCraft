import { useEditorStore } from '../../stores/useEditorStore'

export function TransportControls(): JSX.Element {
  const { isPlaying, setPlaying, playbackPosition, setPlaybackPosition } = useEditorStore()

  const togglePlay = () => setPlaying(!isPlaying)
  const skipBack = () => setPlaybackPosition(Math.max(0, playbackPosition - 5))
  const skipForward = () => setPlaybackPosition(playbackPosition + 5)
  const goToStart = () => setPlaybackPosition(0)

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
      <span className="text-xs text-gray-500 tabular-nums ml-2">{formatTime(playbackPosition)}</span>
    </div>
  )
}
