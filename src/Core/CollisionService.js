import {
  COMPONENT_COLLIDER,
  COMPONENT_COLLISION,
  COMPONENT_DISPLAY,
  COMPONENT_TRANSFORM,
} from '../Components/index.js';

/**
 * @typedef {object} ColliderAabb
 * @property {number} entityId
 * @property {'solid' | 'jumpThru' | string} kind
 * @property {number} left
 * @property {number} right
 * @property {number} top
 * @property {number} bottom
 */

/**
 * @param {import('../ECS/World.js').World} world
 * @returns {ColliderAabb[]}
 */
export function buildColliderList(world) {
  /** @type {ColliderAabb[]} */
  const out = [];
  for (const e of world.entities.values()) {
    let col = e.components.get(COMPONENT_COLLISION);
    if (!col) {
      const cl = e.components.get(COMPONENT_COLLIDER);
      if (cl && typeof cl.toCollisionShape === 'function') col = cl.toCollisionShape();
    }
    const tr = e.components.get(COMPONENT_TRANSFORM);
    if (!col || !tr) continue;
    const display = e.components.get(COMPONENT_DISPLAY);
    const vw = display?.view?.width ?? 0;
    const vh = display?.view?.height ?? 0;
    const w = Number(col.width) || vw || 0;
    const h = Number(col.height) || vh || 0;
    const ox = Number(col.offsetX) || 0;
    const oy = Number(col.offsetY) || 0;
    const cx = tr.x + ox;
    const cy = tr.y + oy;
    const halfW = (Math.abs(w) * Math.abs(tr.scaleX)) / 2;
    const halfH = (Math.abs(h) * Math.abs(tr.scaleY)) / 2;
    out.push({
      entityId: e.id,
      kind: String(col.kind ?? 'solid'),
      left: cx - halfW,
      right: cx + halfW,
      top: cy - halfH,
      bottom: cy + halfH,
    });
  }
  return out;
}

/**
 * @param {number} x
 * @param {number} y
 * @param {ColliderAabb[]} colliders
 * @param {number} [ignoreEntityId]
 * @returns {ColliderAabb | null}
 */
export function pointHitsSolid(x, y, colliders, ignoreEntityId) {
  for (const c of colliders) {
    if (c.entityId === ignoreEntityId) continue;
    if (c.kind !== 'solid' && c.kind !== 'jumpThru') continue;
    if (x >= c.left && x <= c.right && y >= c.top && y <= c.bottom) return c;
  }
  return null;
}

/**
 * @param {ColliderAabb} a
 * @param {ColliderAabb} b
 */
export function aabbOverlap(a, b) {
  return !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);
}
