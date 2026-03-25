import * as PIXI from "pixi.js";
import { EntityBase } from "./EntityBase";

export type ParticleEmitterEntityProps = {
  width?: number;
  height?: number;
};

/**
 * Visual container for a particle emitter. The actual spawning/updating
 * is driven by ParticleEmitterSystem via ParticleEmitterComponent.
 */
export class ParticleEmitterEntity extends EntityBase {
  private _container: PIXI.Container;
  private _bounds: { width: number; height: number };

  constructor(props: ParticleEmitterEntityProps = {}) {
    const container = new PIXI.Container();
    super(container);
    this._container = container;
    this._bounds = {
      width: typeof props.width === "number" ? props.width : 0,
      height: typeof props.height === "number" ? props.height : 0,
    };
  }

  get container(): PIXI.Container {
    return this._container;
  }

  get bounds(): { width: number; height: number } {
    return this._bounds;
  }
}

