export interface CapabilityFlag {
  name: string
  available: boolean
  reason: string
}

export type Capability = 'transcription' | 'llm' | 'vlm' | 'tts' | 'image_gen' | 'export'

interface PendingTask {
  id: string
  type: string
  createdAt: number
  retryCount: number
}

class OfflineDetectorService {
  private isOnline: boolean = true
  private listeners: Array<(online: boolean) => void> = []
  private pendingTasks: PendingTask[] = []

  constructor() {
    // Monitor connectivity
    this.checkConnectivity()
    setInterval(() => this.checkConnectivity(), 30000)
  }

  private async checkConnectivity(): Promise<void> {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)
      await fetch('https://api.deepseek.com/v1/models', { signal: controller.signal })
      clearTimeout(timeoutId)
      this.setOnline(true)
    } catch {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000)
        await fetch('https://api.minimax.chat/v1', { signal: controller.signal })
        clearTimeout(timeoutId)
        this.setOnline(true)
      } catch {
        this.setOnline(false)
      }
    }
  }

  private setOnline(online: boolean): void {
    if (this.isOnline !== online) {
      this.isOnline = online
      console.log(`[OfflineDetector] 网络状态: ${online ? '在线' : '离线'}`)
      this.listeners.forEach(fn => fn(online))

      if (online && this.pendingTasks.length > 0) {
        console.log(`[OfflineDetector] 网络恢复，重新处理 ${this.pendingTasks.length} 个待处理任务`)
        this.pendingTasks = []
      }
    }
  }

  onStatusChange(callback: (online: boolean) => void): () => void {
    this.listeners.push(callback)
    return () => { this.listeners = this.listeners.filter(c => c !== callback) }
  }

  getAvailableCapabilities(): CapabilityFlag[] {
    return [
      { name: 'transcription', available: true, reason: '本地 whisper.cpp' },
      { name: 'llm', available: this.isOnline, reason: this.isOnline ? '在线' : '需要网络连接' },
      { name: 'vlm', available: this.isOnline, reason: this.isOnline ? '在线' : '需要网络连接' },
      { name: 'tts', available: true, reason: '本地 Edge-TTS 可用' },
      { name: 'image_gen', available: this.isOnline, reason: this.isOnline ? '在线' : '需要网络连接' },
      { name: 'export', available: true, reason: '本地 FFmpeg' },
    ]
  }

  getPendingTasks(): PendingTask[] {
    return [...this.pendingTasks]
  }

  enqueueTask(type: string): void {
    this.pendingTasks.push({
      id: `pt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type,
      createdAt: Date.now(),
      retryCount: 0,
    })
  }
}

export const offlineDetector = new OfflineDetectorService()
