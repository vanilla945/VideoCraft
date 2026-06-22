import { useState } from 'react'
import { useSubtitleStore } from '../../stores/useSubtitleStore'
import { useEditorStore } from '../../stores/useEditorStore'
import type { SubtitleItem } from '@shared/types/subtitle'

export function SubtitleEditorPanel(): JSX.Element {
  const {
    subtitles, selectedSubtitleId, selectSubtitle,
    updateSubtitleText, updateSubtitleTime, removeSubtitles, removeSubtitle,
  } = useSubtitleStore()
  const { setPlaybackPosition } = useEditorStore()
  const [showFillers, setShowFillers] = useState(true)

  const visibleSubtitles = showFillers ? subtitles : subtitles.filter(s => !s.isFillerWord)
  const fillerCount = subtitles.filter(s => s.isFillerWord).length

  const handleRemoveAllFillers = (): void => {
    const fillerIds = subtitles.filter(s => s.isFillerWord).map(s => s.id)
    if (fillerIds.length > 0) removeSubtitles(fillerIds)
  }

  const handleClick = (sub: SubtitleItem): void => {
    selectSubtitle(sub.id === selectedSubtitleId ? null : sub.id)
    setPlaybackPosition(sub.startTime)
  }

  const formatTime = (s: number): string => {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${String(sec).padStart(2, '0')}`
  }

  const selectedSub = selectedSubtitleId ? subtitles.find(s => s.id === selectedSubtitleId) : null

  if (subtitles.length === 0) return <></>

  return (
    <div className="bg-gray-800/40 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-400">📝 字幕编辑 ({subtitles.length} 条{selectedSubtitleId ? ', 1 条选中' : ''})</span>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer">
            <input type="checkbox" checked={showFillers} onChange={() => setShowFillers(!showFillers)} className="rounded" />
            显示填充词
          </label>
          {fillerCount > 0 && (
            <button onClick={handleRemoveAllFillers} className="text-xs text-red-400 hover:text-red-300">
              删全部填充词 ({fillerCount})
            </button>
          )}
          <span className="text-xs text-gray-500">点击行选中，双击时间或文本可编辑</span>
        </div>
      </div>

      {/* Selected subtitle detail editor */}
      {selectedSub && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-2 mb-2 space-y-2">
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-400 w-8">时间</label>
            <input
              type="number"
              value={selectedSub.startTime}
              onChange={(e) => {
                const v = Math.max(0, parseFloat(e.target.value) || 0)
                updateSubtitleTime(selectedSub.id, v, Math.max(v + 0.5, selectedSub.endTime))
              }}
              step={0.1}
              min={0}
              className="w-16 bg-gray-700 border border-gray-600 rounded px-2 py-0.5 text-xs text-white text-center"
            />
            <span className="text-gray-500">→</span>
            <input
              type="number"
              value={selectedSub.endTime}
              onChange={(e) => {
                const v = Math.max(selectedSub.startTime + 0.1, parseFloat(e.target.value) || selectedSub.startTime + 0.5)
                updateSubtitleTime(selectedSub.id, selectedSub.startTime, v)
              }}
              step={0.1}
              className="w-16 bg-gray-700 border border-gray-600 rounded px-2 py-0.5 text-xs text-white text-center"
            />
            <span className="text-xs text-gray-500 ml-1">
              (持续 {Math.round((selectedSub.endTime - selectedSub.startTime) * 10) / 10}s)
            </span>
            {selectedSub.isFillerWord && <span className="text-xs text-red-400 ml-auto">填充词</span>}
            <span className="text-xs text-gray-500 ml-auto">置信度: {Math.round(selectedSub.confidence * 100)}%</span>
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">文本</label>
            <input
              value={selectedSub.text}
              onChange={(e) => updateSubtitleText(selectedSub.id, e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-blue-400"
              autoFocus
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setPlaybackPosition(selectedSub.startTime)
                useEditorStore.getState().setPlaying(true)
              }}
              className="text-xs px-2 py-0.5 bg-gray-700 hover:bg-gray-600 rounded text-gray-300"
            >
              ▶ 播放此段
            </button>
            <button
              onClick={() => { removeSubtitle(selectedSub.id) }}
              className="text-xs px-2 py-0.5 bg-red-500/20 hover:bg-red-500/30 rounded text-red-300"
            >
              ✕ 删除
            </button>
          </div>
        </div>
      )}

      {/* Subtitle list */}
      <div className="max-h-[200px] overflow-y-auto space-y-0.5">
        {visibleSubtitles.map((sub) => (
          <div
            key={sub.id}
            onClick={() => handleClick(sub)}
            className={`flex items-center gap-2 px-2 py-1 rounded text-xs cursor-pointer transition-colors ${
              selectedSubtitleId === sub.id
                ? 'bg-blue-500/20 border border-blue-500/30'
                : sub.isFillerWord
                  ? 'bg-red-500/10 text-red-300'
                  : 'hover:bg-gray-700/50 text-gray-300'
            }`}
          >
            <span className="text-gray-500 w-16 flex-shrink-0 tabular-nums">
              {formatTime(sub.startTime)}-{formatTime(sub.endTime)}
            </span>
            <span className="flex-1 truncate">{sub.text}</span>
            {sub.isFillerWord && <span className="text-red-400 text-[10px] ml-1">填充</span>}
            <button
              onClick={(e) => { e.stopPropagation(); removeSubtitle(sub.id) }}
              className="text-gray-600 hover:text-red-400 ml-1"
            >✕</button>
          </div>
        ))}
      </div>
    </div>
  )
}
