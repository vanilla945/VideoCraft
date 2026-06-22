import type { CustomProvider } from '../../shared/types/provider-registry'

class ProviderRegistryService {
  private providers: Map<string, CustomProvider> = new Map()

  register(provider: CustomProvider): void {
    this.providers.set(provider.id, provider)
  }

  unregister(id: string): void {
    this.providers.delete(id)
  }

  list(): CustomProvider[] {
    return Array.from(this.providers.values())
  }

  get(id: string): CustomProvider | undefined {
    return this.providers.get(id)
  }

  async testConnection(id: string): Promise<boolean> {
    const provider = this.providers.get(id)
    if (!provider) return false

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      await fetch(`${provider.baseURL}/models`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${provider.apiKey}` },
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
      return true
    } catch {
      return false
    }
  }

  getModelsForCategory(category: string): Array<{ provider: string; model: string; label: string }> {
    const results: Array<{ provider: string; model: string; label: string }> = []

    for (const p of this.providers.values()) {
      for (const model of p.models) {
        if (model.category === category) {
          results.push({ provider: p.id, model: model.id, label: `${p.name} — ${model.name}` })
        }
      }
    }

    return results
  }
}

export const providerRegistry = new ProviderRegistryService()
