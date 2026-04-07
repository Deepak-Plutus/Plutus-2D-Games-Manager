import {
  COMPONENT_COLLIDER,
  COMPONENT_COLLISION,
  COMPONENT_DISPLAY,
  COMPONENT_TRANSFORM
} from '../Components/index.js'
import type { World } from '../ECS/World.js'

/**
 * Axis-aligned collider snapshot used by gameplay/runtime systems.
 */
export type ColliderAabb = {
  entityId: number
  kind: 'solid' | 'jumpThru' | string
  left: number
  right: number
  top: number
  bottom: number
}

type CollisionShape = {
  kind?: unknown
  width?: unknown
  height?: unknown
  offsetX?: unknown
  offsetY?: unknown
}

type TransformShape = { x: number; y: number; scaleX: number; scaleY: number }
type DisplayShape = { view?: { width?: number; height?: number } | null }
type ColliderComp = { toCollisionShape?: () => CollisionShape }

/**
 * Builds an AABB collider list from world components for the current frame.
 *
 * @param {World} world ECS world.
 * @returns {ColliderAabb[]} Collider snapshots in world space.
 */
export function buildColliderList (world: World): ColliderAabb[] {
  const out: ColliderAabb[] = []
  for (const e of world.entities.values()) {
    let col = world.getComponent<CollisionShape>(e.id, COMPONENT_COLLISION)
    if (!col) {
      const cl = world.getComponent<ColliderComp>(e.id, COMPONENT_COLLIDER)
      if (cl && typeof cl.toCollisionShape === 'function') col = cl.toCollisionShape()
    }
    const tr = world.getComponent<TransformShape>(e.id, COMPONENT_TRANSFORM)
    if (!col || !tr) continue
    const display = world.getComponent<DisplayShape>(e.id, COMPONENT_DISPLAY)
    const vw = display?.view?.width ?? 0
    const vh = display?.view?.height ?? 0
    const w = Number(col.width) || vw || 0
    const h = Number(col.height) || vh || 0
    const ox = Number(col.offsetX) || 0
    const oy = Number(col.offsetY) || 0
    const cx = tr.x + ox
    const cy = tr.y + oy
    const halfW = (Math.abs(w) * Math.abs(tr.scaleX)) / 2
    const halfH = (Math.abs(h) * Math.abs(tr.scaleY)) / 2
    out.push({
      entityId: e.id,
      kind: String(col.kind ?? 'solid'),
      left: cx - halfW,
      right: cx + halfW,
      top: cy - halfH,
      bottom: cy + halfH
    })
  }
  return out
}

/**
 * Returns the first solid or jump-thru collider containing a point.
 *
 * @param {number} x World x.
 * @param {number} y World y.
 * @param {ColliderAabb[]} colliders Collider list.
 * @param {number | undefined} ignoreEntityId Optional entity id to ignore.
 * @returns {ColliderAabb | null}
 */
export function pointHitsSolid (
  x: number,
  y: number,
  colliders: ColliderAabb[],
  ignoreEntityId?: number
): ColliderAabb | null {
  for (const c of colliders) {
    if (c.entityId === ignoreEntityId) continue
    if (c.kind !== 'solid' && c.kind !== 'jumpThru') continue
    if (x >= c.left && x <= c.right && y >= c.top && y <= c.bottom) return c
  }
  return null
}

/**
 * Tests two AABBs for overlap.
 *
 * @param {ColliderAabb} a First AABB.
 * @param {ColliderAabb} b Second AABB.
 * @returns {boolean}
 */
export function aabbOverlap (a: ColliderAabb, b: ColliderAabb): boolean {
  return !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom)
}
