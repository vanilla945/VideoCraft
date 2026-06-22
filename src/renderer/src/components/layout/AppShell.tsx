import { useState, useCallback } from 'react'
import { Toolbar } from './Toolbar'
import { Sidebar } from './Sidebar'
import { PreviewPane } from '../editor/PreviewPane'
import { Timeline } from '../editor/Timeline'
import { SubtitleTrack } from '../editor/SubtitleTrack'
import { CreativeInputPanel } from '../ai/CreativeInputPanel'
import { SubtitleEditorPanel } from '../ai/SubtitleEditorPanel'
import { EditPreview } from '../ai/EditPreview'
import { ChatPanel } from '../ai/ChatPanel'
import { AnalysisProgress } from '../ai/AnalysisProgress'
import { useProjectStore } from '../../stores/useProjectStore'
import { useMediaStore } from '../../stores/useMediaStore'
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
  const [unifiedResult, setUnifiedResult] = useState<any>(null)
  const { project } = useProjectStore()
  const { subtitles } = useSubtitleStore()
  const store = useAIStore()
  const { applyAIEdits, revertAIEdits, aiEditApplied } = useEditorStore()

  const handleAIEdit = useCallback(async () => {
    const isVisualOnly = useSubtitleStore.getState().transcriptionError === 'visual-only'

    let effectiveSubtitles = subtitles
    if (isVisualOnly || subtitles.length === 0) {
      try {
        const videoAssets = useMediaStore.getState().assets.filter(a => a.mediaType === 'video')
        if (videoAssets.length === 0) return
        const keyframes = await window.api.media.extractKeyframes(videoAssets[0].filePath, 5)
        effectiveSubtitles = keyframes.map((_, i) => ({
          id: `visual_${i}`, text: `场景 ${i + 1}`, startTime: i * 5, endTime: (i + 1) * 5,
          confidence: 0.6, isFillerWord: false,
        }))
      } catch {
        effectiveSubtitles = [{ id: 'vis_0', text: '视频画面', startTime: 0, endTime: 10, confidence: 0.8, isFillerWord: false }]
      }
    }

    if (effectiveSubtitles.length === 0) return
    setIsEditing(true)
    try {
      const creativeInput = store.getCreativeInput()
      const result: any = await window.api.ai.runEdit(effectiveSubtitles, creativeInput)

      if (result.success) {
        // Check for unified pipeline result (new) vs old orchestrator
        if (result.unified) {
          setUnifiedResult(result.unified)
          setReviewData({
            passed: true, issues: [],
            suggestions: result.unified.summary?.reasoning ? [result.unified.summary.reasoning] : [],
            overallScore: 85,
          })
          setEditRounds(1)
        } else if (result.edl?.decisions?.length > 0) {
          setReviewData(result.reviewReport)
          setEditRounds(result.rounds || 1)
        }
        if (result.edl?.decisions?.length > 0) {
          setEdlData(result.edl)
        }
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
      setUnifiedResult(null)
    }
  }, [edlData, applyAIEdits])

  const dismiss = () => { setEdlData(null); setReviewData(null); setUnifiedResult(null) }

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
            <div className="border-t border-gray-700"><CreativeInputPanel /></div>
          )}

          {/* AI Result Modal */}
          {edlData && (
            <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 bg-black/60" onClick={dismiss}>
              <div className="w-full max-w-3xl max-h-[80vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
                {/* Unified result banner */}
                {unifiedResult && (
                  <div className="bg-gradient-to-r from-purple-900/80 to-blue-900/80 rounded-t-lg px-4 py-3 border-b border-purple-500/20">
                    <h3 className="text-lg font-bold text-white">
                      {unifiedResult.summary?.title || 'AI 处理完成'}
                    </h3>
                    <p className="text-sm text-purple-200 mt-1">{unifiedResult.summary?.reasoning}</p>
                    {unifiedResult.narration?.length > 0 && (
                      <div className="mt-2 flex gap-2 text-xs">
                        <span className="bg-purple-500/20 text-purple-200 px-2 py-0.5 rounded">
                          📝 {unifiedResult.narration.length} 段解说词
                        </span>
                        <span className="bg-green-500/20 text-green-200 px-2 py-0.5 rounded">
                          ✅ {unifiedResult.smartSubtitles?.filter((s: any) => s.action === 'keep').length || 0} 条字幕保留
                        </span>
                        {unifiedResult.smartSubtitles?.filter((s: any) => s.action === 'rewrite').length > 0 && (
                          <span className="bg-yellow-500/20 text-yellow-200 px-2 py-0.5 rounded">
                            ✏️ {unifiedResult.smartSubtitles.filter((s: any) => s.action === 'rewrite').length} 条字幕润色
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}
                <EditPreview
                  edl={edlData}
                  review={reviewData}
                  rounds={editRounds}
                  onApply={handleApplyEdits}
                  onReject={dismiss}
                  disabled={isEditing}
                />
              </div>
            </div>
          )}

          {aiEditApplied && (
            <div className="flex items-center justify-between px-4 py-2 bg-green-500/10 border-t border-green-700/50">
              <span className="text-sm text-green-300 flex items-center gap-2">
                ✅ AI 剪辑已应用 — 点击预览窗查看效果，或继续微调
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
          <aside className="w-72 border-l border-gray-700 flex-shrink-0"><ChatPanel /></aside>
        )}
      </div>
    </div>
  )
}
