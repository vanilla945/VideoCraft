import { useState } from 'react'
import { useExportStore } from '../../stores/useExportStore'
import { useProjectStore } from '../../stores/useProjectStore'
import { Dialog } from '../ui/Dialog'
import { Button } from '../ui/Button'

const VIDEO_PRESETS = [
  { id: '4k-landscape', name: '4K 横屏', res: '3840×2160', codec: 'H.265', bitrate: '20 Mbps', fps: 30, desc: '高品质存档' },
  { id: '1080p-landscape', name: '1080p 横屏', res: '1920×1080', codec: 'H.264', bitrate: '8 Mbps', fps: 30, desc: 'YouTube/B站' },
  { id: '1080p-portrait', name: '1080p 竖屏', res: '1080×1920', codec: 'H.264', bitrate: '5 Mbps', fps: 30, desc: '抖音/快手' },
  { id: '1080p-square', name: '1080p 方形', res: '1080×1080', codec: 'H.264', bitrate: '4 Mbps', fps: 30, desc: 'Instagram' },
  { id: '720p-landscape', name: '720p 横屏', res: '1280×720', codec: 'H.264', bitrate: '3 Mbps', fps: 30, desc: '移动端' },
  { id: '480p-landscape', name: '480p 横屏', res: '854×480', codec: 'H.264', bitrate: '1 Mbps', fps: 24, desc: '极速预览' },
]

const AUDIO_PRESETS = [
  { id: 'wav-lossless', name: 'WAV 无损', format: 'wav', bitrate: 'PCM 24bit', desc: '播客母带' },
  { id: 'mp3-high', name: 'MP3 高质量', format: 'mp3', bitrate: '320 kbps', desc: '音频分发' },
]

const NLE_PRESETS = [
  { id: 'nle-premiere', name: 'Premiere Pro XML', format: '.xml', desc: 'Adobe Premiere' },
  { id: 'nle-resolve', name: 'DaVinci Resolve', format: '.fcpxml', desc: 'DaVinci/FCP' },
]

