import { Graphics, Sprite, TilingSprite } from 'pixi.js';
import {
  COMPONENT_DISPLAY,
  COMPONENT_LAYER,
  COMPONENT_META,
  COMPONENT_SPRITE,
  COMPONENT_TILED_SPRITE,
  COMPONENT_TRANSFORM,
} from '../Components/index.js';
import { getDisplayMountParent, getLocalDisplayTransform } from './DisplayHierarchy.js';

/**
 * Maps ECS render components to Pixi scene objects ({@link Sprite}, {@link TilingSprite}).
 * Pixi does not ship a separate entity-component UI layer; these are the canonical display types.
 */

/**
 * Pixi v8 {@link import('pixi.js').Color} accepts packed RGB integers in `0`..`0xffffff` only.
 * Config may supply a larger number by mistake — keep the low 24 bits.
 * @param {number} tint
 * @returns {number}
 */
function packRgbTint(tint) {
  const n = Number(tint);
  if (!Number.isFinite(n)) return 0xffffff;
  return (Math.trunc(n) >>> 0) & 0xffffff;
}

/**
 * @param {import('pixi.js').Container} view
 * @param {number} tint
 * @param {string} blendMode
 */
function applyVisualStyle(view, tint, blendMode) {
  view.tint = packRgbTint(tint);
  if (blendMode && blendMode !== 'normal') {
    view.blendMode = /** @type {import('pixi.js').BLEND_MODES} */ (blendMode);
  }
}

/**
 * @param {import('../Components/RenderingComponents.js').SpriteData} data
 * @param {import('../Core/AssetRegistry.js').AssetEntry} entry
 * @param {Sprite} sprite
 */
function applySpriteDataToPixiSprite(data, entry, sprite) {
  sprite.anchor.set(data.anchorX, data.anchorY);
  if (entry.width != null) sprite.width = entry.width;
  if (entry.height != null) sprite.height = entry.height;
  applyVisualStyle(sprite, data.tint, data.blendMode);
}

/**
 * @param {import('../Components/RenderingComponents.js').TiledSpriteData} data
 * @param {import('pixi.js').Texture} texture
 * @param {TilingSprite} ts
 */
/**
 * @param {number} tint
 */
function tintToRgb(tint) {
  return packRgbTint(tint);
}

/**
 * @param {import('../Components/RenderingComponents.js').SpriteData} data
 * @param {import('../Components/Transform.js').Transform} transform
 */
function createCircleGraphics(data, transform) {
  const r =
    data.circleRadius != null && data.circleRadius > 0
      ? data.circleRadius
      : Math.min(Math.abs(transform.scaleX), Math.abs(transform.scaleY)) / 2;
  const g = new Graphics();
  g.circle(0, 0, Math.max(1, r));
  g.fill({ color: tintToRgb(data.tint) });
  if (data.blendMode && data.blendMode !== 'normal') {
    g.blendMode = /** @type {import('pixi.js').BLEND_MODES} */ (data.blendMode);
  }
  g.userData = { plutusCircle: true };
  return g;
}

/**
 * @param {import('../Components/RenderingComponents.js').SpriteData} data
 */
function createRectGraphics(data) {
  const g = new Graphics();
  g.rect(-0.5, -0.5, 1, 1);
  g.fill({ color: tintToRgb(data.tint) });
  if (data.blendMode && data.blendMode !== 'normal') {
    g.blendMode = /** @type {import('pixi.js').BLEND_MODES} */ (data.blendMode);
  }
  return g;
}

function applyTiledDataToPixi(data, texture, ts) {
  ts.anchor.set(0.5, 0.5);
  const texW = texture.width || 1;
  const texH = texture.height || 1;
  const scaleX = (data.tileWidth > 0 ? texW / data.tileWidth : 1) * data.uvScaleX;
  const scaleY = (data.tileHeight > 0 ? texH / data.tileHeight : 1) * data.uvScaleY;
  ts.tileScale.set(scaleX, scaleY);
  applyVisualStyle(ts, data.tint, data.blendMode);
}

/**
 * Builds a Pixi display object from {@link COMPONENT_TILED_SPRITE} or {@link COMPONENT_SPRITE} (after those are on the world).
 *
 * @param {import('../ECS/World.js').World} world
 * @param {number} entityId
 * @param {import('../Core/AssetRegistry.js').AssetRegistry} registry
 * @param {import('pixi.js').Container} stage
 * @returns {import('pixi.js').Container | null}
 */
