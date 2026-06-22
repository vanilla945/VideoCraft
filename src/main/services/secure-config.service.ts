import { safeStorage } from 'electron'

interface SecuritySettings {
  allowImageGen: boolean
  allowTTS: boolean
  allowVideoUpload: boolean
  enforceHTTPS: boolean
}

class SecureConfigService {
  private defaults: SecuritySettings = {
    allowImageGen: true,
    allowTTS: true,
    allowVideoUpload: false,
    enforceHTTPS: true,
  }

  async encryptKey(plaintext: string): Promise<string> {
    if (safeStorage.isEncryptionAvailable()) {
      return safeStorage.encryptString(plaintext).toString('base64')
    }
    return Buffer.from(plaintext).toString('base64') // fallback
  }

  async decryptKey(encrypted: string): Promise<string> {
    try {
      if (safeStorage.isEncryptionAvailable()) {
        return safeStorage.decryptString(Buffer.from(encrypted, 'base64'))
      }
      return Buffer.from(encrypted, 'base64').toString('utf-8')
    } catch {
      return ''
    }
  }

  getSettings(): SecuritySettings {
    return { ...this.defaults }
  }

  validateURL(url: string): boolean {
    if (!this.defaults.enforceHTTPS) return true
    return url.startsWith('https://')
  }
}

export const secureConfigService = new SecureConfigService()
