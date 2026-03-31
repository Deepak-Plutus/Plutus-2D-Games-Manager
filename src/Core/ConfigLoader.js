/**
 * Loads and parses game JSON config.
 */
export class ConfigLoader {
  /**
   * @param {string} url
   */
  static async fetch(url) {
    const res = await fetch(url, { credentials: 'same-origin' });
    if (!res.ok) {
      throw new Error(`Config fetch failed (${res.status}): ${url}`);
    }
    return res.text();
  }

  /**
   * @param {string} text
   * @returns {Record<string, unknown>}
   */
  static parse(text) {
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      throw new Error(`Invalid JSON in config: ${e.message}`);
    }
    if (!data || typeof data !== 'object') {
      throw new Error('Config root must be a JSON object');
    }
    return data;
  }
}
