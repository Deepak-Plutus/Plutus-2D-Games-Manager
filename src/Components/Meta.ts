type JsonRecord = Record<string, unknown>

export type MetaRecord = {
  name: string
  uid: number
  objectType: string
  plugin: string
  tags: string[]
  visible: boolean
}

export function buildMetaRecord (
  merged: JsonRecord,
  entityId: number,
  resolvedObjectType = ''
): MetaRecord {
  const name = merged.id != null ? String(merged.id) : ''
  const uid = merged.uid != null ? Number(merged.uid) : entityId
  const objectType =
    resolvedObjectType ||
    (merged.objectType != null ? String(merged.objectType) : '') ||
    (merged.type != null ? String(merged.type) : '')
  const plugin = merged.plugin != null ? String(merged.plugin) : 'Sprite'
  const tags = Array.isArray(merged.tags) ? merged.tags.map(String) : []
  const visible = merged.visible !== false
  return { name, uid, objectType, plugin, tags, visible }
}
