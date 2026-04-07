import {
  COMPONENT_BEHAVIORS,
  COMPONENT_COLLISION
} from '../Components/index.js'
import { attachGameComponents } from '../Entities/attachGameComponents.js'
import { ComponentParserRegistry } from './ComponentParserRegistry.js'

/**
 * Creates the default parser chain used when building entities from JSON.
 *
 * @returns {ComponentParserRegistry} Parser registry with default parsers.
 */
export function createDefaultComponentParserRegistry (): ComponentParserRegistry {
  const registry = new ComponentParserRegistry()

  registry.register(({ world, entityId, merged }) => {
    attachGameComponents(world, entityId, merged)
  })

  registry.register(({ world, entityId, merged, behaviorRegistry }) => {
    const instances = Array.isArray(merged.behaviors)
      ? behaviorRegistry.createFromJsonArray(merged.behaviors)
      : []
    if (instances.length) world.setComponent(entityId, COMPONENT_BEHAVIORS, instances)

    for (const b of instances) {
      const contrib = typeof b.getCollisionContribution === 'function' ? b.getCollisionContribution() : null
      if (!contrib) continue
      world.setComponent(entityId, COMPONENT_COLLISION, {
        kind: String(contrib.kind ?? 'solid'),
        width: Number(contrib.width) || 0,
        height: Number(contrib.height) || 0,
        offsetX: Number(contrib.offsetX) || 0,
        offsetY: Number(contrib.offsetY) || 0
      })
    }

    const colDef = merged.collision
    if (colDef && typeof colDef === 'object') {
      const c = colDef as Record<string, unknown>
      world.setComponent(entityId, COMPONENT_COLLISION, {
        kind: String(c.kind ?? 'solid'),
        width: Number(c.width) || 0,
        height: Number(c.height) || 0,
        offsetX: Number(c.offsetX) || 0,
        offsetY: Number(c.offsetY) || 0
      })
    }
  })

  return registry
}
