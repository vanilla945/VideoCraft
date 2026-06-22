import { useState } from 'react'
import { useEditorStore } from '../../stores/useEditorStore'
import { useSubtitleStore } from '../../stores/useSubtitleStore'
import { useAIStore } from '../../stores/useAIStore'

interface EditPreviewData {
  decisions: Array<{
    clipId: string
    action: string
    reason: string
    confidence: number
    speedRatio?: number
    transitionType?: string
    trimRange?: { start: number; end: number }
  }>
  summary: {
    totalClips: number
    keptClips: number
    removedClips: number
    modifiedClips: number
    estimatedDuration: number
    reasoning: string
  }
}

interface ReviewData {
  passed: boolean
  issues: Array<{ severity: string; clipId?: string; description: string; suggestion: string }>
  suggestions: string[]
  overallScore: number
}

interface EditPreviewProps {
  edl?: EditPreviewData
  review?: ReviewData
  rounds?: number
  onApply: () => void
  onReject: () => void
  disabled?: boolean
}

export function EditPreview({
  edl,
  review,
  rounds = 1,
  onApply,
  onReject,
  disabled = false,
}: EditPreviewProps): JSX.Element {
  const [showDetails, setShowDetails] = useState(false)
  const { subtitles } = useSubtitleStore()

  if (!edl) {
    return (
      <div className="bg-gray-800/60 rounded-lg p-4 text-center text-sm text-gray-400">
        尚未生成剪辑方案。导入视频并转录后，AI 将自动生成剪辑建议。
      </div>
    )
  }

  const getSubtitleText = (clipId: string): string => {
    const sub = subtitles.find(s => s.id === clipId)
    return sub?.text || `片段 ${clipId.slice(-4)}`
  }

  const actionBadge = (action: string) => {
    const colors: Record<string, string> = {
      keep: 'bg-green-500/20 text-green-300',
      remove: 'bg-red-500/20 text-red-300',
      trim: 'bg-yellow-500/20 text-yellow-300',
      speed: 'bg-purple-500/20 text-purple-300',
      reorder: 'bg-blue-500/20 text-blue-300',
      add_transition: 'bg-cyan-500/20 text-cyan-300',
    }

    const labels: Record<string, string> = {
      keep: '保留',
      remove: '删除',
      trim: '裁剪',
      speed: '变速',
      reorder: '重排',
      add_transition: '转场',
    }

    return (
      <span className={`px-1.5 py-0.5 rounded text-xs ${colors[action] || 'bg-gray-500/20'}`}>
        {labels[action] || action}
      </span>
    )
  }

  return (
    <div className="bg-gray-800/60 rounded-lg p-4 space-y-3">
      {/* Summary Header */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium text-gray-200">
            AI 剪辑方案
            {rounds > 1 && <span className="text-xs text-yellow-400 ml-2">(第 {rounds} 轮修订)</span>}
          </h4>
          <p className="text-xs text-gray-400 mt-0.5">{edl.summary.reasoning}</p>
        </div>
        {review && (
          <div className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
            review.passed ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300'
          }`}>
            {review.passed ? '✅ 审查通过' : `⚠️ 审查中 (${review.overallScore}分)`}
          </div>
        )}
      </div>

      {/* Stats Bar */}
      <div className="flex gap-3 text-xs bg-gray-700/30 rounded-lg px-3 py-2">
        <span className="text-gray-400">总片段: <span className="text-white">{edl.summary.totalClips}</span></span>
        <span className="text-gray-400">保留: <span className="text-green-300">{edl.summary.keptClips}</span></span>
        <span className="text-gray-400">删除: <span className="text-red-300">{edl.summary.removedClips}</span></span>
        <span className="text-gray-400">修改: <span className="text-yellow-300">{edl.summary.modifiedClips}</span></span>
        <span className="text-gray-400">预计时长: <span className="text-white">{edl.summary.estimatedDuration}s</span></span>
      </div>

      {/* Reviewer Issues */}
      {review && review.issues.length > 0 && (
        <div className="space-y-1">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-xs text-gray-400 hover:text-gray-200"
          >
            {showDetails ? '▼' : '▶'} 审查意见 ({review.issues.length} 条)
          </button>
          {showDetails && (
            <div className="space-y-1 max-h-[200px] overflow-y-auto">
              {review.issues.map((issue, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-2 p-2 rounded text-xs ${
                    issue.severity === 'critical' ? 'bg-red-500/10'
                      : issue.severity === 'warning' ? 'bg-yellow-500/10'
                      : 'bg-gray-700/30'
                  }`}
                >
                  <span className={
                    issue.severity === 'critical' ? 'text-red-400'
                      : issue.severity === 'warning' ? 'text-yellow-400'
                      : 'text-gray-500'
                  }>
                    {issue.severity === 'critical' ? '❌' : issue.severity === 'warning' ? '⚠️' : 'ℹ️'}
                  </span>
                  <div>
                    <p className="text-gray-300">{issue.description}</p>
                    <p className="text-gray-500 mt-0.5">建议: {issue.suggestion}</p>
                  </div>
                </div>
              ))}
              {review.suggestions.filter(Boolean).map((s, i) => (
                <div key={`sug-${i}`} className="text-xs text-blue-300 px-2 py-1 bg-blue-500/10 rounded">
                  💡 {s}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Decision List (compact) */}
      <div className="max-h-[200px] overflow-y-auto space-y-0.5">
        {edl.decisions.filter(d => d.action !== 'keep').slice(0, 30).map((d) => (
          <div
            key={d.clipId}
            className="flex items-center gap-2 px-2 py-1 rounded text-xs bg-gray-700/20"
          >
            {actionBadge(d.action)}
            <span className="text-gray-300 truncate flex-1">
              {getSubtitleText(d.clipId)}
            </span>
            {d.speedRatio && d.speedRatio !== 1 && (
              <span className="text-purple-300">×{d.speedRatio}</span>
            )}
            {d.transitionType && (
              <span className="text-cyan-300">{d.transitionType}</span>
            )}
            <span className="text-gray-500" title={d.reason}>
              {d.reason.length > 15 ? d.reason.slice(0, 15) + '..' : d.reason}
            </span>
            <span className={`text-xs ${d.confidence > 0.7 ? 'text-green-400' : 'text-yellow-400'}`}>
              {Math.round(d.confidence * 100)}%
            </span>
          </div>
        ))}
        {edl.decisions.filter(d => d.action !== 'keep').length > 30 && (
          <div className="text-xs text-gray-500 text-center py-1">
            ...还有 {edl.decisions.filter(d => d.action !== 'keep').length - 30} 项
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-2 pt-2 border-t border-gray-700">
        <button
          onClick={onReject}
          disabled={disabled}
          className="px-4 py-1.5 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 rounded-lg text-sm text-gray-300 transition-colors"
        >
          拒绝
        </button>
        <button
          onClick={onApply}
          disabled={disabled}
          className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 rounded-lg text-sm text-white transition-colors"
        >
          应用 AI 剪辑
        </button>
      </div>
    </div>
  )
}
