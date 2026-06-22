import type { SubtitleItem } from '../../shared/types/subtitle'
import type { CreativeInput } from '../../shared/types/creative-input'
import type { ParsedCommand } from './edit-parser.service'
import { modelRouter } from './model-router.service'

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  parsedCommand?: ParsedCommand
}

export interface ConversationContext {
  subtitles: SubtitleItem[]
  creativeInput: CreativeInput
  history: ConversationMessage[]
  projectName?: string
  videoDuration?: number
}

class ConversationService {
  private sessions = new Map<string, ConversationContext>()

  createSession(projectId: string, context: Omit<ConversationContext, 'history'>): void {
    this.sessions.set(projectId, {
      ...context,
      history: [{
        role: 'system',
        content: `你是一个专业的 AI 视频编辑助手，正在帮助用户编辑一个${context.videoDuration ? ` ${Math.round(context.videoDuration)}秒` : ''}的视频。当前剪辑风格: ${context.creativeInput.presetId}，剪辑模式: ${context.creativeInput.editingMode}。请用中文对话，回答简洁专业。`,
        timestamp: Date.now(),
      }],
    })
  }

  async chat(
    projectId: string,
    userMessage: string
  ): Promise<ConversationMessage> {
    const session = this.sessions.get(projectId)
    if (!session) {
      return { role: 'assistant', content: '找不到会话上下文。请重新开始。', timestamp: Date.now() }
    }

    // Add user message
    session.history.push({
      role: 'user',
      content: userMessage,
      timestamp: Date.now(),
    })

    // Build LLM conversation
    const messages = session.history.map(m => ({
      role: m.role,
      content: m.content,
    }))

    // Add current context as system prompt
    const systemContext = this.buildContextSummary(session)

    try {
      const response = await modelRouter.complete('fast', {
        prompt: `以下是与用户的对话历史。请根据当前视频编辑上下文回复用户。

${systemContext}

用户: ${userMessage}

请回复（简洁专业，2-5句话）:`,
        systemPrompt: '你是专业视频编辑 AI 助手。回复简洁专业，用中文。',
        temperature: 0.5,
        maxTokens: 500,
      })

      const message: ConversationMessage = {
        role: 'assistant',
        content: response,
        timestamp: Date.now(),
      }

      session.history.push(message)
      return message
    } catch (err) {
      const fallback: ConversationMessage = {
        role: 'assistant',
        content: `收到你的需求。你可以通过创意输入面板配置更详细的参数，或点击「AI 剪辑」开始自动剪辑。`,
        timestamp: Date.now(),
      }
      session.history.push(fallback)
      return fallback
    }
  }

  getHistory(projectId: string): ConversationMessage[] {
    return this.sessions.get(projectId)?.history.filter(m => m.role !== 'system') || []
  }

  clearSession(projectId: string): void {
    this.sessions.delete(projectId)
  }

  private buildContextSummary(session: ConversationContext): string {
    const parts: string[] = []

    if (session.videoDuration) {
      parts.push(`视频时长: ${Math.round(session.videoDuration)}秒`)
    }
    parts.push(`字幕条数: ${session.subtitles.length}`)
    parts.push(`剪辑模式: ${session.creativeInput.editingMode}`)
    parts.push(`风格预设: ${session.creativeInput.presetId}`)
    if (session.creativeInput.customKeyPoints?.length) {
      parts.push(`关键信息: ${session.creativeInput.customKeyPoints.join(', ')}`)
    }
    if (session.projectName) {
      parts.push(`项目: ${session.projectName}`)
    }

    return parts.join('\n')
  }
}

export const conversationService = new ConversationService()
