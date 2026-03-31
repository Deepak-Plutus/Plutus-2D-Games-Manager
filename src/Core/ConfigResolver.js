/**
 * Built-in fallback when the page has no `?config=` query.
 * Swap levels by URL only — e.g. `?config=/platformer.json` — without changing this file.
 */
const DEFAULT_CONFIG_PATH = '/config.sample.json';

/**
 * Resolves the config document URL (e.g. from `?config=`).
 */
export class ConfigResolver {
  static DEFAULT_PATH = DEFAULT_CONFIG_PATH;

  /**
   * Reads `?config=<url>`. Falls back to {@link ConfigResolver.DEFAULT_PATH} when omitted.
   * @returns {string}
   */
  static resolveUrlFromQuery() {
    const param = new URLSearchParams(window.location.search).get('config');
    if (param && param.trim()) {
      return decodeURIComponent(param.trim());
    }
    console.warn(
      `[Game Manager] No ?config= in URL; loading ${DEFAULT_CONFIG_PATH}. Examples: ?config=/platformer.json or ?config=/2048.json`,
    );
    return DEFAULT_CONFIG_PATH;
  }
}
