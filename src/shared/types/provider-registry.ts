export interface CustomProvider {
  id: string
  name: string
  baseURL: string
  apiKey: string
  models: { id: string; name: string; category: 'fast' | 'heavy' | 'tts' | 'image' }[]
  createdAt: string
}
