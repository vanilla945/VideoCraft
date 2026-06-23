import OpenAI from 'openai'
import { configService, type ModelProvider } from './config.service'

interface CompletionOptions {
  prompt: string
  systemPrompt?: string
  maxTokens?: number
  temperature?: number
  stream?: boolean
}

interface VisionOptions {
  imageBase64: string
  prompt: string
  maxTokens?: number
}

class LLMService {
  private clients: Map<string, OpenAI> = new Map()

  private getBaseURL(provider: ModelProvider): string {
    const urls: Record<string, string> = {
      deepseek: 'https://api.deepseek.com/v1',
      minimax: 'https://api.minimax.chat/v1',
      kimi: 'https://api.moonshot.cn/v1',
      local: 'http://localhost:11434/v1',
    }
    return urls[provider] || urls.deepseek
  }

  private getClient(provider: ModelProvider): OpenAI {
    const key = configService.getApiKey(provider)
    if (!key) {
      throw new Error(`API Key 未配置: ${provider}。请在 .env 文件中设置对应的 API Key。`)
    }

    const cacheKey = `${provider}:${key.slice(-4)}`
    if (!this.clients.has(cacheKey)) {
      this.clients.set(
        cacheKey,
        new OpenAI({
          apiKey: key,
          baseURL: this.getBaseURL(provider),
        })
      )
    }
    return this.clients.get(cacheKey)!
  }

  async complete(provider: ModelProvider, model: string, options: CompletionOptions): Promise<string> {
    const client = this.getClient(provider)
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = []

    if (options.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt })
    }
    messages.push({ role: 'user', content: options.prompt })

    const response = await client.chat.completions.create({
      model,
      messages,
      max_tokens: options.maxTokens ?? 4000,
      temperature: options.temperature ?? 0.7,
      stream: false,
    })

    return response.choices[0]?.message?.content || ''
  }

  async completeStream(
    provider: ModelProvider,
    model: string,
    options: CompletionOptions,
    onChunk: (text: string) => void
  ): Promise<string> {
    const client = this.getClient(provider)
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = []

    if (options.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt })
    }
    messages.push({ role: 'user', content: options.prompt })

    const stream = await client.chat.completions.create({
      model,
      messages,
      max_tokens: options.maxTokens ?? 4000,
      temperature: options.temperature ?? 0.7,
      stream: true,
    })

    let fullText = ''
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content
      if (content) {
        fullText += content
        onChunk(content)
      }
    }
    return fullText
  }

  async visionComplete(
    provider: ModelProvider,
    model: string,
    options: VisionOptions
  ): Promise<string> {
    const client = this.getClient(provider)
    const response = await client.chat.completions.create({
      model,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: `data:image/png;base64,${options.imageBase64}` },
            },
            { type: 'text', text: options.prompt },
          ],
        },
      ],
      max_tokens: options.maxTokens ?? 2000,
    })

    return response.choices[0]?.message?.content || ''
  }

  clearCache(): void {
    this.clients.clear()
  }
}

export const llmService = new LLMService()
