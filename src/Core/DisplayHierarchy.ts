import type { Container } from 'pixi.js'
import { COMPONENT_DISPLAY, COMPONENT_GROUP, COMPONENT_TRANSFORM } from '../Components/index.js'
import type { Transform } from '../Components/Transform.js'
import type { World } from '../ECS/World.js'

type GroupShape = { parentEntityId?: number | null }
type DisplayShape = { view?: Container | null }

type LocalTransform = {
  x: number
  y: number
  rotation: number
  scaleX: number
  scaleY: number
}

/**
 * Resolves the Pixi parent container used to mount an entity display object.
 *
 * @param {World} world ECS world.
 * @param {number} entityId Child entity id.
 * @param {Container} stage Fallback stage/root container.
 * @returns {Container} Parent container.
 */
export function getDisplayMountParent (world: World, entityId: number, stage: Container): Container {
  const grp = world.getComponent<GroupShape>(entityId, COMPONENT_GROUP)
  const pid = grp?.parentEntityId
  if (pid == null) return stage
  const pv = world.getComponent<DisplayShape>(pid, COMPONENT_DISPLAY)?.view
  if (pv && typeof (pv as Container).addChild === 'function') {
    pv.sortableChildren = true
    return pv
  }
  return stage
}

/**
 * Converts world transform into local transform relative to display parent.
 *
 * @param {World} world ECS world.
 * @param {number} entityId Entity id to resolve.
 * @param {Transform} transform World-space transform.
 * @returns {LocalTransform} Parent-local transform values.
 */
export function getLocalDisplayTransform (
  world: World,
  entityId: number,
  transform: Transform
): LocalTransform {
  const grp = world.getComponent<GroupShape>(entityId, COMPONENT_GROUP)
  const pid = grp?.parentEntityId
  if (pid == null) {
    return {
      x: transform.x,
      y: transform.y,
      rotation: transform.rotation,
      scaleX: transform.scaleX,
      scaleY: transform.scaleY
    }
  }
  const ptr = world.getComponent<Transform>(pid, COMPONENT_TRANSFORM)
  if (!ptr) {
    return {
      x: transform.x,
      y: transform.y,
      rotation: transform.rotation,
      scaleX: transform.scaleX,
      scaleY: transform.scaleY
    }
  }
  return {
    x: transform.x - ptr.x,
    y: transform.y - ptr.y,
    rotation: transform.rotation - ptr.rotation,
    scaleX: ptr.scaleX !== 0 ? transform.scaleX / ptr.scaleX : transform.scaleX,
    scaleY: ptr.scaleY !== 0 ? transform.scaleY / ptr.scaleY : transform.scaleY
  }
}
