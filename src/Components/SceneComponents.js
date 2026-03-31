/**
 * Scene-level ECS data: named groups, optional display hierarchy, camera follow.
 */

export class GroupMembership {
  /**
   * @param {object} opts
   */
  constructor(opts = {}) {
    /** @type {string[]} logical group names (query via {@link import('../ECS/World.js').World#findEntityIdsInGroup}) */
    this.groupIds = Array.isArray(opts.groupIds)
      ? opts.groupIds.map(String)
      : Array.isArray(opts.groups)
        ? opts.groups.map(String)
        : [];
    /** When set, {@link import('../Systems/DisplaySyncSystem.js').DisplaySyncSystem} parents `display.view` here and uses local transform */
    this.parentEntityId =
      opts.parentEntityId != null
        ? Number(opts.parentEntityId)
        : opts.parent != null
          ? Number(opts.parent)
          : null;
  }

  /**
   * @param {Record<string, unknown>} [json]
   */
  static fromJson(json = {}) {
    return new GroupMembership({
      groupIds: json.groupIds ?? json.groups,
      parentEntityId: json.parentEntityId ?? json.parent,
    });
  }

  /**
   * @param {string} groupId
   */
  hasGroup(groupId) {
    return this.groupIds.includes(String(groupId));
  }
}

export class Camera {
  /**
   * @param {object} opts
   */
  constructor(opts = {}) {
    this.enabled = opts.enabled !== false;
    /** Follow this entity id directly */
    const rawFollowId = opts.followEntityId;
    this.followEntityId =
      rawFollowId != null &&
      rawFollowId !== '' &&
      Number.isFinite(Number(rawFollowId))
        ? Number(rawFollowId)
        : null;
    /** Or resolve by layout instance `id` (meta name) */
    this.followMetaName = opts.followMetaName != null ? String(opts.followMetaName) : '';
    /** Or resolve by stable uid */
    this.followUid = opts.followUid != null ? Number(opts.followUid) : null;
    /** Or resolve by object type template id (first match wins) */
    this.followObjectType = opts.followObjectType != null ? String(opts.followObjectType) : '';
    /**
     * Exponential smoothing (per second). 0 = snap each frame.
     * @type {number}
     */
    this.smoothSpeed = Number(opts.smoothSpeed) || 0;
    this.offsetX = Number(opts.offsetX) || 0;
    this.offsetY = Number(opts.offsetY) || 0;
    /** Higher wins when multiple cameras exist */
    this.priority = Number(opts.priority) || 0;
    /** Optional world bounds (focus clamp, px) */
    this.boundLeft = opts.boundLeft != null ? Number(opts.boundLeft) : null;
    this.boundRight = opts.boundRight != null ? Number(opts.boundRight) : null;
    this.boundTop = opts.boundTop != null ? Number(opts.boundTop) : null;
    this.boundBottom = opts.boundBottom != null ? Number(opts.boundBottom) : null;
  }

  /**
   * @param {Record<string, unknown>} [json]
   */
  static fromJson(json = {}) {
    return new Camera(json);
  }
}
