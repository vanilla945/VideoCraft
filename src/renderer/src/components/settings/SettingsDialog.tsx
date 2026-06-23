import { useState, useEffect } from 'react'
import { Dialog } from '../ui/Dialog'
import { Button } from '../ui/Button'

interface SettingsDialogProps {
  open: boolean
  onClose: () => void
}

interface ModelConfig {
  fastModelProvider: string
  fastModelName: string
  heavyModelProvider: string
  heavyModelName: string
  ttsProvider: string
  ttsModelName: string
  ttsVoice: string
  ttsLanguage: string
  imageProvider: string
  imageModelName: string
  imageMaxPerProject: number
  whisperModel: string
}

const PROVIDER_OPTIONS = [
  { value: 'deepseek', label: 'DeepSeek' },
  { value: 'minimax', label: 'Minimax' },
  { value: 'kimi', label: 'Kimi (可选)' },
]

const FAST_MODELS: Record<string, { value: string; label: string }[]> = {
  deepseek: [{ value: 'deepseek-v4-flash', label: 'DeepSeek-V4 Flash' }],
  minimax: [{ value: 'MiniMax-M3', label: 'Minimax-M3 (全模态)' }],
  kimi: [{ value: 'kimi-latest', label: 'Kimi-latest' }],
}

const HEAVY_MODELS: Record<string, { value: string; label: string }[]> = {
  deepseek: [{ value: 'deepseek-v4-pro', label: 'DeepSeek-V4 Pro' }],
  minimax: [{ value: 'MiniMax-M3', label: 'Minimax-M3 (全模态)' }],
  kimi: [{ value: 'kimi-latest', label: 'Kimi-latest' }],
}

const TTS_PROVIDERS = [
  { value: 'local', label: '本地 Edge-TTS (免费)' },
  { value: 'minimax', label: 'Minimax TTS' },
  { value: 'deepseek', label: 'DeepSeek TTS' },
]

const IMAGE_PROVIDERS = [
  { value: 'minimax', label: '开启 (Minimax Image)' },
  { value: 'none', label: '关闭' },
]

