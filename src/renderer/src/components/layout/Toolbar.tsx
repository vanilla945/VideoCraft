import { useState, useCallback } from 'react'
import { useProjectStore } from '../../stores/useProjectStore'
import { useMediaStore } from '../../stores/useMediaStore'
import { useEditorStore } from '../../stores/useEditorStore'
import { useExportStore } from '../../stores/useExportStore'
import { useSubtitleStore } from '../../stores/useSubtitleStore'
import { ProjectSettingsDialog } from '../project/ProjectSettings'
import { ExportDialog } from '../export/ExportDialog'
import { SettingsDialog } from '../settings/SettingsDialog'

interface ToolbarProps {
  onToggleAI?: () => void
  onToggleChat?: () => void
  onAIEdit?: () => void
  showChat?: boolean
  isEditing?: boolean
  hasSubtitles?: boolean
  showAIPanel?: boolean
}

export function Toolbar({ onToggleAI, onToggleChat, onAIEdit, showChat, isEditing, hasSubtitles, showAIPanel }: ToolbarProps): JSX.Element {
  const [showProjectDialog, setShowProjectDialog] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const { project, createProject, saveProject, saveProjectAs, loadProject } = useProjectStore()
  const { importMedia } = useMediaStore()
  const { openDialog: openExport } = useExportStore()
  const { assets } = useMediaStore()
  const { startTranscription, isTranscribing } = useSubtitleStore()
  const { isPlaying, setPlaying, selectClip, timeline } = useEditorStore()

  // Preview: toggle play/pause, select first clip if none selected
  const handlePreview = useCallback(() => {
    const allClips = timeline.tracks.flatMap(t => t.clips)
    if (allClips.length === 0) return
    const { selectedClipId } = useEditorStore.getState()
    if (!selectedClipId) {
      selectClip(allClips[0].id)
    }
    setPlaying(!isPlaying)
  }, [isPlaying, setPlaying, selectClip, timeline])

  const handleNewProject = async (): Promise<void> => {
    setShowProjectDialog(true)
  }

  const handleOpenProject = async (): Promise<void> => {
    const files = await window.api.dialog.openFile([
      { name: 'VideoCraft Project', extensions: ['vcraft'] }])
    if (files.length > 0) await loadProject(files[0])
  }

  const handleTranscribe = useCallback(async () => {
    const videoAssets = assets.filter(a => a.mediaType === 'video')
    if (videoAssets.length === 0) return
    // Transcribe ALL video assets sequentially
    for (const asset of videoAssets) {
      await startTranscription(asset.filePath, 'zh')
    }
  }, [assets, startTranscription])

  const handleAIEditWithTranscribe = useCallback(async () => {
    if (!hasSubtitles && !isTranscribing) {
      const videoAssets = assets.filter(a => a.mediaType === 'video')
      if (videoAssets.length > 0) {
        for (const asset of videoAssets) {
          await startTranscription(asset.filePath, 'zh')
        }
        return
      }
    }
    onAIEdit?.()
  }, [hasSubtitles, isTranscribing, assets, startTranscription, onAIEdit])

  const hasVideo = assets.filter(a => a.mediaType === 'video').length > 0

  return (
    <div className="flex items-center gap-2 pl-20 pr-4 py-2 bg-gray-850 border-b border-gray-700 toolbar-drag" style={{ paddingLeft: '80px' }}>
      {/* Left: project management */}
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" onClick={handleNewProject}>新建</Button>
        <Button variant="ghost" size="sm" onClick={handleOpenProject}>打开</Button>
        {project && (
          <>
            <Button variant="ghost" size="sm" onClick={saveProject}>保存</Button>
            <span className="text-gray-600 mx-1">|</span>
          </>
        )}
      </div>

      {/* Center: workflow steps */}
      <div className="flex-1 flex items-center justify-center gap-1.5">
        {project && (
          <div className="flex items-center gap-2 bg-gray-800/50 rounded-lg px-3 py-1.5">
            {/* Step 1: Import */}
            <button onClick={importMedia} className="flex flex-col items-center px-2 py-0.5 rounded hover:bg-gray-700/50 transition-colors group" title="导入视频/音频素材">
              <span className="text-lg">📁</span>
              <span className="text-[10px] text-gray-400 group-hover:text-gray-200">导入</span>
            </button>

            <span className="text-gray-600 text-xs">→</span>

            {/* Step 2: Style */}
            <button onClick={onToggleAI} className={`flex flex-col items-center px-2 py-0.5 rounded hover:bg-gray-700/50 transition-colors group ${showAIPanel ? 'bg-blue-500/20 ring-1 ring-blue-500/30' : ''}`} title="选择风格预设和剪辑模式">
              <span className="text-lg">🎨</span>
              <span className="text-[10px] text-gray-400 group-hover:text-gray-200">风格</span>
            </button>

            <span className="text-gray-600 text-xs">→</span>

            {/* Step 3: Transcribe */}
            <button
              onClick={handleTranscribe}
              disabled={isTranscribing || !hasVideo}
              className={`flex flex-col items-center px-2 py-0.5 rounded transition-colors group ${isTranscribing ? 'bg-blue-500/20' : 'hover:bg-gray-700/50'} disabled:opacity-40`}
              title="语音转录生成字幕"
            >
              {isTranscribing
                ? <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-400 border-t-transparent" />
                : <span className="text-lg">🎙</span>}
              <span className="text-[10px] text-gray-400 group-hover:text-gray-200">转录</span>
            </button>

            <span className="text-gray-600 text-xs">→</span>

            {/* Step 4: AI Edit */}
            <button
              onClick={handleAIEditWithTranscribe}
              disabled={isEditing || isTranscribing || !hasVideo}
              className={`flex flex-col items-center px-2 py-0.5 rounded transition-colors group ${isEditing ? 'bg-purple-500/20 ring-1 ring-purple-500/30' : 'hover:bg-gray-700/50'} disabled:opacity-40`}
              title={!hasSubtitles ? '自动转录后 AI 剪辑' : 'AI 自动分析并生成剪辑方案'}
            >
              <span className="text-lg">{isEditing ? '⏳' : '🤖'}</span>
              <span className="text-[10px] text-gray-400 group-hover:text-gray-200">AI剪辑</span>
            </button>

            <span className="text-gray-600 text-xs">→</span>

            {/* Step 5: Preview — play/pause */}
            <button
              onClick={handlePreview}
              className={`flex flex-col items-center px-2 py-0.5 rounded hover:bg-gray-700/50 transition-colors group ${isPlaying ? 'bg-green-500/20 ring-1 ring-green-500/30' : ''}`}
              title={isPlaying ? '暂停预览' : '播放预览'}
            >
              <span className="text-lg">{isPlaying ? '⏸' : '▶'}</span>
              <span className="text-[10px] text-gray-400 group-hover:text-gray-200">{isPlaying ? '暂停' : '预览'}</span>
            </button>

            <span className="text-gray-600 text-xs">→</span>

            {/* Step 6: Export */}
            <button
              onClick={openExport}
              className="flex flex-col items-center px-2 py-0.5 rounded hover:bg-gray-700/50 transition-colors group"
              title="导出最终视频"
            >
              <span className="text-lg">📦</span>
              <span className="text-[10px] text-gray-400 group-hover:text-gray-200">导出</span>
            </button>
          </div>
        )}
      </div>

      {/* Right: tools */}
      <div className="flex items-center gap-1">
        {project && (
          <Button variant="ghost" size="sm" onClick={onToggleChat} title="AI 对话助手">
            💬 {showChat ? '' : ''}
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={() => setShowSettings(true)}>⚙</Button>
      </div>

      {showProjectDialog && (
        <ProjectSettingsDialog
          onClose={() => setShowProjectDialog(false)}
          onCreate={async (config) => {
            await createProject(config)
            setShowProjectDialog(false)
          }}
        />
      )}
      <ExportDialog />
      <SettingsDialog open={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  )
}
