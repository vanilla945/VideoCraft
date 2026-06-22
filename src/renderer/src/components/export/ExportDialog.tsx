import { useExportStore } from '../../stores/useExportStore'
import { useProjectStore } from '../../stores/useProjectStore'
import { Dialog } from '../ui/Dialog'
import { Button } from '../ui/Button'

const PRESETS = [
  {
    name: '1080p H.264 (横屏)',
    resolution: { width: 1920, height: 1080 },
    codec: 'libx264' as const,
    format: 'mp4' as const,
    bitRate: 5000000,
    frameRate: 30,
    audioCodec: 'aac' as const,
    audioBitRate: 192000
  },
  {
    name: '1080p 竖屏 (9:16)',
    resolution: { width: 1080, height: 1920 },
    codec: 'libx264' as const,
    format: 'mp4' as const,
    bitRate: 5000000,
    frameRate: 30,
    audioCodec: 'aac' as const,
    audioBitRate: 192000
  }
]

export function ExportDialog(): JSX.Element {
  const { isDialogOpen, closeDialog, config, progress, setConfig, startExport, cancelExport } =
    useExportStore()
  const { project } = useProjectStore()

  if (!project || !config) return <></>

  const isRunning = progress?.status === 'running'

  return (
    <Dialog open={isDialogOpen} onClose={closeDialog} title="导出视频">
      <div className="space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">导出预设</label>
          <select
            value={JSON.stringify(config.preset)}
            onChange={(e) => {
              const preset = JSON.parse(e.target.value)
              setConfig({ ...config, preset, inPoint: 0, outPoint: project.timeline.duration || preset.frameRate * 10 })
            }}
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            disabled={isRunning}
          >
            {project.exportPresets.length > 0
              ? project.exportPresets.map((p, i) => (
                  <option key={i} value={JSON.stringify(p)}>
                    {p.name} ({p.resolution.width}×{p.resolution.height})
                  </option>
                ))
              : PRESETS.map((p, i) => (
                  <option key={i} value={JSON.stringify(p)}>
                    {p.name} ({p.resolution.width}×{p.resolution.height})
                  </option>
                ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">入点 (秒)</label>
            <input
              type="number"
              value={config.inPoint}
              onChange={(e) => setConfig({ ...config, inPoint: Number(e.target.value) })}
              min={0}
              max={config.outPoint}
              step={0.1}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              disabled={isRunning}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">出点 (秒)</label>
            <input
              type="number"
              value={config.outPoint}
              onChange={(e) => setConfig({ ...config, outPoint: Number(e.target.value) })}
              min={config.inPoint + 0.5}
              max={project.timeline.duration || 9999}
              step={0.1}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              disabled={isRunning}
            />
          </div>
        </div>

        {progress && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-gray-400">
                {progress.status === 'running' && '正在导出...'}
                {progress.status === 'completed' && '导出完成!'}
                {progress.status === 'failed' && '导出失败'}
              </span>
              {progress.percent > 0 && (
                <span className="text-sm text-gray-400">{Math.round(progress.percent)}%</span>
              )}
            </div>
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 rounded-full ${
                  progress.status === 'completed' ? 'bg-green-500' :
                  progress.status === 'failed' ? 'bg-red-500' :
                  'bg-blue-500'
                }`}
                style={{ width: `${Math.max(progress.percent, 2)}%` }}
              />
            </div>
            {progress.error && (
              <p className="text-xs text-red-400 mt-1">{progress.error}</p>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4">
          {isRunning ? (
            <Button variant="secondary" onClick={cancelExport}>
              取消导出
            </Button>
          ) : (
            <>
              <Button variant="secondary" onClick={closeDialog}>
                关闭
              </Button>
              <Button variant="primary" onClick={startExport}>
                选择路径并导出
              </Button>
            </>
          )}
        </div>
      </div>
    </Dialog>
  )
}
