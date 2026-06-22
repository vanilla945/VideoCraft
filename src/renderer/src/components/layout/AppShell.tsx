import { useState, useCallback } from 'react'
import { Toolbar } from './Toolbar'
import { Sidebar } from './Sidebar'
import { PreviewPane } from '../editor/PreviewPane'
import { TransportControls } from '../editor/TransportControls'
import { Timeline } from '../editor/Timeline'
import { SubtitleTrack } from '../editor/SubtitleTrack'
import { CreativeInputPanel } from '../ai/CreativeInputPanel'
import { SubtitleEditorPanel } from '../ai/SubtitleEditorPanel'
import { EditPreview } from '../ai/EditPreview'
import { ChatPanel } from '../ai/ChatPanel'
import { AnalysisProgress } from '../ai/AnalysisProgress'
import { ErrorBoundary } from '../ui/ErrorBoundary'
import { OnboardingWizard } from '../onboarding/OnboardingWizard'
import { useProjectStore } from '../../stores/useProjectStore'
import { useSubtitleStore } from '../../stores/useSubtitleStore'
import { useAIStore } from '../../stores/useAIStore'
import { useEditorStore } from '../../stores/useEditorStore'

export function AppShell(): JSX.Element {
  const [showAIPanel, setShowAIPanel] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [edlData, setEdlData] = useState<any>(null)
  const [reviewData, setReviewData] = useState<any>(null)
  const [editRounds, setEditRounds] = useState(0)
  const [isEditing, setIsEditing] = useState(false)
  const { project } = useProjectStore()
  const { subtitles } = useSubtitleStore()
  const store = useAIStore()
  const { applyAIEdits, revertAIEdits, aiEditApplied } = useEditorStore()

  const handleAIEdit = useCallback(async () => {
    if (subtitles.length === 0) return
    setIsEditing(true)
    try {
      const creativeInput = store.getCreativeInput()
      const result: any = await window.api.ai.runEdit(subtitles, creativeInput)
      if (result.success && result.edl?.decisions?.length > 0) {
        setEdlData(result.edl)
        setReviewData(result.reviewReport)
        setEditRounds(result.rounds || 1)
      } else {
        console.warn('AI editing returned no decisions:', result.error || result)
      }
    } catch (err) {
      console.error('AI 剪辑调用失败:', err)
    } finally {
      setIsEditing(false)
    }
  }, [subtitles, store])

  const handleApplyEdits = useCallback(() => {
    if (edlData?.decisions) {
      applyAIEdits(edlData.decisions)
      setEdlData(null)
      setReviewData(null)
    }
  }, [edlData, applyAIEdits])

  return (
    <div className="h-screen flex flex-col bg-gray-900 text-white overflow-hidden">
      <Toolbar
        onToggleAI={() => setShowAIPanel(!showAIPanel)}
        onToggleChat={() => setShowChat(!showChat)}
        onAIEdit={handleAIEdit}
        showChat={showChat}
        isEditing={isEditing}
        hasSubtitles={subtitles.length > 0}
        showAIPanel={showAIPanel}
      />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <main className="flex-1 flex flex-col overflow-hidden">
          <PreviewPane />
          <AnalysisProgress />

          {showAIPanel && project && (
            <div className="border-t border-gray-700">
              <CreativeInputPanel />
            </div>
          )}

          {/* AI Edit Result — modal overlay for visibility */}
          {edlData && (
            <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/60" onClick={() => { setEdlData(null); setReviewData(null) }}>
              <div className="w-full max-w-2xl max-h-[70vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
                <EditPreview
                  edl={edlData}
                  review={reviewData}
                  rounds={editRounds}
                  onApply={handleApplyEdits}
                  onReject={() => { setEdlData(null); setReviewData(null) }}
                  disabled={isEditing}
                />
              </div>
            </div>
          )}

          {aiEditApplied && (
            <div className="flex items-center justify-between px-4 py-2 bg-green-500/10 border-t border-green-700/50">
              <span className="text-sm text-green-300 flex items-center gap-2">
                ✅ AI 剪辑已应用 — 你可以点击预览窗查看效果，或继续微调
              </span>
              <button onClick={revertAIEdits} className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm text-gray-300 transition-colors">
                撤销 AI 剪辑
              </button>
            </div>
          )}

          <Timeline />
          <SubtitleTrack />
          {subtitles.length > 0 && <SubtitleEditorPanel />}
        </main>

        {showChat && (
          <aside className="w-72 border-l border-gray-700 flex-shrink-0">
            <ChatPanel />
          </aside>
        )}
      </div>
    </div>
  )
}
