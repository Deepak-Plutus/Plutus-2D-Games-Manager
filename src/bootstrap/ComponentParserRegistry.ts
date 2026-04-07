import type { BehaviorRegistry } from '../Behaviors/BehaviorRegistry.js'
import type { AssetRegistry } from '../Core/AssetRegistry.js'
import type { World } from '../ECS/World.js'
import type { Container } from 'pixi.js'

export type JsonRecord = Record<string, unknown>

export type ComponentParserContext = {
  world: World
  entityId: number
  merged: JsonRecord
  behaviorRegistry: BehaviorRegistry
  registry: AssetRegistry
  stage: Container
}

export type ComponentParser = (ctx: ComponentParserContext) => void

/**
 * Ordered registry of component parsers used during entity build.
 */
export class ComponentParserRegistry {
  private _parsers: ComponentParser[] = []

  /**
   * Adds a parser to the execution chain.
   *
   * @param {ComponentParser} parser Parser callback.
   * @returns {void} Nothing.
   */
  register (parser: ComponentParser): void {
    this._parsers.push(parser)
  }

  /**
   * Executes all registered parsers with shared context.
   *
   * @param {ComponentParserContext} ctx Parse context.
   * @returns {void} Nothing.
   */
  run (ctx: ComponentParserContext): void {
    for (const parser of this._parsers) parser(ctx)
  }
}
