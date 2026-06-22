import { useState, useCallback } from 'react'
import { Button } from '../ui/Button'
import { useProjectStore } from '../../stores/useProjectStore'
import { useMediaStore } from '../../stores/useMediaStore'
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
}

export function Toolbar({ onToggleAI, onToggleChat, onAIEdit, showChat, isEditing, hasSubtitles }: ToolbarProps): JSX.Element {
  const [showProjectDialog, setShowProjectDialog] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const { project, createProject, saveProject, saveProjectAs, loadProject } = useProjectStore()
  const { importMedia } = useMediaStore()
  const { openDialog: openExport } = useExportStore()

  const { assets } = useMediaStore()
  const { startTranscription, isTranscribing } = useSubtitleStore()

  const handleNewProject = async (): Promise<void> => {
    setShowProjectDialog(true)
  }

  const handleOpenProject = async (): Promise<void> => {
    const files = await window.api.dialog.openFile([
      { name: 'VideoCraft Project', extensions: ['vcraft'] }
    ])
    if (files.length > 0) {
      await loadProject(files[0])
    }
  }

  const handleTranscribe = useCallback(async () => {
    const videoAssets = assets.filter(a => a.mediaType === 'video')
    if (videoAssets.length === 0) return
    // Transcribe the first video asset
    await startTranscription(videoAssets[0].filePath, 'zh')
  }, [assets, startTranscription])

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-gray-850 border-b border-gray-700">
      <div className="flex-1 flex items-center gap-1">
        <Button variant="ghost" size="sm" onClick={handleNewProject}>
          新建项目
        </Button>
        <Button variant="ghost" size="sm" onClick={handleOpenProject}>
          打开项目
        </Button>
        {project && (
          <>
            <Button variant="ghost" size="sm" onClick={saveProject}>
              保存
            </Button>
            <Button variant="ghost" size="sm" onClick={saveProjectAs}>
              另存为
            </Button>
          </>
        )}
      </div>
      <div className="flex items-center gap-1">
        {project && (
          <>
            <Button variant="secondary" size="sm" onClick={importMedia}>
              + 导入媒体
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleTranscribe}
              disabled={isTranscribing || assets.filter(a => a.mediaType === 'video').length === 0}
            >
              {isTranscribing ? '转录中...' : '🎙 转录'}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={onAIEdit}
              disabled={isEditing || !hasSubtitles}
            >
              {isEditing ? 'AI 分析中...' : '🤖 AI 剪辑'}
            </Button>
            <Button variant="primary" size="sm" onClick={openExport}>
              导出视频
            </Button>
          </>
        )}
        {project && (
          <>
            <Button variant="ghost" size="sm" onClick={onToggleAI} title="AI 创意输入">
              🎬
            </Button>
            <Button variant="ghost" size="sm" onClick={onToggleChat} title="AI 助手">
              💬 {showChat ? '◀' : ''}
            </Button>
          </>
        )}
        <Button variant="ghost" size="sm" onClick={() => setShowSettings(true)}>
          ⚙
        </Button>
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
