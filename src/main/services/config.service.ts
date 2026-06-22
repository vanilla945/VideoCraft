import 'dotenv/config'

export type ModelProvider = 'deepseek' | 'minimax' | 'kimi' | 'local'
export type TTSProvider = 'local' | 'minimax' | 'deepseek'
export type ImageProvider = 'minimax' | 'none'

export interface ModelConfig {
  fastModelProvider: ModelProvider
  fastModelName: string
  heavyModelProvider: ModelProvider
  heavyModelName: string
  ttsProvider: TTSProvider
  ttsModelName: string
  ttsVoice: string
  ttsLanguage: string
  imageProvider: ImageProvider
  imageModelName: string
  imageMaxPerProject: number
  whisperModel: string
}

class ConfigService {
  private config: ModelConfig

  constructor() {
    this.config = this.loadConfig()
    this.validate()
  }

  private loadConfig(): ModelConfig {
    return {
      fastModelProvider: (process.env.FAST_MODEL_PROVIDER as ModelProvider) || 'deepseek',
      fastModelName: process.env.FAST_MODEL_NAME || 'deepseek-v4-flash',
      heavyModelProvider: (process.env.HEAVY_MODEL_PROVIDER as ModelProvider) || 'deepseek',
      heavyModelName: process.env.HEAVY_MODEL_NAME || 'deepseek-v4-pro',
      ttsProvider: (process.env.TTS_PROVIDER as TTSProvider) || 'local',
      ttsModelName: process.env.TTS_MODEL_NAME || 'edge-tts',
      ttsVoice: process.env.TTS_VOICE || 'zh-CN-XiaoxiaoNeural',
      ttsLanguage: process.env.TTS_LANGUAGE || 'zh-CN',
      imageProvider: (process.env.IMAGE_PROVIDER as ImageProvider) || 'minimax',
      imageModelName: process.env.IMAGE_MODEL_NAME || 'image-01',
      imageMaxPerProject: parseInt(process.env.IMAGE_MAX_PER_PROJECT || '10', 10),
      whisperModel: process.env.WHISPER_MODEL || 'base',
    }
  }

  private validate(): void {
    // Auto-fallback: if selected provider has no key, switch to one that does
    const hasDeepSeek = !!process.env.DEEPSEEK_API_KEY
    const hasMinimax = !!process.env.MINIMAX_API_KEY
    const hasKimi = !!process.env.KIMI_API_KEY

    if (!hasDeepSeek && !hasMinimax && !hasKimi) {
      process.stderr.write('[VideoCraft Config] ⚠️  未配置任何 LLM API Key。请在 .env 文件中至少配置一个。\n')
      return
    }

    // Auto-switch fast/heavy model providers if selected one has no key
    if (this.config.fastModelProvider === 'deepseek' && !hasDeepSeek) {
      if (hasMinimax) { this.config.fastModelProvider = 'minimax'; this.config.fastModelName = 'minimax-m3' }
      else if (hasKimi) { this.config.fastModelProvider = 'kimi'; this.config.fastModelName = 'kimi-latest' }
    }
    if (this.config.heavyModelProvider === 'deepseek' && !hasDeepSeek) {
      if (hasMinimax) { this.config.heavyModelProvider = 'minimax'; this.config.heavyModelName = 'minimax-m3' }
      else if (hasKimi) { this.config.heavyModelProvider = 'kimi'; this.config.heavyModelName = 'kimi-latest' }
    }

    process.stderr.write(`[VideoCraft Config] ✅ API Keys: DeepSeek ${hasDeepSeek ? '✓' : '✗'}, Minimax ${hasMinimax ? '✓' : '✗'}, Kimi ${hasKimi ? '✓' : '✗'} → Fast=${this.config.fastModelProvider}/${this.config.fastModelName} Heavy=${this.config.heavyModelProvider}/${this.config.heavyModelName}\n`)
  }

  reload(): void {
    this.config = this.loadConfig()
    this.validate()
  }

  get<K extends keyof ModelConfig>(key: K): ModelConfig[K] {
    return this.config[key]
  }

  getApiKey(provider: ModelProvider): string | undefined {
    const keyMap: Record<string, string | undefined> = {
      deepseek: process.env.DEEPSEEK_API_KEY,
      minimax: process.env.MINIMAX_API_KEY,
      kimi: process.env.KIMI_API_KEY,
      local: undefined,
    }
    return keyMap[provider]
  }

  getAllConfig(): ModelConfig {
    return { ...this.config }
  }

  getApiKeyStatus(): Record<string, 'configured' | 'missing'> {
    return {
      deepseek: process.env.DEEPSEEK_API_KEY ? 'configured' : 'missing',
      minimax: process.env.MINIMAX_API_KEY ? 'configured' : 'missing',
      kimi: process.env.KIMI_API_KEY ? 'configured' : 'missing',
    }
  }
}

export const configService = new ConfigService()
