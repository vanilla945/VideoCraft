import { configService, type ModelProvider } from './config.service'
import { llmService } from './llm.service'

type RouteCategory = 'fast' | 'heavy' | 'tts' | 'image'

interface RouteResult {
  provider: ModelProvider
  model: string
  apiKey: string | undefined
}

interface LLMCallOptions {
  prompt: string
  systemPrompt?: string
  maxTokens?: number
  temperature?: number
}

class ModelRouter {
  route(category: RouteCategory): RouteResult {
    const config = configService.getAllConfig()

    switch (category) {
      case 'fast':
        return {
          provider: config.fastModelProvider,
          model: config.fastModelName,
          apiKey: configService.getApiKey(config.fastModelProvider),
        }
      case 'heavy':
        return {
          provider: config.heavyModelProvider,
          model: config.heavyModelName,
          apiKey: configService.getApiKey(config.heavyModelProvider),
        }
      case 'tts':
        return {
          provider: config.ttsProvider === 'local' ? 'local' : config.ttsProvider,
          model: config.ttsModelName,
          apiKey: config.ttsProvider === 'local' ? undefined : configService.getApiKey(config.ttsProvider),
        }
      case 'image':
        return {
          provider: config.imageProvider === 'none' ? 'minimax' : config.imageProvider,
          model: config.imageModelName,
          apiKey: configService.getApiKey(config.imageProvider === 'none' ? 'minimax' : config.imageProvider),
        }
    }
  }

  getMaxImagePerProject(): number {
    return configService.get('imageMaxPerProject')
  }

  isImageGenEnabled(): boolean {
    return configService.get('imageProvider') !== 'none'
  }

  async complete(category: 'fast' | 'heavy', options: LLMCallOptions): Promise<string> {
    const route = this.route(category)

    try {
      return await llmService.complete(route.provider, route.model, {
        prompt: options.prompt,
        systemPrompt: options.systemPrompt,
        maxTokens: options.maxTokens,
        temperature: options.temperature,
      })
    } catch (error) {
      // Fallback to Minimax-M3 if primary fails
      if (route.provider !== 'minimax') {
        console.warn(`[ModelRouter] ${route.provider} 调用失败，切换到 Minimax-M3 备用`, (error as Error).message)
        return await llmService.complete('minimax', 'minimax-m3', {
          prompt: options.prompt,
          systemPrompt: options.systemPrompt,
          maxTokens: options.maxTokens,
          temperature: options.temperature,
        })
      }
      throw error
    }
  }

  async completeStream(
    category: 'fast' | 'heavy',
    options: LLMCallOptions,
    onChunk: (text: string) => void
  ): Promise<string> {
    const route = this.route(category)

    try {
      return await llmService.completeStream(route.provider, route.model, {
        prompt: options.prompt,
        systemPrompt: options.systemPrompt,
        maxTokens: options.maxTokens,
        temperature: options.temperature,
      }, onChunk)
    } catch (error) {
      if (route.provider !== 'minimax') {
        console.warn(`[ModelRouter] ${route.provider} 调用失败(streaming)，切换到 Minimax-M3`)
        return await llmService.completeStream('minimax', 'minimax-m3', {
          prompt: options.prompt,
          systemPrompt: options.systemPrompt,
          maxTokens: options.maxTokens,
          temperature: options.temperature,
        }, onChunk)
      }
      throw error
    }
  }

  async visionComplete(
    category: 'fast' | 'heavy',
    imageBase64: string,
    prompt: string,
    maxTokens?: number
  ): Promise<string> {
    const route = this.route(category)
    const visionModel = route.provider === 'deepseek' ? 'deepseek-vl2' : route.model

    try {
      return await llmService.visionComplete(route.provider, visionModel, {
        imageBase64,
        prompt,
        maxTokens,
      })
    } catch (error) {
      if (route.provider !== 'minimax') {
        console.warn(`[ModelRouter] VLM 调用失败，切换到 Minimax-M3`)
        return await llmService.visionComplete('minimax', 'minimax-m3', {
          imageBase64,
          prompt,
          maxTokens,
        })
      }
      throw error
    }
  }
}

export const modelRouter = new ModelRouter()
