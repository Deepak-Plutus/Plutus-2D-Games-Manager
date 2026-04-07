import type { BootstrapContributionRegistry, BootstrapContext } from './BootstrapContributionRegistry.js'

type DefaultBootstrapHooks = {
  startSystems: () => void
  spawnEntities: (ctx: BootstrapContext) => void
  bootstrapGameSystems: (ctx: BootstrapContext) => void
}

/**
 * Registers default bootstrap hook wiring for system start/entity spawn/game boot.
 *
 * @param {BootstrapContributionRegistry} registry Contribution registry.
 * @param {DefaultBootstrapHooks} hooks Hook implementation bundle.
 * @returns {void} Nothing.
 */
export function registerDefaultBootstrapContributions (
  registry: BootstrapContributionRegistry,
  hooks: DefaultBootstrapHooks
): void {
  registry.register('beforeEntities', () => {
    hooks.startSystems()
  })

  registry.register('afterEntities', ctx => {
    hooks.bootstrapGameSystems(ctx)
  })

  registry.register('beforeEntities', ctx => {
    hooks.spawnEntities(ctx)
  })
}
