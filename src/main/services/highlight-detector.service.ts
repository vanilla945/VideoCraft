import type { SubtitleItem } from '../../shared/types/subtitle'

export interface HighlightScore {
  subtitleId: string
  score: number              // 0-100
  dimensions: {
    speechRate: number       // 语速异常激励
    keywordMatch: number     // 关键词匹配
    emotion: number          // 情绪强度
    sceneChange: number      // 画面变化
    userRelevance: number    // 用户意图相关度
    informationDensity: number // 信息密度
  }
  confidence: number
  label: string              // '高光' | '重要' | '过渡' | '可删'
}

export interface HighlightConfig {
  biasTags: string[]         // user-specified highlight preferences
  targetDuration?: number    // if set, only keep top N%
}

class HighlightDetectorService {
  // Chinese positive-emotion keywords
  private emotionKeywords = [
    '震撼', '惊艳', '突破', '领先', '第一', '首次', '独家',
    '重要', '关键', '核心', '必须', '绝对', '完美',
    '惊喜', '优惠', '免费', '限时', '抢购', '爆款',
    '感谢', '感动', '温暖', '幸福', '开心',
  ]

  // Keywords that indicate high information density
  private infoDensityKeywords = [
    '数据', '统计', '对比', '分析', '证明', '显示',
    '例如', '比如', '首先', '其次', '最后', '总结',
    '因为', '所以', '因此', '结论',
  ]

  scoreSubtitles(
    subtitles: SubtitleItem[],
    config: HighlightConfig,
    userKeyPoints?: string[]
  ): HighlightScore[] {
    return subtitles.map((sub) => {
      const text = sub.text.trim()

      // 1. Speech rate penalty/boost (longer text = more info)
      const wordsPerSecond = text.length / Math.max(sub.endTime - sub.startTime, 0.1)
      const speechRate = this.normalizeScore(wordsPerSecond, 3, 20) * 25

      // 2. Keyword match
      const keywordScore = this.scoreKeywordMatch(text) * 20

      // 3. Emotion keywords
      const emotionScore = this.emotionKeywords.filter(kw => text.includes(kw)).length * 12

      // 4. Information density
      const infoScore = this.infoDensityKeywords.filter(kw => text.includes(kw)).length * 12

      // 5. Scene change bonus (pass-through, filled by caller)
      const sceneChange = 10  // default; caller can override

      // 6. User relevance
      let userRelevance = 10
      if (userKeyPoints?.length) {
        const matchCount = userKeyPoints.filter(kp =>
          text.includes(kp) || this.fuzzyMatch(text, kp)
        ).length
        userRelevance = Math.min(25, matchCount * 8 + 10)
      }

      // 7. Bias tags
      let biasBonus = 0
      if (config.biasTags?.length) {
        biasBonus = config.biasTags.filter(tag => text.includes(tag)).length * 10
      }

      const total = Math.min(100,
        speechRate + keywordScore + emotionScore + infoScore + sceneChange + userRelevance + biasBonus
      )

      // Confidence: higher for longer segments with matching keywords
      const confidence = Math.min(0.95, 0.3 + (keywordScore + emotionScore) / 40)

      return {
        subtitleId: sub.id,
        score: Math.round(total),
        dimensions: {
          speechRate: Math.round(speechRate),
          keywordMatch: Math.round(keywordScore),
          emotion: Math.round(emotionScore),
          sceneChange: Math.round(sceneChange),
          userRelevance: Math.round(userRelevance),
          informationDensity: Math.round(infoScore),
        },
        confidence: Math.round(confidence * 100) / 100,
        label: this.classifyScore(total),
      }
    })
  }

  selectHighlights(
    scores: HighlightScore[],
    subtitles: SubtitleItem[],
    targetDuration?: number
  ): HighlightScore[] {
    const sorted = [...scores].sort((a, b) => b.score - a.score)

    if (targetDuration && targetDuration > 0) {
      // Select top % until target duration is reached
      const kept: HighlightScore[] = []
      let totalDuration = 0

      for (const score of sorted) {
        if (score.label === '可删') continue
        const sub = subtitles.find(s => s.id === score.subtitleId)
        const dur = sub ? sub.endTime - sub.startTime : 0
        if (totalDuration + dur > targetDuration * 0.9) break
        kept.push(score)
        totalDuration += dur
      }

      return kept
    }

    return sorted
  }

  private scoreKeywordMatch(text: string): number {
    const allKeywords = [...this.emotionKeywords, ...this.infoDensityKeywords]
    const matches = allKeywords.filter(kw => text.includes(kw))
    return Math.min(5, matches.length)
  }

  private fuzzyMatch(text: string, keyword: string): boolean {
    // Simple: check if any 2-char substring of keyword appears in text
    if (keyword.length < 2) return text.includes(keyword)
    for (let i = 0; i < keyword.length - 1; i++) {
      if (text.includes(keyword.substring(i, i + 2))) return true
    }
    return false
  }

  private normalizeScore(value: number, min: number, max: number): number {
    return Math.max(0, Math.min(1, (value - min) / (max - min)))
  }

  private classifyScore(score: number): string {
    if (score >= 70) return '高光'
    if (score >= 45) return '重要'
    if (score >= 25) return '过渡'
    return '可删'
  }
}

export const highlightDetectorService = new HighlightDetectorService()
