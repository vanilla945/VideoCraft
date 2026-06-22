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
    const issues: string[] = []

    if (!process.env.DEEPSEEK_API_KEY && !process.env.MINIMAX_API_KEY && !process.env.KIMI_API_KEY) {
      issues.push('未配置任何 LLM API Key (DEEPSEEK_API_KEY / MINIMAX_API_KEY / KIMI_API_KEY)。请在 .env 文件中至少配置一个。')
    }

    if (this.config.fastModelProvider === 'deepseek' && !process.env.DEEPSEEK_API_KEY) {
      issues.push('简单快速模型设置为 DeepSeek，但未配置 DEEPSEEK_API_KEY')
    }
    if (this.config.heavyModelProvider === 'deepseek' && !process.env.DEEPSEEK_API_KEY) {
      issues.push('深度理解模型设置为 DeepSeek，但未配置 DEEPSEEK_API_KEY')
    }
    if (this.config.ttsProvider === 'minimax' && !process.env.MINIMAX_API_KEY) {
      issues.push('TTS 模型设置为 Minimax，但未配置 MINIMAX_API_KEY')
    }
    if (this.config.imageProvider === 'minimax' && !process.env.MINIMAX_API_KEY) {
      issues.push('图像生成模型设置为 Minimax，但未配置 MINIMAX_API_KEY')
    }

    for (const issue of issues) {
      console.warn(`[VideoCraft Config] ⚠️  ${issue}`)
    }

    const configured = [process.env.DEEPSEEK_API_KEY, process.env.MINIMAX_API_KEY, process.env.KIMI_API_KEY].filter(Boolean)
    if (configured.length > 0) {
      console.log(`[VideoCraft Config] ✅ 已加载 ${configured.length} 个 API Key，配置就绪`)
    }
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
