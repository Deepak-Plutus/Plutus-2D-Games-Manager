import { COMPONENT_DISPLAY, COMPONENT_GROUP, COMPONENT_TRANSFORM } from '../Components/index.js';

/**
 * Pixi parent for `display.view` when {@link import('../Components/SceneComponents.js').GroupMembership#parentEntityId} is set.
 * @param {import('../ECS/World.js').World} world
 * @param {number} entityId
 * @param {import('pixi.js').Container} stage
 */
export function getDisplayMountParent(world, entityId, stage) {
  const grp = world.getComponent(entityId, COMPONENT_GROUP);
  const pid = grp?.parentEntityId;
  if (pid == null) return stage;
  const pv = world.getComponent(pid, COMPONENT_DISPLAY)?.view;
  if (pv && typeof pv.addChild === 'function') {
    pv.sortableChildren = true;
    return pv;
  }
  return stage;
}

/**
 * Local transform for a view parented under another entity (world transforms stay absolute in ECS).
 * @param {import('../ECS/World.js').World} world
 * @param {number} entityId
 * @param {import('../Components/Transform.js').Transform} transform
 */
export function getLocalDisplayTransform(world, entityId, transform) {
  const grp = world.getComponent(entityId, COMPONENT_GROUP);
  const pid = grp?.parentEntityId;
  if (pid == null) {
    return {
      x: transform.x,
      y: transform.y,
      rotation: transform.rotation,
      scaleX: transform.scaleX,
      scaleY: transform.scaleY,
    };
  }
  const ptr = world.getComponent(pid, COMPONENT_TRANSFORM);
  if (!ptr) {
    return {
      x: transform.x,
      y: transform.y,
      rotation: transform.rotation,
      scaleX: transform.scaleX,
      scaleY: transform.scaleY,
    };
  }
  return {
    x: transform.x - ptr.x,
    y: transform.y - ptr.y,
    rotation: transform.rotation - ptr.rotation,
    scaleX: ptr.scaleX !== 0 ? transform.scaleX / ptr.scaleX : transform.scaleX,
    scaleY: ptr.scaleY !== 0 ? transform.scaleY / ptr.scaleY : transform.scaleY,
  };
}
