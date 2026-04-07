import type { GameConfig } from './GameConfig.js'
import { validateGameConfigShape } from './ConfigValidation.js'

export class ConfigLoader {
  static async fetch (url: string): Promise<string> {
    const res = await globalThis.fetch(url, { credentials: 'same-origin' })
    if (!res.ok) throw new Error(`Config fetch failed (${res.status}): ${url}`)
    return res.text()
  }

  static parse (text: string): GameConfig {
    let data: unknown
    try {
      data = JSON.parse(text)
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      throw new Error(`Invalid JSON in config: ${message}`)
    }
    if (!data || typeof data !== 'object') {
      throw new Error('Config root must be a JSON object')
    }
    const root = data as Record<string, unknown>
    validateGameConfigShape(root)
    return root as GameConfig
  }
}
