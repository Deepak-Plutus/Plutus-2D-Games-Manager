export type JsonPrimitive = string | number | boolean | null
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[]
export type JsonObject = { [key: string]: JsonValue }

export type BehaviorConfig = {
  type: string
  enabled?: boolean
} & JsonObject

export type TransformConfig = {
  x?: number
  y?: number
  rotation?: number
  scaleX?: number
  scaleY?: number
}

export type CollisionConfig = {
  kind?: string
  width?: number
  height?: number
  offsetX?: number
  offsetY?: number
}

export type LayerConfig = {
  name: string
  zIndex?: number
}

export type ObjectTypeConfig = {
  id: string
  plugin?: string
  layer?: string | { name?: string; zIndex?: number }
  transform?: TransformConfig
  collision?: CollisionConfig
  behaviors?: BehaviorConfig[]
  tags?: string[]
  instanceVariables?: Record<string, JsonValue>
} & JsonObject

export type EntityConfig = {
  id?: string
  uid?: number
  type?: string
  plugin?: string
  layer?: string | { name?: string; zIndex?: number }
  transform?: TransformConfig
  collision?: CollisionConfig
  behaviors?: BehaviorConfig[]
  tags?: string[]
  instanceVariables?: Record<string, JsonValue>
} & JsonObject

export type AssetConfig = {
  id: string
  url: string
  type?: string
} & JsonObject

export type InputConfig = {
  actions?: Record<string, JsonValue>
  wheel?: { enabled?: boolean } & JsonObject
  gamepad?: { enabled?: boolean } & JsonObject
} & JsonObject

export type AppConfig = {
  fullscreen?: boolean
  width?: number | string
  height?: number | string
  background?: string
} & JsonObject

export type GameConfig = {
  broadcastChannel?: string
  app?: AppConfig
  systems?: Record<string, JsonObject>
  systemsOrder?: string[]
  input?: InputConfig
  layers?: LayerConfig[]
  objectTypes?: ObjectTypeConfig[]
  assets?: AssetConfig[]
  entities?: EntityConfig[]
} & JsonObject

export type GameConfigSchema = GameConfig

export function defineGameConfig<T extends GameConfig> (config: T): T {
  return config
}
