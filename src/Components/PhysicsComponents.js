/**
 * Velocity, acceleration, mass, rigid body, collider (AABB) data.
 */
export class Velocity {
  constructor(x = 0, y = 0) {
    this.x = Number(x) || 0;
    this.y = Number(y) || 0;
  }

  /**
   * @param {Record<string, unknown>} [json]
   */
  static fromJson(json = {}) {
    return new Velocity(json.x, json.y);
  }
}

export class Acceleration {
  constructor(x = 0, y = 0) {
    this.x = Number(x) || 0;
    this.y = Number(y) || 0;
  }

  /**
   * @param {Record<string, unknown>} [json]
   */
  static fromJson(json = {}) {
    return new Acceleration(json.x, json.y);
  }
}

export class Mass {
  constructor(value = 1) {
    this.value = Math.max(1e-6, Number(value) || 1);
  }

  /**
   * @param {Record<string, unknown>} [json]
   */
  static fromJson(json = {}) {
    return new Mass(json.value ?? json.mass);
  }
}

export class RigidBody {
  constructor(opts = {}) {
    /** kinematic | dynamic | static */
    this.bodyType = String(opts.bodyType ?? 'kinematic');
    this.friction = Number(opts.friction) || 0;
    const rest = Number(opts.restitution);
    this.restitution = Number.isFinite(rest) ? rest : 0;
    this.linearDamping = Number(opts.linearDamping) || 0;
    this.angularDamping = Number(opts.angularDamping) || 0;
    this.fixedRotation = !!opts.fixedRotation;
  }

  /**
   * @param {Record<string, unknown>} [json]
   */
  static fromJson(json = {}) {
    return new RigidBody(json);
  }
}

export class Collider {
  constructor(opts = {}) {
    this.kind = String(opts.kind ?? 'solid');
    this.width = Number(opts.width) || 0;
    this.height = Number(opts.height) || 0;
    this.offsetX = Number(opts.offsetX) || 0;
    this.offsetY = Number(opts.offsetY) || 0;
    this.isTrigger = !!opts.isTrigger;
    this.layerMask = Number(opts.layerMask) || 0xffffffff;
  }

  /**
   * @param {Record<string, unknown>} [json]
   */
  static fromJson(json = {}) {
    return new Collider(json);
  }

  /** Shape compatible with legacy `collision` JSON */
  toCollisionShape() {
    return {
      kind: this.kind,
      width: this.width,
      height: this.height,
      offsetX: this.offsetX,
      offsetY: this.offsetY,
    };
  }
}
