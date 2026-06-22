import { useState } from 'react'
import { DEFAULT_SUBTITLE_STYLE, type SubtitleStyle } from '@shared/types/subtitle'

interface SubtitleStyleProps {
  onChange?: (style: SubtitleStyle) => void
}

const FONT_FAMILIES = [
  'PingFang SC, Microsoft YaHei, sans-serif',
  'SimHei, sans-serif',
  'KaiTi, serif',
  'FangSong, serif',
  'handwriting, cursive',
]

const COLORS = ['#FFFFFF', '#FFFF00', '#00FF00', '#00FFFF', '#FF6B6B', '#FFD93D']

export function SubtitleStyleEditor({ onChange }: SubtitleStyleProps): JSX.Element {
  const [style, setStyle] = useState<SubtitleStyle>(DEFAULT_SUBTITLE_STYLE)

  const update = (partial: Partial<SubtitleStyle>): void => {
    const next = { ...style, ...partial }
    setStyle(next)
    onChange?.(next)
  }

  return (
    <div className="bg-gray-800/40 rounded-lg p-3 space-y-3">
      <h4 className="text-xs text-gray-400 flex items-center justify-between">
        <span>📝 字幕样式</span>
        <button
          onClick={() => { setStyle(DEFAULT_SUBTITLE_STYLE); onChange?.(DEFAULT_SUBTITLE_STYLE) }}
          className="text-gray-500 hover:text-gray-300"
        >
          恢复默认
        </button>
      </h4>

      <div className="grid grid-cols-2 gap-2">
        {/* Font Size */}
        <div>
          <label className="text-xs text-gray-500">字号</label>
          <input
            type="range"
            min={14}
            max={48}
            value={style.fontSize}
            onChange={(e) => update({ fontSize: Number(e.target.value) })}
            className="w-full"
          />
          <span className="text-xs text-gray-400">{style.fontSize}px</span>
        </div>

        {/* Position */}
        <div>
          <label className="text-xs text-gray-500">位置</label>
          <select
            value={style.position}
            onChange={(e) => update({ position: e.target.value as SubtitleStyle['position'] })}
            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-white"
          >
            <option value="bottom">底部</option>
            <option value="top">顶部</option>
            <option value="center">居中</option>
          </select>
        </div>

        {/* Alignment */}
        <div>
          <label className="text-xs text-gray-500">对齐</label>
          <select
            value={style.alignment}
            onChange={(e) => update({ alignment: e.target.value as SubtitleStyle['alignment'] })}
            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-white"
          >
            <option value="center">居中</option>
            <option value="left">左对齐</option>
            <option value="right">右对齐</option>
          </select>
        </div>

        {/* Margin Bottom */}
        <div>
          <label className="text-xs text-gray-500">底边距</label>
          <input
            type="number"
            value={style.marginBottom}
            onChange={(e) => update({ marginBottom: Number(e.target.value) })}
            min={10}
            max={200}
            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-white"
          />
        </div>
      </div>

      {/* Font Color */}
      <div>
        <label className="text-xs text-gray-500 mb-1 block">字体颜色</label>
        <div className="flex gap-1.5">
          {COLORS.map(c => (
            <button
              key={c}
              onClick={() => update({ fontColor: c })}
              className="w-6 h-6 rounded-full border-2 transition-all"
              style={{
                backgroundColor: c,
                borderColor: style.fontColor === c ? '#3B82F6' : 'transparent',
                transform: style.fontColor === c ? 'scale(1.2)' : 'scale(1)',
              }}
            />
          ))}
        </div>
      </div>

      {/* Preview */}
      <div className="bg-black/50 rounded p-3 relative" style={{ minHeight: 60 }}>
        <p
          className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-1 rounded"
          style={{
            fontFamily: style.fontFamily,
            fontSize: `${style.fontSize}px`,
            color: style.fontColor,
            backgroundColor: style.backgroundColor,
            textAlign: style.alignment,
            ...(style.position === 'bottom' ? { bottom: `${style.marginBottom / 6}px` }
              : style.position === 'top' ? { top: `${style.marginBottom / 6}px` }
              : { top: '50%', transform: 'translate(-50%, -50%)' }),
          }}
        >
          预览效果 ABC 123
        </p>
      </div>
    </div>
  )
}
