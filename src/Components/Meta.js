/**
 * Construct 3–style instance record stored on {@link import('../Components/index.js').COMPONENT_META}.
 * @see https://www.construct.net/en/make-games/manuals/construct-3/project-primitives/objects/instances
 */

/**
 * @typedef {object} MetaRecord
 * @property {string} name layout instance id (events / `findEntityIdByMetaName`)
 * @property {number} uid stable UID (defaults to entity id when omitted in JSON)
 * @property {string} objectType resolved `objectTypes` template id, if any
 * @property {string} plugin informational (Sprite, etc.)
 * @property {string[]} tags
 * @property {boolean} visible
 */

/**
 * @param {Record<string, unknown>} merged merged entity definition
 * @param {number} entityId
 * @param {string} [resolvedObjectType] from {@link import('../Entities/ObjectTypeResolver.js').ObjectTypeResolver}
 * @returns {MetaRecord}
 */
export function buildMetaRecord(merged, entityId, resolvedObjectType = '') {
  const name = merged.id != null ? String(merged.id) : '';
  const uid = merged.uid != null ? Number(merged.uid) : entityId;
  const objectType =
    resolvedObjectType ||
    (merged.objectType != null ? String(merged.objectType) : '') ||
    (merged.type != null ? String(merged.type) : '');
  const plugin = merged.plugin != null ? String(merged.plugin) : 'Sprite';
  const tags = Array.isArray(merged.tags) ? merged.tags.map(String) : [];
  const visible = merged.visible !== false;
  return { name, uid, objectType, plugin, tags, visible };
}