export function ExportDialog(): JSX.Element {
  const { isDialogOpen, closeDialog, config, progress, setConfig, startExport, cancelExport } =
    useExportStore()
  const { project } = useProjectStore()
  const [selectedVideo, setSelectedVideo] = useState<string[]>([VIDEO_PRESETS[1].id])
  const [selectedAudio, setSelectedAudio] = useState<string[]>([])
  const [selectedNLE, setSelectedNLE] = useState<string[]>([])

  if (!project || !config) return <></>

  const isRunning = progress?.status === 'running'

  const toggle = (arr: string[], id: string, setter: (v: string[]) => void) => {
    setter(arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id])
  }

  // When user picks a video preset, update the export config
  const handleSelectVideo = (presetId: string) => {
    const p = VIDEO_PRESETS.find(x => x.id === presetId)
    if (!p) return
    const [w, h] = p.res.split('×').map(Number)
    const codecMap: Record<string, 'libx264' | 'libx265' | 'h264_videotoolbox'> = {
      'H.264': 'libx264', 'H.265': 'libx265',
    }
    const formatMap: Record<string, 'mp4' | 'mov' | 'webm'> = { 'mp4': 'mp4' }

    setConfig({
      ...config,
      preset: {
        name: `${p.name} — ${p.desc}`,
        resolution: { width: w || 1920, height: h || 1080 },
        codec: codecMap[p.codec] || 'libx264',
        format: 'mp4',
        bitRate: parseInt(p.bitrate.replace(/[^0-9]/g, '')) * 1000000 || 8000000,
        frameRate: p.fps || 30,
        audioCodec: 'aac',
        audioBitRate: 192000,
      },
      inPoint: 0,
      outPoint: project.timeline.duration || 30,
    })
  }

  return (
    <Dialog open={isDialogOpen} onClose={closeDialog} title="导出视频">
      <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">

        {/* Video Presets */}
        <div>
          <label className="block text-sm text-gray-400 mb-2">📹 视频导出（可多选）</label>
          <div className="space-y-1.5">
            {VIDEO_PRESETS.map(p => (
              <label key={p.id} className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer border transition-colors ${
                selectedVideo.includes(p.id) ? 'bg-blue-500/10 border-blue-500/40' : 'bg-gray-700/30 border-gray-600/30 hover:bg-gray-700/50'
              }`}>
                <input
                  type="checkbox"
                  checked={selectedVideo.includes(p.id)}
                  onChange={() => {
                    toggle(selectedVideo, p.id, setSelectedVideo)
                    if (!selectedVideo.includes(p.id)) handleSelectVideo(p.id)
                  }}
                  disabled={isRunning}
                  className="rounded"
                />
                <div className="flex-1">
                  <span className="text-sm text-white">{p.name}</span>
                  <span className="text-xs text-gray-500 ml-2">{p.desc}</span>
                </div>
                <div className="text-xs text-gray-500 text-right">
                  <div>{p.res} · {p.codec} · {p.bitrate}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Audio Presets */}
        <div>
          <label className="block text-sm text-gray-400 mb-2">🎵 纯音频导出</label>
          <div className="space-y-1.5">
            {AUDIO_PRESETS.map(p => (
              <label key={p.id} className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer border transition-colors ${
                selectedAudio.includes(p.id) ? 'bg-green-500/10 border-green-500/40' : 'bg-gray-700/30 border-gray-600/30 hover:bg-gray-700/50'
              }`}>
                <input type="checkbox" checked={selectedAudio.includes(p.id)} onChange={() => toggle(selectedAudio, p.id, setSelectedAudio)} disabled={isRunning} className="rounded" />
                <div className="flex-1">
                  <span className="text-sm text-white">{p.name}</span>
                  <span className="text-xs text-gray-500 ml-2">{p.desc}</span>
                </div>
                <div className="text-xs text-gray-500">{p.format} · {p.bitrate}</div>
              </label>
            ))}
          </div>
        </div>

        {/* NLE Export */}
        <div>
          <label className="block text-sm text-gray-400 mb-2">🎬 专业软件工程文件 (NLE)</label>
          <p className="text-xs text-gray-500 mb-2">导出时间线到专业剪辑软件继续精修</p>
          <div className="space-y-1.5">
            {NLE_PRESETS.map(p => (
              <label key={p.id} className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer border transition-colors ${
                selectedNLE.includes(p.id) ? 'bg-purple-500/10 border-purple-500/40' : 'bg-gray-700/30 border-gray-600/30 hover:bg-gray-700/50'
              }`}>
                <input type="checkbox" checked={selectedNLE.includes(p.id)} onChange={() => toggle(selectedNLE, p.id, setSelectedNLE)} disabled={isRunning} className="rounded" />
                <div className="flex-1">
                  <span className="text-sm text-white">{p.name}</span>
                  <span className="text-xs text-gray-500 ml-2">{p.desc}</span>
                </div>
                <span className="text-xs text-gray-500">{p.format}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Progress */}
        {progress && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-gray-400">
                {progress.status === 'running' && '正在导出...'}
                {progress.status === 'completed' && '导出完成!'}
                {progress.status === 'failed' && '导出失败'}
              </span>
              {progress.percent > 0 && <span className="text-sm text-gray-400">{Math.round(progress.percent)}%</span>}
            </div>
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
              <div className={`h-full transition-all duration-300 rounded-full ${
                progress.status === 'completed' ? 'bg-green-500' : progress.status === 'failed' ? 'bg-red-500' : 'bg-blue-500'
              }`} style={{ width: `${Math.max(progress.percent, 2)}%` }} />
            </div>
            {progress.error && <p className="text-xs text-red-400 mt-1">{progress.error}</p>}
          </div>
        )}

        {/* Selection summary */}
        <div className="text-xs text-gray-500 bg-gray-700/30 rounded-lg px-3 py-2">
          已选: {selectedVideo.length} 个视频格式 · {selectedAudio.length} 个音频格式 · {selectedNLE.length} 个工程文件
          {selectedVideo.length + selectedAudio.length + selectedNLE.length > 1 && (
            <span className="text-blue-400 ml-1">（将导出多个文件）</span>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-gray-700">
          {isRunning ? (
            <Button variant="secondary" onClick={cancelExport}>取消导出</Button>
          ) : (
            <>
              <Button variant="secondary" onClick={closeDialog}>关闭</Button>
              <Button variant="primary" onClick={startExport} disabled={selectedVideo.length + selectedAudio.length + selectedNLE.length === 0}>
                选择路径并导出
              </Button>
            </>
          )}
        </div>
      </div>
    </Dialog>
  )
}
