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

export class ComponentParserRegistry {
  private _parsers: ComponentParser[] = []

  register (parser: ComponentParser): void {
    this._parsers.push(parser)
  }

  run (ctx: ComponentParserContext): void {
    for (const parser of this._parsers) parser(ctx)
  }
}
