import { Graphics, Sprite, TilingSprite } from 'pixi.js'
import type { BLEND_MODES, Container, Texture } from 'pixi.js'
import {
  COMPONENT_DISPLAY,
  COMPONENT_LAYER,
  COMPONENT_META,
  COMPONENT_SPRITE,
  COMPONENT_TILED_SPRITE,
  COMPONENT_TRANSFORM
} from '../Components/index.js'
import type { SpriteData, TiledSpriteData } from '../Components/RenderingComponents.js'
import type { Transform } from '../Components/Transform.js'
import type { World } from '../ECS/World.js'
import type { AssetRegistry } from './AssetRegistry.js'
import { getDisplayMountParent, getLocalDisplayTransform } from './DisplayHierarchy.js'

type LayerShape = { zIndex: number }
type MetaShape = { visible?: boolean }
type DisplayShape = { view?: Container | null }
type AssetEntry = {
  kind?: string
  width?: number
  height?: number
  texture?: Texture
}

function packRgbTint (tint: number): number {
  const n = Number(tint)
  if (!Number.isFinite(n)) return 0xffffff
  return (Math.trunc(n) >>> 0) & 0xffffff
}

function applyVisualStyle (view: Container & { tint: number; blendMode: BLEND_MODES }, tint: number, blendMode: string): void {
  view.tint = packRgbTint(tint)
  if (blendMode && blendMode !== 'normal') {
    view.blendMode = blendMode as unknown as BLEND_MODES
  }
}

function applySpriteDataToPixiSprite (data: SpriteData, entry: AssetEntry, sprite: Sprite): void {
  sprite.anchor.set(data.anchorX, data.anchorY)
  if (entry.width != null) sprite.width = entry.width
  if (entry.height != null) sprite.height = entry.height
  applyVisualStyle(sprite as unknown as Container & { tint: number; blendMode: BLEND_MODES }, data.tint, data.blendMode)
}

function tintToRgb (tint: number): number {
  return packRgbTint(tint)
}

function createCircleGraphics (data: SpriteData, transform: Transform): Graphics {
  const r =
    data.circleRadius != null && data.circleRadius > 0
      ? data.circleRadius
      : Math.min(Math.abs(transform.scaleX), Math.abs(transform.scaleY)) / 2
  const g = new Graphics()
  g.circle(0, 0, Math.max(1, r))
  g.fill({ color: tintToRgb(data.tint) })
  if (data.blendMode && data.blendMode !== 'normal') {
    g.blendMode = data.blendMode as unknown as BLEND_MODES
  }
  ;(g as unknown as { userData: unknown }).userData = { plutusCircle: true }
  return g
}

function createRectGraphics (data: SpriteData): Graphics {
  const g = new Graphics()
  g.rect(-0.5, -0.5, 1, 1)
  g.fill({ color: tintToRgb(data.tint) })
  if (data.blendMode && data.blendMode !== 'normal') {
    g.blendMode = data.blendMode as unknown as BLEND_MODES
  }
  return g
}

function applyTiledDataToPixi (data: TiledSpriteData, texture: Texture, ts: TilingSprite): void {
  ts.anchor.set(0.5, 0.5)
  const texW = texture.width || 1
  const texH = texture.height || 1
  const scaleX = (data.tileWidth > 0 ? texW / data.tileWidth : 1) * data.uvScaleX
  const scaleY = (data.tileHeight > 0 ? texH / data.tileHeight : 1) * data.uvScaleY
  ts.tileScale.set(scaleX, scaleY)
  applyVisualStyle(ts as unknown as Container & { tint: number; blendMode: BLEND_MODES }, data.tint, data.blendMode)
}

export function createPixiViewForEntity (
  world: World,
  entityId: number,
  registry: AssetRegistry,
  stage: Container
): Container | null {
  const transform = world.getComponent<Transform>(entityId, COMPONENT_TRANSFORM)
  const layer = world.getComponent<LayerShape>(entityId, COMPONENT_LAYER)
  const meta = world.getComponent<MetaShape>(entityId, COMPONENT_META)
  if (!transform || !layer) return null

  const tiledData = world.getComponent<TiledSpriteData>(entityId, COMPONENT_TILED_SPRITE)
  const spriteData = world.getComponent<SpriteData>(entityId, COMPONENT_SPRITE)

  if (tiledData?.assetId) {
    const entry = registry.get(tiledData.assetId)
    if (entry?.kind === 'texture' && entry.texture) {
      const w = tiledData.width > 0 ? tiledData.width : (entry.width ?? 256)
      const h = tiledData.height > 0 ? tiledData.height : (entry.height ?? 256)
      const ts = new TilingSprite({
        texture: entry.texture,
        width: w,
        height: h
      })
      applyTiledDataToPixi(tiledData, entry.texture, ts)
      const local = getLocalDisplayTransform(world, entityId, transform)
      ts.position.set(local.x, local.y)
      ts.rotation = local.rotation
      ts.scale.set(local.scaleX, local.scaleY)
      ts.visible = meta?.visible !== false
      ts.zIndex = layer.zIndex
      getDisplayMountParent(world, entityId, stage).addChild(ts)
      return ts
    }
  }

  if (spriteData && String(spriteData.shape).toLowerCase() === 'circle') {
    const disk = createCircleGraphics(spriteData, transform)
    const local = getLocalDisplayTransform(world, entityId, transform)
    disk.position.set(local.x, local.y)
    disk.rotation = local.rotation
    disk.scale.set(1, 1)
    disk.visible = meta?.visible !== false
    disk.zIndex = layer.zIndex
    getDisplayMountParent(world, entityId, stage).addChild(disk)
    return disk
  }

  if (spriteData && String(spriteData.shape).toLowerCase() === 'rect' && !spriteData.assetId) {
    const rect = createRectGraphics(spriteData)
    const local = getLocalDisplayTransform(world, entityId, transform)
    rect.position.set(local.x, local.y)
    rect.rotation = local.rotation
    rect.scale.set(local.scaleX, local.scaleY)
    rect.visible = meta?.visible !== false
    rect.zIndex = layer.zIndex
    getDisplayMountParent(world, entityId, stage).addChild(rect)
    return rect
  }

  if (spriteData?.assetId) {
    const entry = registry.get(spriteData.assetId)
    if (entry?.kind === 'texture' && entry.texture) {
      const sprite = new Sprite({ texture: entry.texture })
      applySpriteDataToPixiSprite(spriteData, entry, sprite)
      const local = getLocalDisplayTransform(world, entityId, transform)
      sprite.position.set(local.x, local.y)
      sprite.rotation = local.rotation
      sprite.scale.set(local.scaleX, local.scaleY)
      sprite.visible = meta?.visible !== false
      sprite.zIndex = layer.zIndex
      getDisplayMountParent(world, entityId, stage).addChild(sprite)
      return sprite
    }
  }

  return null
}

export function mountPixiDisplayForEntity (
  world: World,
  entityId: number,
  registry: AssetRegistry,
  stage: Container,
  displayKey = COMPONENT_DISPLAY
): Container | null {
  const existing = world.getComponent<DisplayShape>(entityId, displayKey)
  const oldView = existing?.view
  if (oldView?.parent) oldView.parent.removeChild(oldView)
  oldView?.destroy?.({ children: true })

  const view = createPixiViewForEntity(world, entityId, registry, stage)
  if (view) world.setComponent(entityId, displayKey, { view })
  else world.removeComponent(entityId, displayKey)
  return view
}
