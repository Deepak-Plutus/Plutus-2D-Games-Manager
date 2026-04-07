import type { AssetRegistry } from '../Core/AssetRegistry.js'
import type { GameConfig } from '../Core/GameConfig.js'
import type { InputCoordinator } from '../Core/InputCoordinator.js'
import type { InputEventHub } from '../Core/InputEventHub.js'
import type { Container } from 'pixi.js'
import type { EntityBuilder } from '../Entities/EntityBuilder.js'
import type { World } from '../ECS/World.js'

export type BootstrapContext = {
  config: GameConfig
  world: World
  entityBuilder: EntityBuilder
  registry: AssetRegistry
  worldLayer: Container
  uiLayer: Container
  inputCoordinator: InputCoordinator
  inputHub: InputEventHub
}

export type BootstrapStage = 'beforeEntities' | 'afterEntities' | 'afterSystemsReady'
export type BootstrapContribution = (ctx: BootstrapContext) => void

/**
 * Stores bootstrap callbacks and executes them by stage.
 */
export class BootstrapContributionRegistry {
  private _beforeEntities: BootstrapContribution[] = []
  private _afterEntities: BootstrapContribution[] = []
  private _afterSystemsReady: BootstrapContribution[] = []

  /**
   * Registers a contribution callback for a bootstrap stage.
   *
   * @param {BootstrapStage} stage Stage key.
   * @param {BootstrapContribution} contribution Callback to run.
   * @returns {void} Nothing.
   */
  register (stage: BootstrapStage, contribution: BootstrapContribution): void {
    if (stage === 'beforeEntities') this._beforeEntities.push(contribution)
    if (stage === 'afterEntities') this._afterEntities.push(contribution)
    if (stage === 'afterSystemsReady') this._afterSystemsReady.push(contribution)
  }

  /**
   * Runs all contributions for the given stage.
   *
   * @param {BootstrapStage} stage Stage key.
   * @param {BootstrapContext} context Bootstrap context object.
   * @returns {void} Nothing.
   */
  run (stage: BootstrapStage, context: BootstrapContext): void {
    const list =
      stage === 'beforeEntities'
        ? this._beforeEntities
        : stage === 'afterEntities'
          ? this._afterEntities
          : this._afterSystemsReady
    for (const contribution of list) contribution(context)
  }
}
