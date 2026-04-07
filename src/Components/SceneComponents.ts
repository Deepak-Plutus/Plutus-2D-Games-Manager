type JsonRecord = Record<string, unknown>

export class GroupMembership {
  groupIds: string[]
  parentEntityId: number | null

  constructor (opts: JsonRecord = {}) {
    this.groupIds = Array.isArray(opts.groupIds)
      ? opts.groupIds.map(String)
      : Array.isArray(opts.groups)
        ? opts.groups.map(String)
        : []
    this.parentEntityId =
      opts.parentEntityId != null
        ? Number(opts.parentEntityId)
        : opts.parent != null
          ? Number(opts.parent)
          : null
  }

  static fromJson (json: JsonRecord = {}): GroupMembership {
    return new GroupMembership({
      groupIds: json.groupIds ?? json.groups,
      parentEntityId: json.parentEntityId ?? json.parent
    })
  }

  hasGroup (groupId: string): boolean {
    return this.groupIds.includes(String(groupId))
  }
}

export class Camera {
  enabled: boolean
  followEntityId: number | null
  followMetaName: string
  followUid: number | null
  followObjectType: string
  smoothSpeed: number
  offsetX: number
  offsetY: number
  priority: number
  boundLeft: number | null
  boundRight: number | null
  boundTop: number | null
  boundBottom: number | null
  zoom: number

  constructor (opts: JsonRecord = {}) {
    this.enabled = opts.enabled !== false
    const rawFollowId = opts.followEntityId
    this.followEntityId =
      rawFollowId != null &&
      rawFollowId !== '' &&
      Number.isFinite(Number(rawFollowId))
        ? Number(rawFollowId)
        : null
    this.followMetaName = opts.followMetaName != null ? String(opts.followMetaName) : ''
    this.followUid = opts.followUid != null ? Number(opts.followUid) : null
    this.followObjectType = opts.followObjectType != null ? String(opts.followObjectType) : ''
    this.smoothSpeed = Number(opts.smoothSpeed) || 0
    this.offsetX = Number(opts.offsetX) || 0
    this.offsetY = Number(opts.offsetY) || 0
    this.priority = Number(opts.priority) || 0
    this.boundLeft = opts.boundLeft != null ? Number(opts.boundLeft) : null
    this.boundRight = opts.boundRight != null ? Number(opts.boundRight) : null
    this.boundTop = opts.boundTop != null ? Number(opts.boundTop) : null
    this.boundBottom = opts.boundBottom != null ? Number(opts.boundBottom) : null
    this.zoom = Number(opts.zoom) || 1
  }

  static fromJson (json: JsonRecord = {}): Camera {
    return new Camera(json)
  }
}
