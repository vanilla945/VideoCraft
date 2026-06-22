import { useSubtitleStore } from '../../stores/useSubtitleStore'
import { useEditorStore } from '../../stores/useEditorStore'
import type { SubtitleItem } from '@shared/types/subtitle'

const PX_PER_SECOND = 80

export function SubtitleTrack(): JSX.Element {
  const { subtitles, isTranscribing, transcriptionError, selectedSubtitleId, selectSubtitle } =
    useSubtitleStore()
  const { playbackPosition } = useEditorStore()

  const handleSubtitleClick = (sub: SubtitleItem): void => {
    selectSubtitle(sub.id === selectedSubtitleId ? null : sub.id)
  }

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${String(s).padStart(2, '0')}`
  }

  if (isTranscribing) {
    return (
      <div className="flex items-center justify-center py-4 text-sm text-blue-400">
        <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-400 border-t-transparent mr-2" />
        正在转录语音...
      </div>
    )
  }

  if (transcriptionError) {
    return (
      <div className="flex items-center justify-center py-4 text-sm text-red-400">
        ⚠️ {transcriptionError}
      </div>
    )
  }

  if (subtitles.length === 0) {
    return (
      <div className="flex items-center justify-center py-4 text-sm text-gray-500">
        暂无字幕 — 导入视频后点击「转录」生成字幕
      </div>
    )
  }

  const timelineDuration = Math.max(
    ...subtitles.map((s) => s.endTime),
    30
  )
  const playbackIndicatorX = playbackPosition * PX_PER_SECOND

  return (
    <div className="subtitle-track bg-gray-800/40 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-400">
          字幕轨道 ({subtitles.length} 条)
        </span>
        <span className="text-xs text-gray-500">
          点击字幕可选中，删除字幕 = 切除对应视频
        </span>
      </div>

      <div className="relative overflow-x-auto" style={{ maxHeight: 120 }}>
        {/* Playback position indicator */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-red-400 z-10 pointer-events-none"
          style={{ left: `${playbackIndicatorX}px` }}
        />

        <div className="flex gap-1" style={{ minWidth: `${timelineDuration * PX_PER_SECOND}px` }}>
          {subtitles.map((sub) => {
            const left = sub.startTime * PX_PER_SECOND
            const width = Math.max((sub.endTime - sub.startTime) * PX_PER_SECOND, 40)

            return (
              <div
                key={sub.id}
                onClick={() => handleSubtitleClick(sub)}
                className={`absolute cursor-pointer rounded px-1.5 py-1 text-xs transition-colors truncate ${
                  sub.isFillerWord
                    ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                    : selectedSubtitleId === sub.id
                      ? 'bg-blue-500/30 text-blue-100 border border-blue-400'
                      : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700 border border-transparent'
                }`}
                style={{ left: `${left}px`, width: `${width}px` }}
                title={`${formatTime(sub.startTime)}-${formatTime(sub.endTime)}: ${sub.text}${sub.isFillerWord ? ' [填充词]' : ''}`}
              >
                {sub.isFillerWord && <span className="text-red-400 mr-1">⊗</span>}
                {sub.text.length > 20 ? sub.text.slice(0, 20) + '...' : sub.text}
              </div>
            )
          })}
        </div>
      </div>

      {/* Selected subtitle detail */}
      {selectedSubtitleId && (() => {
        const sub = subtitles.find(s => s.id === selectedSubtitleId)
        if (!sub) return null
        return (
          <div className="mt-2 p-2 bg-gray-700/50 rounded text-xs text-gray-300 flex items-center justify-between">
            <span>{sub.text}</span>
            <span className="text-gray-500">
              {formatTime(sub.startTime)} → {formatTime(sub.endTime)}
              {sub.isFillerWord && <span className="text-red-400 ml-1">填充词</span>}
            </span>
          </div>
        )
      })()}
    </div>
  )
}
