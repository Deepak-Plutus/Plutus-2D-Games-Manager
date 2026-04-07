const DEFAULT_CONFIG_PATH = '/platformer.json'

/**
 * Resolves game config URL from query params with project defaults.
 */
export class ConfigResolver {
  static DEFAULT_PATH = DEFAULT_CONFIG_PATH

  /**
   * Returns config URL from `?config=` query param or falls back to default.
   *
   * @returns {string} Resolved config URL.
   */
  static resolveUrlFromQuery (): string {
    const param = new URLSearchParams(window.location.search).get('config')
    if (param && param.trim()) {
      return decodeURIComponent(param.trim())
    }
    console.warn(
      `[Game Manager] No ?config= in URL; loading ${DEFAULT_CONFIG_PATH}. Examples: ?config=/platformer.json or ?config=/2048.json`
    )
    return DEFAULT_CONFIG_PATH
  }
}
