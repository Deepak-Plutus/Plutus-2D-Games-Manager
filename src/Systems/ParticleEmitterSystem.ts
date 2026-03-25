import * as PIXI from 'pixi.js';
import { System } from '../Core/System';
import type { World } from '../Core/World';
import { ParticleEmitterComponent } from '../Components/ParticleEmitterComponent';

type Particle = {
  gfx: PIXI.Graphics;
  vx: number;
  vy: number;
  lifeMs: number;
  ageMs: number;
};

export class ParticleEmitterSystem extends System {
  get singletonKey(): string {
    return 'ParticleEmitterSystem';
  }

  update(dt: number, world: World): void {
    for (const [entity, emitter] of world.query(ParticleEmitterComponent)) {
      emitter.update(dt);
      const container = entity.view;
      if (!(container instanceof PIXI.Container)) continue;

      const particles = (container as any).__particles as Particle[] | undefined;
      const list: Particle[] = particles ?? [];
      (container as any).__particles = list;

      // one-time burst
      if (!emitter._didBurst && emitter.burst > 0) {
        this.emit(container, emitter, list, emitter.burst);
        emitter._didBurst = true;
      }

      const immediate = emitter.consumePendingEmit();
      if (immediate > 0) this.emit(container, emitter, list, immediate);

      // continuous rate
      if (emitter._running && emitter.ratePerSec > 0) {
        emitter._accum += (dt / 1000) * emitter.ratePerSec;
        const n = Math.floor(emitter._accum);
        if (n > 0) {
          emitter._accum -= n;
          this.emit(container, emitter, list, n);
        }
      }

      // update particles
      for (let i = list.length - 1; i >= 0; i--) {
        const p = list[i];
        p.ageMs += dt;
        if (p.ageMs >= p.lifeMs) {
          p.gfx.destroy();
          list.splice(i, 1);
          continue;
        }
        p.gfx.x += (p.vx * dt) / 1000;
        p.gfx.y += (p.vy * dt) / 1000;
        const t = 1 - p.ageMs / p.lifeMs;
        p.gfx.alpha = emitter.alpha * t;
      }
    }
  }

  private emit(container: PIXI.Container, emitter: ParticleEmitterComponent, list: Particle[], count: number): void {
    const canEmit = Math.max(0, emitter.maxParticles - list.length);
    const n = Math.min(count, canEmit);
    for (let i = 0; i < n; i++) {
      const angle = this.randomAngleRad(emitter.spreadDeg);
      const speed = rand(emitter.speedMin, emitter.speedMax);
      const size = rand(emitter.sizeMin, emitter.sizeMax);

      const gfx = new PIXI.Graphics();
      gfx.clear();
      if (emitter.shape === 'rect') {
        gfx.roundRect(-size / 2, -size / 2, size, size, Math.max(0, size * 0.25));
      } else {
        gfx.circle(0, 0, size / 2);
      }
      gfx.fill({ color: emitter.color, alpha: emitter.alpha });
      gfx.alpha = emitter.alpha;

      // local space of the emitter container
      gfx.x = 0;
      gfx.y = 0;

      container.addChild(gfx);
      list.push({
        gfx,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        lifeMs: emitter.particleLifeMs,
        ageMs: 0,
      });
    }
  }

  private randomAngleRad(spreadDeg: number): number {
    const spread = Math.max(0, Math.min(360, spreadDeg));
    const half = (spread * Math.PI) / 180 / 2;
    return rand(-half, half);
  }
}

function rand(min: number, max: number): number {
  if (max < min) return min;
  return min + Math.random() * (max - min);
}

