interface InstructionPreviewProps {
  command?: {
    type: string
    explanation: string
    previewDescription?: string
    confidence: number
  }
  onConfirm: () => void
  onCancel: () => void
  onModify?: () => void
}

const COMMAND_LABELS: Record<string, string> = {
  delete_clip: '删除片段',
  speed_up: '加速',
  slow_down: '减速',
  add_transition: '添加转场',
  reorder: '调整顺序',
  add_title: '添加标题',
  change_style: '切换风格',
  add_music: '添加音乐',
  trim: '裁剪',
  split: '分割',
  crop_to_vertical: '裁为竖屏',
  generate_cover: '生成封面',
  unknown: '未知指令',
}

export function InstructionPreview({
  command,
  onConfirm,
  onCancel,
  onModify,
}: InstructionPreviewProps): JSX.Element {
  if (!command) return <></>

  const isConfident = command.confidence > 0.7
  const isUnknown = command.type === 'unknown'

  return (
    <div className={`border rounded-lg p-3 ${
      isUnknown ? 'border-yellow-500/30 bg-yellow-500/5'
        : isConfident ? 'border-blue-500/30 bg-blue-500/5'
        : 'border-gray-600 bg-gray-800/30'
    }`}>
      <div className="flex items-start gap-3">
        {/* Type badge */}
        <span className={`px-2 py-0.5 rounded text-xs font-medium flex-shrink-0 ${
          isUnknown ? 'bg-yellow-500/20 text-yellow-300'
            : 'bg-blue-500/20 text-blue-300'
        }`}>
          {COMMAND_LABELS[command.type] || '编辑指令'}
        </span>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-200">{command.explanation}</p>
          {command.previewDescription && (
            <p className="text-xs text-gray-500 mt-0.5">{command.previewDescription}</p>
          )}
          {!isConfident && (
            <p className="text-xs text-yellow-400 mt-1">
              ⚠️ 置信度较低 ({Math.round(command.confidence * 100)}%)，建议确认后执行
            </p>
          )}
        </div>

        {/* Confidence bar */}
        <div className="flex-shrink-0 text-right">
          <div className="flex items-center gap-1">
            <div className="w-10 h-1.5 bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  command.confidence > 0.7 ? 'bg-green-500'
                    : command.confidence > 0.4 ? 'bg-yellow-500'
                    : 'bg-red-500'
                }`}
                style={{ width: `${command.confidence * 100}%` }}
              />
            </div>
            <span className="text-xs text-gray-500">{Math.round(command.confidence * 100)}%</span>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex justify-end gap-2 mt-3 pt-2 border-t border-gray-700/50">
        <button
          onClick={onCancel}
          className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm text-gray-300 transition-colors"
        >
          取消
        </button>
        {onModify && (
          <button
            onClick={onModify}
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm text-gray-300 transition-colors"
          >
            修改参数
          </button>
        )}
        <button
          onClick={onConfirm}
          disabled={isUnknown}
          className={`px-3 py-1 rounded text-sm transition-colors ${
            isUnknown
              ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-500 text-white'
          }`}
        >
          {isUnknown ? '暂不支持' : '执行'}
        </button>
      </div>
    </div>
  )
}
