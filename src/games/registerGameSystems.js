import { PlatformerGameSystem } from './PlatformerGameSystem.js';
import { Game2048Game } from './Game2048Game.js';
import { FlappyBirdGame } from './FlappyBirdGame.js';

/**
 * Game-layer registrations only (kept out of core engine wiring).
 * Add new games here without touching `src/Core/GameManager.js`.
 *
 * @type {Record<string, () => import('../Systems/BaseSystem.js').BaseSystem>}
 */
const GAME_SYSTEM_FACTORIES = {
  platformerGame: () => new PlatformerGameSystem(),
  game2048: () => new Game2048Game(),
  flappyBird: () => new FlappyBirdGame(),
};

/**
 * Create only game systems referenced by the parsed config.
 * A game system is selected when either:
 * - `systems.<name>` exists in config, or
 * - a root `<name>` block exists in config.
 *
 * @param {Record<string, unknown>} config
 * @returns {Array<{ name: string, system: import('../Systems/BaseSystem.js').BaseSystem }>}
 */
export function createGameSystemsForConfig(config) {
  const systemsBlock =
    config.systems && typeof config.systems === 'object'
      ? /** @type {Record<string, unknown>} */ (config.systems)
      : {};
  const out = [];
  for (const [name, factory] of Object.entries(GAME_SYSTEM_FACTORIES)) {
    if (systemsBlock[name] != null || config[name] != null) {
      out.push({ name, system: factory() });
    }
  }
  return out;
}
