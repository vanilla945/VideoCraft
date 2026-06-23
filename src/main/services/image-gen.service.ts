import path from 'path'
import fs from 'fs'
import { app } from 'electron'
import { randomUUID } from 'crypto'
import { configService } from './config.service'

interface ImageGenResult {
  imagePath: string
  prompt: string
  width: number
  height: number
}

class ImageGenService {
  private outputDir: string
  private generatedCount: number = 0

  constructor() {
    this.outputDir = path.join(app.getPath('userData'), 'generated_images')
    if (!fs.existsSync(this.outputDir)) fs.mkdirSync(this.outputDir, { recursive: true })
  }

  resetCount(): void {
    this.generatedCount = 0
  }

  async generateCover(prompt: string, style?: string): Promise<ImageGenResult | null> {
    if (!configService.get('imageProvider') || configService.get('imageProvider') === 'none') {
      console.log('[ImageGen] 图像生成已关闭')
      return null
    }

    const fullPrompt = style ? `${style} | ${prompt}` : prompt
    return this.callAPI(fullPrompt, 1792, 1024)
  }

  async generateBroll(prompt: string, style?: string): Promise<ImageGenResult | null> {
    if (!configService.get('imageProvider') || configService.get('imageProvider') === 'none') {
      return null
    }

    if (this.generatedCount >= configService.get('imageMaxPerProject')) {
      console.warn(`[ImageGen] 已达本项生成上限 (${configService.get('imageMaxPerProject')})`)
      return null
    }

    const fullPrompt = style ? `${style} | ${prompt}` : prompt
    return this.callAPI(fullPrompt, 1920, 1080)
  }

  async generateBatch(
    prompts: Array<{ prompt: string; width?: number; height?: number }>
  ): Promise<ImageGenResult[]> {
    if (!configService.get('imageProvider') || configService.get('imageProvider') === 'none') {
      return []
    }

    const max = configService.get('imageMaxPerProject')
    const results: ImageGenResult[] = []

    for (const p of prompts) {
      if (this.generatedCount >= max) break
      const result = await this.callAPI(p.prompt, p.width || 1920, p.height || 1080)
      if (result) results.push(result)
    }

    return results
  }

  private async callAPI(
    prompt: string,
    width: number,
    height: number
  ): Promise<ImageGenResult | null> {
    const provider = configService.get('imageProvider') as string
    const apiKey = configService.getApiKey(provider as any)

    if (!apiKey) {
      console.warn(`[ImageGen] 未配置 ${provider} API Key`)
      return null
    }

    try {
      let imageUrl: string | null = null

      if (provider === 'minimax') {
        imageUrl = await this.callMinimaxImage(prompt, apiKey, width, height)
      } else {
        // Placeholder for other providers
        console.warn(`[ImageGen] 不支持的图像供应商: ${provider}`)
        return null
      }

      if (!imageUrl) return null

      // Download and save image
      const imageBuffer = await this.downloadImage(imageUrl)
      const ext = '.png'
      const outputPath = path.join(this.outputDir, `img_${randomUUID()}${ext}`)
      fs.writeFileSync(outputPath, imageBuffer)

      this.generatedCount++
      console.log(`[ImageGen] ✅ 生成成功 (${this.generatedCount}) — ${prompt.slice(0, 50)}...`)

      return { imagePath: outputPath, prompt, width, height }
    } catch (err) {
      console.error('[ImageGen] 生成失败:', (err as Error).message)
      return null
    }
  }

  private async downloadImage(url: string): Promise<Buffer> {
    const response = await fetch(url)
    const arrayBuffer = await response.arrayBuffer()
    return Buffer.from(arrayBuffer)
  }

  private async callMinimaxImage(
    prompt: string,
    apiKey: string,
    width: number,
    height: number
  ): Promise<string | null> {
    const response = await fetch('https://api.minimax.chat/v1/image/generation', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: configService.get('imageModelName'),
        prompt,
        n: 1,
        size: `${width}x${height}`,
      }),
    })

    const data = await response.json() as any
    return data?.data?.[0]?.url || null
  }
}

export const imageGenService = new ImageGenService()
