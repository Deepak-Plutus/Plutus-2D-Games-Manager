import type { BaseSystem } from '../Systems/BaseSystem.js'
import type { GameConfig } from '../Core/GameConfig.js'
import { SystemFactoryRegistry } from '../bootstrap/SystemFactoryRegistry.js'
import { FlappyBirdGame } from './FlappyBirdGame.js'
import { Game2048Game } from './Game2048Game.js'
import { PlatformerGameSystem } from './PlatformerGameSystem.js'
import { StealthAssassinGame } from './StealthAssassinGame.js'

type GameSystemEntry = { name: string; system: BaseSystem }

export function registerGameSystemFactories (registry: SystemFactoryRegistry): void {
  registry.register({
    name: 'platformerGame',
    create: () => new PlatformerGameSystem(),
    phase: 'gameplay',
    isEnabled: config => (config.systems?.platformerGame != null || config.platformerGame != null)
  })
  registry.register({
    name: 'game2048',
    create: () => new Game2048Game(),
    phase: 'gameplay',
    isEnabled: config => (config.systems?.game2048 != null || config.game2048 != null)
  })
  registry.register({
    name: 'flappyBird',
    create: () => new FlappyBirdGame(),
    phase: 'gameplay',
    isEnabled: config => (config.systems?.flappyBird != null || config.flappyBird != null)
  })
  registry.register({
    name: 'stealthAssassin',
    create: () => new StealthAssassinGame(),
    phase: 'gameplay',
    after: ['platformerGame', 'game2048', 'flappyBird'],
    isEnabled: config => (config.systems?.stealthAssassin != null || config.stealthAssassin != null)
  })
}

export function createGameSystemsForConfig (config: GameConfig): GameSystemEntry[] {
  const registry = new SystemFactoryRegistry()
  registerGameSystemFactories(registry)
  return registry.resolveForConfig(config)
}
