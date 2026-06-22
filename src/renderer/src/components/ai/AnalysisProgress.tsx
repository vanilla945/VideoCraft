import { useAIStore } from '../../stores/useAIStore'

export function AnalysisProgress(): JSX.Element {
  const { isAnalyzing, analysisStatus } = useAIStore()

  if (!isAnalyzing && !analysisStatus) return <></>

  return (
    <div className="bg-gray-800/60 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-2">
        {isAnalyzing && (
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-400 border-t-transparent" />
        )}
        <span className="text-sm text-gray-300">
          {analysisStatus?.message || '准备就绪'}
        </span>
      </div>
      {analysisStatus && (
        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-500"
            style={{ width: `${Math.max(analysisStatus.progress, 2)}%` }}
          />
        </div>
      )}
      {analysisStatus && (
        <p className="text-xs text-gray-500 mt-1">
          阶段: {analysisStatus.phase} · {analysisStatus.progress}%
        </p>
      )}
    </div>
  )
}
