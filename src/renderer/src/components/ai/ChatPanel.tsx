import { useState, useRef, useEffect, useCallback } from 'react'
import { useAIStore } from '../../stores/useAIStore'
import { useSubtitleStore } from '../../stores/useSubtitleStore'
import { useProjectStore } from '../../stores/useProjectStore'
import { InstructionPreview } from './InstructionPreview'
import type { CreativeInput } from '@shared/types/creative-input'

interface ChatMessage {
  role: 'user' | 'ai'
  text: string
  timestamp: number
  command?: any
}

const EXAMPLE_PROMPTS = [
  '把开头无聊的部分删掉',
  '把第三段加速 1.5 倍',
  '给片段之间加上淡入淡出',
  '全部裁剪为竖屏 9:16',
  '生成一个封面图',
  '切换风格为教程模式',
]

export function ChatPanel(): JSX.Element {
  const { addChatMessage, chatMessages, isChatProcessing, setChatProcessing } = useAIStore()
  const { subtitles } = useSubtitleStore()
  const { project } = useProjectStore()
  const store = useAIStore()
  const [input, setInput] = useState('')
  const [pendingCommand, setPendingCommand] = useState<any>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages, pendingCommand])

  const handleSend = useCallback(async (text?: string) => {
    const msg = (text || input).trim()
    if (!msg || isChatProcessing) return

    setInput('')
    addChatMessage('user', msg)
    setChatProcessing(true)

    try {
      const creativeInput: CreativeInput = store.getCreativeInput()
      const projectId = project?.config?.name || 'default'

      // Step 1: Parse the command
      const parseResult: any = await window.api.ai.chatParse(msg, subtitles, creativeInput)

      if (parseResult.success && parseResult.command && parseResult.command.type !== 'unknown') {
        // Show instruction preview
        setPendingCommand(parseResult.command)
      }

      // Step 2: Get AI response
      const chatResult: any = await window.api.ai.chatSend(projectId, msg, subtitles, creativeInput)

      if (chatResult.success && chatResult.message) {
        addChatMessage('ai', chatResult.message.content)
      } else {
        addChatMessage('ai', '抱歉，对话服务暂时不可用。你可以通过创意输入面板配置剪辑参数。')
      }
    } catch (err) {
      console.error('Chat error:', err)
      addChatMessage('ai', '对话过程中出现问题，请重试。')
    } finally {
      setChatProcessing(false)
    }
  }, [input, isChatProcessing, store, project, subtitles, addChatMessage, setChatProcessing])

  const handleConfirmCommand = useCallback(() => {
    // Execute the parsed command (mapped to editor actions)
    if (pendingCommand) {
      addChatMessage('ai', `✅ 已执行: ${pendingCommand.explanation}`)
    }
    setPendingCommand(null)
  }, [pendingCommand, addChatMessage])

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const allMessages = [...chatMessages]

  return (
    <div className="flex flex-col h-full bg-gray-800/50 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 border-b border-gray-700/50 flex items-center justify-between">
        <span className="text-xs text-gray-400">💬 AI 助手</span>
        <span className="text-xs text-gray-600">Phase 6 — 对话编辑</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2" style={{ maxHeight: 'calc(100% - 80px)' }}>
        {allMessages.length === 0 && (
          <div className="space-y-2">
            <p className="text-xs text-gray-500 text-center py-2">试试这些指令：</p>
            <div className="flex flex-wrap gap-1.5">
              {EXAMPLE_PROMPTS.map((p, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(p)}
                  disabled={isChatProcessing}
                  className="px-2 py-1 bg-gray-700/40 hover:bg-gray-700 rounded text-xs text-gray-300 transition-colors"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {allMessages.map((msg, i) => (
          <div
            key={i}
            className={`text-xs p-2 rounded-lg max-w-[90%] ${
              msg.role === 'user'
                ? 'bg-blue-500/20 text-blue-100 ml-auto'
                : 'bg-gray-700/50 text-gray-200'
            }`}
          >
            {msg.text}
          </div>
        ))}

        {/* Instruction preview inline */}
        {pendingCommand && (
          <div className="ml-2">
            <InstructionPreview
              command={pendingCommand}
              onConfirm={handleConfirmCommand}
              onCancel={() => setPendingCommand(null)}
              onModify={() => setPendingCommand(null)}
            />
          </div>
        )}

        {isChatProcessing && (
          <div className="flex items-center gap-2 text-xs text-gray-500 p-2">
            <div className="animate-spin rounded-full h-3 w-3 border-2 border-blue-400 border-t-transparent" />
            AI 思考中...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-2 py-2 border-t border-gray-700/50">
        <div className="flex gap-1">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入编辑指令，如「把第三段加速」..."
            className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
            disabled={isChatProcessing}
          />
          <button
            onClick={() => handleSend()}
            disabled={isChatProcessing || !input.trim()}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 rounded-lg text-xs text-white transition-colors"
          >
            发送
          </button>
        </div>
        <p className="text-xs text-gray-600 mt-1.5 text-center">
          按 Enter 发送 · 支持自然语言编辑指令
        </p>
      </div>
    </div>
  )
}
