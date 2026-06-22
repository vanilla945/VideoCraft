import fs from 'fs'
import path from 'path'
import { modelRouter } from './model-router.service'

interface VisionResult {
  classification: string          // '人物' | '风景' | '产品' | '文字' | '室内' | '户外' | '其他'
  description: string             // AI 语义描述
  emotions: string[]              // 情绪标签
  keyObjects: string[]            // 关键物体
  isImportant: boolean            // 是否为高价值画面
}

class VisionService {
  async classifyScene(imagePath: string): Promise<VisionResult> {
    try {
      const imageBase64 = fs.readFileSync(imagePath, { encoding: 'base64' })
      const prompt = `描述这张图片。返回 JSON 格式: { "classification": "人物/风景/产品/文字/室内/户外/其他", "description": "简短描述", "emotions": ["情绪标签"], "keyObjects": ["关键物体"], "isImportant": true/false }`

      const result = await modelRouter.visionComplete('fast', imageBase64, prompt, 500)

      try {
        const jsonMatch = result.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0])
        }
      } catch {
        // Fallback
      }

      return {
        classification: '其他',
        description: result.substring(0, 200),
        emotions: [],
        keyObjects: [],
        isImportant: false,
      }
    } catch (err) {
      console.warn('[Vision] 场景分类失败:', (err as Error).message)
      return {
        classification: '其他',
        description: '无法分析',
        emotions: [],
        keyObjects: [],
        isImportant: false,
      }
    }
  }

  async deepAnalyze(imagePath: string): Promise<VisionResult> {
    try {
      const imageBase64 = fs.readFileSync(imagePath, { encoding: 'base64' })
      const prompt = `请深度分析这张视频关键帧。包括：1) 场景类型和氛围 2) 画面中的人物/物体/文字 3) 情绪基调 4) 叙事价值（这帧是否适合作为封面/高光时刻）。请用 JSON 格式返回: { "classification": "...", "description": "...", "emotions": [...], "keyObjects": [...], "isImportant": true/false }`

      const result = await modelRouter.visionComplete('heavy', imageBase64, prompt, 1000)

      try {
        const jsonMatch = result.match(/\{[\s\S]*\}/)
        if (jsonMatch) return JSON.parse(jsonMatch[0])
      } catch { /* fallback */ }

      return {
        classification: '其他',
        description: result.substring(0, 300),
        emotions: [],
        keyObjects: [],
        isImportant: result.toLowerCase().includes('重要') || result.toLowerCase().includes('important'),
      }
    } catch (err) {
      console.warn('[Vision] 深度分析失败:', (err as Error).message)
      return { classification: '其他', description: '深度分析暂时不可用', emotions: [], keyObjects: [], isImportant: false }
    }
  }

  async analyzeBatch(imagePaths: string[], mode: 'fast' | 'heavy' = 'fast'): Promise<VisionResult[]> {
    const results: VisionResult[] = []
    for (const imgPath of imagePaths) {
      const result = mode === 'heavy'
        ? await this.deepAnalyze(imgPath)
        : await this.classifyScene(imgPath)
      results.push(result)
    }
    return results
  }
}

export const visionService = new VisionService()