export function createPixiViewForEntity(world, entityId, registry, stage) {
  const transform = world.getComponent(entityId, COMPONENT_TRANSFORM);
  const layer = world.getComponent(entityId, COMPONENT_LAYER);
  const meta = world.getComponent(entityId, COMPONENT_META);
  if (!transform || !layer) return null;

  const tiledData = world.getComponent(entityId, COMPONENT_TILED_SPRITE);
  const spriteData = world.getComponent(entityId, COMPONENT_SPRITE);

  if (tiledData?.assetId) {
    const entry = registry.get(tiledData.assetId);
    if (entry?.kind === 'texture' && entry.texture) {
      const w = tiledData.width > 0 ? tiledData.width : (entry.width ?? 256);
      const h = tiledData.height > 0 ? tiledData.height : (entry.height ?? 256);
      const ts = new TilingSprite({
        texture: entry.texture,
        width: w,
        height: h,
      });
      applyTiledDataToPixi(tiledData, entry.texture, ts);
      const local = getLocalDisplayTransform(world, entityId, transform);
      ts.position.set(local.x, local.y);
      ts.rotation = local.rotation;
      ts.scale.set(local.scaleX, local.scaleY);
      ts.visible = meta?.visible !== false;
      ts.zIndex = layer.zIndex;
      getDisplayMountParent(world, entityId, stage).addChild(ts);
      return ts;
    }
  }

  if (spriteData && String(spriteData.shape).toLowerCase() === 'circle') {
    const disk = createCircleGraphics(spriteData, transform);
    const local = getLocalDisplayTransform(world, entityId, transform);
    disk.position.set(local.x, local.y);
    disk.rotation = local.rotation;
    disk.scale.set(1, 1);
    disk.visible = meta?.visible !== false;
    disk.zIndex = layer.zIndex;
    getDisplayMountParent(world, entityId, stage).addChild(disk);
    return disk;
  }

  if (spriteData && String(spriteData.shape).toLowerCase() === 'rect' && !spriteData.assetId) {
    const rect = createRectGraphics(spriteData);
    const local = getLocalDisplayTransform(world, entityId, transform);
    rect.position.set(local.x, local.y);
    rect.rotation = local.rotation;
    rect.scale.set(local.scaleX, local.scaleY);
    rect.visible = meta?.visible !== false;
    rect.zIndex = layer.zIndex;
    getDisplayMountParent(world, entityId, stage).addChild(rect);
    return rect;
  }

  if (spriteData?.assetId) {
    const entry = registry.get(spriteData.assetId);
    if (entry?.kind === 'texture' && entry.texture) {
      const sprite = new Sprite({ texture: entry.texture });
      applySpriteDataToPixiSprite(spriteData, entry, sprite);
      const local = getLocalDisplayTransform(world, entityId, transform);
      sprite.position.set(local.x, local.y);
      sprite.rotation = local.rotation;
      sprite.scale.set(local.scaleX, local.scaleY);
      sprite.visible = meta?.visible !== false;
      sprite.zIndex = layer.zIndex;
      getDisplayMountParent(world, entityId, stage).addChild(sprite);
      return sprite;
    }
  }

  return null;
}

/**
 * Replaces or creates `display.view` from current sprite / tiledSprite components (e.g. after attaching them at runtime).
 *
 * @param {import('../ECS/World.js').World} world
 * @param {number} entityId
 * @param {import('../Core/AssetRegistry.js').AssetRegistry} registry
 * @param {import('pixi.js').Container} stage
 * @param {string} [displayKey]
 */
export function mountPixiDisplayForEntity(world, entityId, registry, stage, displayKey = COMPONENT_DISPLAY) {
  const existing = world.getComponent(entityId, displayKey);
  const oldView = existing?.view;
  if (oldView?.parent) oldView.parent.removeChild(oldView);
  oldView?.destroy?.({ children: true });

  const view = createPixiViewForEntity(world, entityId, registry, stage);
  if (view) {
    world.setComponent(entityId, displayKey, { view });
  } else {
    world.removeComponent(entityId, displayKey);
  }
  return view;
}