export function SettingsDialog({ open, onClose }: SettingsDialogProps): JSX.Element {
  const [config, setConfig] = useState<ModelConfig | null>(null)
  const [keyStatus, setKeyStatus] = useState<Record<string, 'configured' | 'missing'>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [cacheSize, setCacheSize] = useState<string>('')
  const [clearing, setClearing] = useState(false)

  useEffect(() => {
    if (open) {
      loadConfig()
    }
  }, [open])

  const loadConfig = async (): Promise<void> => {
    try {
      setLoading(true)
      const [cfg, keys, size] = await Promise.all([
        window.api.settings.getConfig(),
        window.api.settings.getKeyStatus(),
        window.api.app.getCacheSize().catch(() => ({ formatted: '未知' })),
      ])
      setConfig(cfg as ModelConfig)
      setKeyStatus(keys as Record<string, 'configured' | 'missing'>)
      setCacheSize(size.formatted)
    } catch (err) {
      console.error('加载配置失败:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleClearCache = async (): Promise<void> => {
    setClearing(true)
    try {
      const result = await window.api.app.clearCache()
      setCacheSize('0 B')
      alert(`已清空缓存文件 (${result.formatted})`)
    } catch (err) {
      console.error('清空缓存失败:', err)
    } finally {
      setClearing(false)
    }
  }

  const handleSave = async (): Promise<void> => {
    if (!config) return
    try {
      setSaving(true)
      for (const category of ['fast', 'heavy', 'tts', 'image'] as const) {
        const providerKey = category === 'fast' ? 'fastModelProvider'
          : category === 'heavy' ? 'heavyModelProvider'
          : category === 'tts' ? 'ttsProvider'
          : 'imageProvider'
        const modelKey = category === 'fast' ? 'fastModelName'
          : category === 'heavy' ? 'heavyModelName'
          : category === 'tts' ? 'ttsModelName'
          : 'imageModelName'

        await window.api.settings.updateModel(
          category,
          config[providerKey as keyof ModelConfig] as string,
          config[modelKey as keyof ModelConfig] as string
        )
      }
      onClose()
    } catch (err) {
      console.error('保存设置失败:', err)
    } finally {
      setSaving(false)
    }
  }

  const updateConfig = (key: keyof ModelConfig, value: string | number): void => {
    setConfig(prev => prev ? { ...prev, [key]: value } : prev)
  }

  if (!config) {
    return (
      <Dialog open={open} onClose={onClose} title="设置">
        <div className="text-center py-8 text-gray-400">
          {loading ? '加载中...' : '加载失败，请重启应用'}
        </div>
      </Dialog>
    )
  }

  const statusBadge = (key: string) => (
    <span className={`text-xs px-2 py-0.5 rounded-full ml-2 ${
      keyStatus[key] === 'configured'
        ? 'bg-green-500/20 text-green-400'
        : 'bg-red-500/20 text-red-400'
    }`}>
      {keyStatus[key] === 'configured' ? '已配置' : '未配置'}
    </span>
  )

  return (
    <Dialog open={open} onClose={onClose} title="设置">
      <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
        {/* API Keys Status */}
        <div>
          <label className="block text-sm text-gray-400 mb-2">API Keys 状态</label>
          <p className="text-xs text-gray-500 mb-2">
            配置来源: <code className="text-blue-400 bg-gray-700/50 px-1 rounded">.env</code> 文件
          </p>
          <div className="space-y-1 text-sm">
            <div className="flex items-center justify-between py-1 px-2 bg-gray-700/30 rounded">
              <span className="text-gray-300">DeepSeek</span>
              {statusBadge('deepseek')}
            </div>
            <div className="flex items-center justify-between py-1 px-2 bg-gray-700/30 rounded">
              <span className="text-gray-300">Minimax</span>
              {statusBadge('minimax')}
            </div>
            <div className="flex items-center justify-between py-1 px-2 bg-gray-700/30 rounded">
              <span className="text-gray-300">Minimax STT (语音转录)</span>
              {statusBadge('minimax_stt')}
            </div>
            <div className="flex items-center justify-between py-1 px-2 bg-gray-700/30 rounded">
              <span className="text-gray-300">Kimi</span>
              {statusBadge('kimi')}
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            要修改 Key，请编辑项目根目录下的 <code className="text-blue-400">.env</code> 文件后重启应用
          </p>
        </div>

        {/* Fast Model */}
        <div>
          <label className="block text-sm text-gray-300 mb-1">简单快速模型</label>
          <p className="text-xs text-gray-500 mb-1">文本纠错、字幕润色、片段打分、场景分类</p>
          <div className="flex gap-2">
            <select
              value={config.fastModelProvider}
              onChange={(e) => {
                updateConfig('fastModelProvider', e.target.value)
                const models = FAST_MODELS[e.target.value]
                if (models?.[0]) updateConfig('fastModelName', models[0].value)
              }}
              className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            >
              {PROVIDER_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <select
              value={config.fastModelName}
              onChange={(e) => updateConfig('fastModelName', e.target.value)}
              className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            >
              {(FAST_MODELS[config.fastModelProvider] || []).map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Heavy Model */}
        <div>
          <label className="block text-sm text-gray-300 mb-1">深度理解模型</label>
          <p className="text-xs text-gray-500 mb-1">全片结构分析、EDL方案、解说全文、深度视觉、终审</p>
          <div className="flex gap-2">
            <select
              value={config.heavyModelProvider}
              onChange={(e) => {
                updateConfig('heavyModelProvider', e.target.value)
                const models = HEAVY_MODELS[e.target.value]
                if (models?.[0]) updateConfig('heavyModelName', models[0].value)
              }}
              className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            >
              {PROVIDER_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <select
              value={config.heavyModelName}
              onChange={(e) => updateConfig('heavyModelName', e.target.value)}
              className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            >
              {(HEAVY_MODELS[config.heavyModelProvider] || []).map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* TTS Model */}
        <div>
          <label className="block text-sm text-gray-300 mb-1">TTS 模型</label>
          <p className="text-xs text-gray-500 mb-1">解说配音、多角色语音合成</p>
          <select
            value={config.ttsProvider}
            onChange={(e) => updateConfig('ttsProvider', e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 mb-2"
          >
            {TTS_PROVIDERS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          {config.ttsProvider === 'local' && (
            <div className="flex gap-2">
              <input
                value={config.ttsVoice}
                onChange={(e) => updateConfig('ttsVoice', e.target.value)}
                placeholder="音色"
                className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          )}
        </div>

        {/* Image Generation */}
        <div>
          <label className="block text-sm text-gray-300 mb-1">图像生成模型</label>
          <p className="text-xs text-gray-500 mb-1">封面图、B-roll 配图、插图生成</p>
          <select
            value={config.imageProvider}
            onChange={(e) => updateConfig('imageProvider', e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 mb-2"
          >
            {IMAGE_PROVIDERS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <div>
            <label className="text-xs text-gray-400">每项目最大生成张数</label>
            <input
              type="number"
              value={config.imageMaxPerProject}
              onChange={(e) => updateConfig('imageMaxPerProject', parseInt(e.target.value) || 10)}
              min={1}
              max={50}
              className="w-24 ml-2 bg-gray-700 border border-gray-600 rounded-lg px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Cache Management */}
        <div className="pt-2 border-t border-gray-700">
          <label className="block text-sm text-gray-400 mb-2">缓存管理</label>
          <div className="flex items-center justify-between bg-gray-700/30 rounded-lg px-3 py-2">
            <div>
              <p className="text-sm text-gray-300">
                缓存大小: <span className="text-white">{cacheSize || '计算中...'}</span>
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                包含缩略图、转录文件、临时导出、生成图片等
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleClearCache}
              disabled={clearing}
            >
              {clearing ? '清空中...' : '🗑 清空缓存'}
            </Button>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-gray-700">
          <Button variant="secondary" onClick={onClose}>取消</Button>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? '保存中...' : '保存设置'}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
