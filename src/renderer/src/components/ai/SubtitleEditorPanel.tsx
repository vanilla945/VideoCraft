import { useState } from 'react'
import { useSubtitleStore } from '../../stores/useSubtitleStore'
import { useEditorStore } from '../../stores/useEditorStore'
import type { SubtitleItem } from '@shared/types/subtitle'

export function SubtitleEditorPanel(): JSX.Element {
  const { subtitles, selectedSubtitleId, selectSubtitle, updateSubtitleText, removeSubtitles, removeSubtitle } =
    useSubtitleStore()
  const { setPlaybackPosition } = useEditorStore()
  const [showFillers, setShowFillers] = useState(true)
  const [batchMode, setBatchMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const visibleSubtitles = showFillers
    ? subtitles
    : subtitles.filter(s => !s.isFillerWord)

  const fillerCount = subtitles.filter(s => s.isFillerWord).length

  const handleToggleSubtitle = (id: string): void => {
    if (batchMode) {
      const next = new Set(selectedIds)
      next.has(id) ? next.delete(id) : next.add(id)
      setSelectedIds(next)
    } else {
      selectSubtitle(id === selectedSubtitleId ? null : id)
    }
  }

  const handleBatchRemove = (): void => {
    if (selectedIds.size > 0) {
      removeSubtitles(Array.from(selectedIds))
      setSelectedIds(new Set())
    }
  }

  const handleRemoveAllFillers = (): void => {
    const fillerIds = subtitles.filter(s => s.isFillerWord).map(s => s.id)
    if (fillerIds.length > 0) removeSubtitles(fillerIds)
  }

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${String(s).padStart(2, '0')}`
  }

  const handleClick = (sub: SubtitleItem): void => {
    handleToggleSubtitle(sub.id)
    setPlaybackPosition(sub.startTime)
  }

  if (subtitles.length === 0) return <></>

  return (
    <div className="bg-gray-800/40 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-400">📝 字幕编辑 ({visibleSubtitles.length} 条)</span>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer">
            <input
              type="checkbox"
              checked={showFillers}
              onChange={() => setShowFillers(!showFillers)}
              className="rounded"
            />
            显示填充词
          </label>
          {fillerCount > 0 && (
            <button
              onClick={handleRemoveAllFillers}
              className="text-xs text-red-400 hover:text-red-300"
            >
              删除全部填充词 ({fillerCount})
            </button>
          )}
          <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer">
            <input
              type="checkbox"
              checked={batchMode}
              onChange={() => { setBatchMode(!batchMode); setSelectedIds(new Set()) }}
              className="rounded"
            />
            批量模式
          </label>
          {batchMode && selectedIds.size > 0 && (
            <button onClick={handleBatchRemove} className="text-xs text-red-400 px-2 py-0.5 bg-red-500/10 rounded">
              删除选中 ({selectedIds.size})
            </button>
          )}
        </div>
      </div>

      <div className="max-h-[300px] overflow-y-auto space-y-0.5">
        {visibleSubtitles.map((sub) => (
          <div
            key={sub.id}
            onClick={() => handleClick(sub)}
            className={`flex items-center gap-2 px-2 py-1 rounded text-xs cursor-pointer transition-colors ${
              batchMode && selectedIds.has(sub.id)
                ? 'bg-red-500/20 border border-red-500/30'
                : selectedSubtitleId === sub.id
                  ? 'bg-blue-500/20 border border-blue-500/30'
                  : sub.isFillerWord
                    ? 'bg-red-500/10 text-red-300'
                    : 'hover:bg-gray-700/50 text-gray-300'
            }`}
          >
            {/* Time range */}
            <span className="text-gray-500 w-16 flex-shrink-0 tabular-nums">
              {formatTime(sub.startTime)}-{formatTime(sub.endTime)}
            </span>

            {/* Text (editable when selected) */}
            {selectedSubtitleId === sub.id && !batchMode ? (
              <input
                value={sub.text}
                onChange={(e) => updateSubtitleText(sub.id, e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="flex-1 bg-transparent border-b border-gray-600 focus:border-blue-400 outline-none text-white"
                autoFocus
              />
            ) : (
              <span className="flex-1 truncate">
                {sub.text}
                {sub.isFillerWord && (
                  <span className="text-red-400 ml-1 text-[10px]">填充词</span>
                )}
              </span>
            )}

            {/* Delete button */}
            <button
              onClick={(e) => { e.stopPropagation(); removeSubtitle(sub.id) }}
              className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
