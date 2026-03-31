import Matter from 'matter-js';
import { BaseSystem } from './BaseSystem.js';

const { Engine, Runner } = Matter;

/**
 * Placeholder Matter.js integration: creates an engine when enabled.
 * Extend this to sync bodies with `transform` / `rigidbody` components.
 */
export class PhysicsSystem extends BaseSystem {
  constructor() {
    super();
    /** @type {Matter.Engine | null} */
    this.engine = null;
    /** @type {Matter.Runner | null} */
    this.runner = null;
    this.gravity = { x: 0, y: 1 };
  }

  configure(options) {
    this.gravity = {
      x: Number(options.gravity?.x ?? this.gravity.x),
      y: Number(options.gravity?.y ?? this.gravity.y),
    };
  }

  update(_dt, _world) {
    if (!this.enabled) return;
    // Stepping is handled by Matter.Runner when started; reserved for custom sync.
  }

  start() {
    if (!this.enabled || this.engine) return;
    this.engine = Engine.create({ gravity: this.gravity });
    this.runner = Runner.create();
    Runner.run(this.runner, this.engine);
  }

  stop() {
    if (this.runner) {
      Runner.stop(this.runner);
      this.runner = null;
    }
    this.engine = null;
  }
}
