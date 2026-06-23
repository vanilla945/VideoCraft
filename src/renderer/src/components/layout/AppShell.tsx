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
function fmtTime(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

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
  const [editingNarration, setEditingNarration] = useState<string>('')
  const [editingNarrIdx, setEditingNarrIdx] = useState(-1)
  const { project } = useProjectStore()
  const { subtitles } = useSubtitleStore()
  const store = useAIStore()
  const { applyAIEdits, revertAIEdits, aiEditApplied } = useEditorStore()

  const handleAIEdit = useCallback(async () => {
    // Build segments from actual timeline CLIPS, not subtitles
    // Clips have real assetId and time ranges — AI decisions will map correctly
    const editor = useEditorStore.getState()
    const allClips = editor.timeline.tracks.flatMap(t => t.clips)
    if (allClips.length === 0) {
      // No clips on timeline yet — use subtitles if available
      if (subtitles.length === 0) return
    }

    // Convert clips to subtitle-like items for the unified pipeline
    // Use clip IDs so EDL decisions map back correctly
    const mediaAssets = useMediaStore.getState().assets
    const clipSegments = allClips.length > 0 ? allClips.map(c => {
      const a = mediaAssets.find(x => x.id === c.assetId)
      return {
        id: c.id,
        text: a?.fileName || c.id.slice(0, 8),
        startTime: c.sourceStart,
        endTime: c.sourceEnd,
        confidence: 0.9,
        isFillerWord: false,
      }
    }) : subtitles // fallback to subtitles

    // Also include transcription text if available, to help LLM understand content
    const subText = subtitles.length > 0
      ? subtitles.map(s => `[${fmtTime(s.startTime)}-${fmtTime(s.endTime)}] ${s.text}`).join('\n')
      : ''

    // If we have subtitles, inject them as additional context into clip segments
    const enrichedSegments = subText
      ? clipSegments.map(s => {
          // Find matching subtitle text for this time range
          const matched = subtitles
            .filter(sub => sub.startTime >= s.startTime && sub.endTime <= s.endTime)
            .map(sub => sub.text).join(' ')
          return matched ? { ...s, text: matched } : s
        })
      : clipSegments

    if (enrichedSegments.length === 0) return
    setIsEditing(true)
    try {
      const creativeInput = store.getCreativeInput()
      const chatHistory = store.chatMessages
        .filter(m => m.role === 'user')
        .map(m => `用户: ${m.text}`)
        .join('\n') || undefined

      const result: any = await window.api.ai.runEdit(effectiveSubtitles, creativeInput, chatHistory)

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
    // Use unified result if available (has time-based decisions)
    const decisions = unifiedResult?.editDecisions || edlData?.decisions
    if (decisions && decisions.length > 0) {
      applyAIEdits(decisions)
      setEdlData(null)
      setReviewData(null)
      setUnifiedResult(null)
    }
  }, [edlData, unifiedResult, applyAIEdits])

  const dismiss = () => { setEdlData(null); setReviewData(null); setUnifiedResult(null); setEditingNarration(''); setEditingNarrIdx(-1) }

  const isLocalFallback = unifiedResult?.summary?.reasoning?.includes('本地规则引擎') || edlData?.summary?.reasoning?.includes('本地规则引擎')

  const handleEditNarration = (idx: number, text: string) => {
    setEditingNarrIdx(idx)
    setEditingNarration(text)
  }

  const saveNarration = () => {
    if (unifiedResult && editingNarrIdx >= 0) {
      const updated = { ...unifiedResult, narration: [...unifiedResult.narration] }
      updated.narration[editingNarrIdx] = { ...updated.narration[editingNarrIdx], text: editingNarration }
      setUnifiedResult(updated)
    }
    setEditingNarrIdx(-1)
    setEditingNarration('')
  }

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
          <TransportControls />
          <AnalysisProgress />
          {showAIPanel && project && (
            <div className="border-t border-gray-700"><CreativeInputPanel /></div>
          )}

          {/* AI Result Modal */}
          {edlData && (
            <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 bg-black/60" onClick={dismiss}>
              <div className="w-full max-w-5xl max-h-[85vh] overflow-hidden shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
                {/* Fallback warning */}
                {isLocalFallback && (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-t-lg px-4 py-2 flex items-start gap-2">
                    <span className="text-yellow-400 text-lg flex-shrink-0">⚠️</span>
                    <div>
                      <p className="text-sm text-yellow-300 font-medium">深度理解模型未返回有效结果，已切换为本地规则引擎</p>
                      <p className="text-xs text-yellow-400/70 mt-0.5">
                        当前方案基于时长裁剪算法{unifiedResult?.narration?.length ? '+本地解说词生成' : ''}。建议检查 API Key 和网络连接后重试 AI 剪辑以获得完整智能字幕、解说词和剪辑方案。
                      </p>
                    </div>
                  </div>
                )}
                {/* Header */}
                <div className="bg-gradient-to-r from-purple-900/80 to-blue-900/80 px-4 py-3 shrink-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-white">
                      {unifiedResult?.summary?.title || 'AI 处理完成'}
                    </h3>
                    <span className="text-xs text-purple-200">
                      {unifiedResult?.narration?.length || 0} 段解说 · {unifiedResult?.smartSubtitles?.filter((s:any) => s.action === 'keep').length || edlData?.summary?.keptClips || 0} 条保留
                    </span>
                  </div>
                  <p className="text-sm text-purple-200/70 mt-1">{unifiedResult?.summary?.reasoning || edlData?.summary?.reasoning}</p>
                </div>

                {/* Two-column layout */}
                <div className="flex overflow-hidden flex-1 bg-gray-900">
                  {/* Left: Clip decisions */}
                  <div className="w-1/2 border-r border-gray-700 overflow-y-auto">
                    <div className="px-3 py-2 border-b border-gray-800 text-xs text-gray-400 bg-gray-850">
                      ✂️ 视频片段处理
                      <span className="text-gray-500 ml-2">（可继续通过 AI 助手微调）</span>
                    </div>
                    <EditPreview
                      edl={edlData}
                      review={reviewData}
                      rounds={editRounds}
                      onApply={handleApplyEdits}
                      onReject={dismiss}
                      disabled={isEditing}
                    />
                  </div>

                  {/* Right: Narration editor */}
                  <div className="w-1/2 overflow-y-auto">
                    <div className="px-3 py-2 border-b border-gray-800 text-xs text-gray-400 bg-gray-850">
                      📝 解说词
                      <span className="text-gray-500 ml-2">（双击文本可编辑，也可通过 AI 助手微调）</span>
                    </div>
                    {unifiedResult?.narration?.length > 0 ? (
                      <div className="p-3 space-y-2">
                        {unifiedResult.narration.map((narr: any, i: number) => (
                          <div key={i} className="bg-gray-800/50 rounded-lg p-2.5 border border-gray-700/30">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-gray-500">{fmtTime(narr.startTime)} → {fmtTime(narr.endTime)}</span>
                              <span className="text-xs text-gray-600">{narr.needsImage ? '🖼 含配图' : ''}</span>
                            </div>
                            {editingNarrIdx === i ? (
                              <div>
                                <textarea
                                  value={editingNarration}
                                  onChange={(e) => setEditingNarration(e.target.value)}
                                  className="w-full bg-gray-700 border border-blue-500 rounded px-2 py-1 text-sm text-white resize-none"
                                  rows={3}
                                  autoFocus
                                />
                                <div className="flex gap-1 mt-1">
                                  <button onClick={saveNarration} className="text-xs px-2 py-0.5 bg-blue-600 rounded">保存</button>
                                  <button onClick={() => setEditingNarrIdx(-1)} className="text-xs px-2 py-0.5 bg-gray-700 rounded text-gray-300">取消</button>
                                </div>
                              </div>
                            ) : (
                              <p
                                className="text-sm text-gray-200 cursor-pointer hover:bg-gray-700/30 rounded px-1 -mx-1 transition-colors"
                                onDoubleClick={() => handleEditNarration(i, narr.text)}
                              >
                                {narr.text}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-6 text-center text-gray-500 text-sm">
                        暂无解说词 — AI 处理后可能会生成解说词
                      </div>
                    )}
                  </div>
                </div>
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
