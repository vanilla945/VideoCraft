import { useState } from 'react'
import { useAIStore } from '../../stores/useAIStore'
import { EDITING_MODES, type EditingMode } from '@shared/types/editing-mode'
import type { MusicSource } from '@shared/types/creative-input'

const PRESETS = [
  { id: 'product-launch', name: '产品发布会', icon: '🚀', category: '商业' },
  { id: 'corporate', name: '企业宣传片', icon: '🏢', category: '商业' },
  { id: 'investor-pitch', name: '融资路演', icon: '💰', category: '商业' },
  { id: 'tutorial-course', name: '教程/课程', icon: '📚', category: '知识' },
  { id: 'science-doc', name: '科普纪录片', icon: '🎓', category: '知识' },
  { id: 'conference', name: '会议演讲', icon: '🎤', category: '知识' },
  { id: 'vlog-daily', name: 'Vlog/日常', icon: '🎬', category: '创作' },
  { id: 'product-review', name: '产品评测', icon: '📱', category: '创作' },
  { id: 'opinion', name: '口播/观点', icon: '💬', category: '创作' },
  { id: 'douyin-commerce', name: '抖音带货', icon: '🛒', category: '短视频' },
  { id: 'xiaohongshu', name: '小红书种草', icon: '📕', category: '短视频' },
  { id: 'emotional-story', name: '温情故事', icon: '🌸', category: '情感' },
]

const DURATION_OPTIONS = [
  { value: 0, label: '自动 (AI 自行判断)' },
  { value: 15, label: '15 秒 (短视频/广告)' },
  { value: 30, label: '30 秒 (抖音/快手)' },
  { value: 60, label: '60 秒 (小红书/视频号)' },
  { value: 180, label: '3 分钟 (B站/Shorts)' },
  { value: 300, label: '5 分钟 (知识科普)' },
  { value: 600, label: '10 分钟 (深度内容)' },
  { value: 900, label: '15 分钟 (讲座精简)' },
  { value: 1800, label: '30 分钟 (完整回放)' },
]

const CATEGORIES = ['商业', '知识', '创作', '短视频', '情感']

export function CreativeInputPanel(): JSX.Element {
  const store = useAIStore()
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [newKeyPoint, setNewKeyPoint] = useState('')
  const [newConstraint, setNewConstraint] = useState('')

  const handleAddKeyPoint = (): void => {
    if (!newKeyPoint.trim()) return
    store.setCustomKeyPoints([...store.customKeyPoints, newKeyPoint.trim()])
    setNewKeyPoint('')
  }

  const handleRemoveKeyPoint = (idx: number): void => {
    store.setCustomKeyPoints(store.customKeyPoints.filter((_, i) => i !== idx))
  }

  const handleAddConstraint = (constraint: string): void => {
    if (store.customConstraints.includes(constraint)) {
      store.setCustomConstraints(store.customConstraints.filter(c => c !== constraint))
    } else {
      store.setCustomConstraints([...store.customConstraints, constraint])
    }
  }

  return (
    <div className="flex flex-col gap-4 p-4 bg-gray-800/40 rounded-lg max-h-[calc(100vh-300px)] overflow-y-auto">
      {/* Title */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-200">🎬 AI 剪辑创意输入</h3>
        <button
          onClick={store.resetToDefault}
          className="text-xs text-gray-500 hover:text-gray-300"
        >
          恢复默认
        </button>
      </div>

      {/* Editing Mode Selector */}
      <div>
        <label className="block text-xs text-gray-400 mb-1">剪辑模式</label>
        <select
          value={store.editingMode}
          onChange={(e) => store.setEditingMode(e.target.value as EditingMode)}
          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
        >
          {EDITING_MODES.map(m => (
            <option key={m.id} value={m.id}>{m.icon} {m.name}</option>
          ))}
        </select>
        <p className="text-xs text-gray-500 mt-1">
          {EDITING_MODES.find(m => m.id === store.editingMode)?.description}
        </p>
      </div>

      {/* Style Presets Grid */}
      <div>
        <label className="block text-xs text-gray-400 mb-2">风格预设（一键选用）</label>
        {CATEGORIES.map(cat => (
          <div key={cat} className="mb-2">
            <span className="text-xs text-gray-500 ml-1">{cat}</span>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {PRESETS.filter(p => p.category === cat).map(p => (
                <button
                  key={p.id}
                  onClick={() => store.setSelectedPreset(p.id)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs transition-all ${
                    store.selectedPresetId === p.id
                      ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                      : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {p.icon} {p.name}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Music Source */}
      <div>
        <label className="block text-xs text-gray-400 mb-1">背景音乐</label>
        <select
          value={store.musicSource}
          onChange={(e) => store.setMusicSource(e.target.value as MusicSource)}
          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
        >
          <option value="auto">系统自动 (根据风格+视频内容匹配)</option>
          <option value="user">导入音乐... (导入后系统自动编排)</option>
          <option value="none">无音乐</option>
        </select>
      </div>

      {/* Advanced Custom */}
      <div>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-xs text-gray-400 hover:text-gray-200 flex items-center gap-1"
        >
          {showAdvanced ? '▼' : '▶'} 高级自定义（可选）
        </button>

        {showAdvanced && (
          <div className="mt-2 space-y-3 pl-2 border-l-2 border-gray-700">
            {/* Target Duration */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">目标视频时长</label>
              <select
                value={store.targetDuration}
                onChange={(e) => store.setTargetDuration(Number(e.target.value))}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              >
                {DURATION_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {/* Custom Topic */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">你的想法</label>
              <textarea
                value={store.customTopic}
                onChange={(e) => store.setCustomTopic(e.target.value)}
                placeholder="突出自研芯片性能优势，片尾引导预约..."
                rows={2}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 resize-none"
              />
            </div>

            {/* Key Points */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">关键信息点</label>
              <div className="flex gap-1 mb-1">
                <input
                  value={newKeyPoint}
                  onChange={(e) => setNewKeyPoint(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddKeyPoint()}
                  placeholder="添加关键信息点"
                  className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500"
                />
                <button onClick={handleAddKeyPoint} className="px-2 py-1 bg-blue-600 text-xs rounded-lg">+</button>
              </div>
              {store.customKeyPoints.map((p, i) => (
                <div key={i} className="flex items-center justify-between text-xs text-gray-300 py-0.5 px-2 bg-gray-700/30 rounded mb-1">
                  <span>• {p}</span>
                  <button onClick={() => handleRemoveKeyPoint(i)} className="text-red-400 ml-2">✕</button>
                </div>
              ))}
            </div>

            {/* Constraints */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">特殊要求</label>
              <div className="space-y-1">
                {['保留 CEO 讲话原声', '生成中英双语字幕', '避免使用竞品对比', '片头使用公司 logo'].map(c => (
                  <label key={c} className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={store.customConstraints.includes(c)}
                      onChange={() => handleAddConstraint(c)}
                      className="rounded bg-gray-700 border-gray-600"
                    />
                    {c}
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
