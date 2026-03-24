import * as PIXI from 'pixi.js';
import { System } from '../Core/System';
import type { World } from '../Core/World';
import { HealthComponent } from '../Components/HealthComponent';
import { TransformComponent } from '../Components/TransformComponent';
import { RES_PIXI_APP } from './PixiAppSystem';

export class EntityHealthBarSystem extends System {
  get singletonKey(): string {
    return 'EntityHealthBarSystem';
  }

  private bars = new Map<number, PIXI.Graphics>();

  onRemoved(): void {
    for (const bar of this.bars.values()) {
      bar.destroy();
    }
    this.bars.clear();
  }

  update(_dt: number, world: World): void {
    const app = world.getResource<PIXI.Application>(RES_PIXI_APP);
    if (!app) return;

    const seen = new Set<number>();

    for (const [entity, transform, hp] of world.query(TransformComponent, HealthComponent)) {
      seen.add(entity.id);
      let bar = this.bars.get(entity.id);
      if (!bar) {
        bar = new PIXI.Graphics();
        bar.zIndex = 5000;
        app.stage.addChild(bar);
        this.bars.set(entity.id, bar);
      }

      const ratio = clamp01(hp.maxHp > 0 ? hp.hp / hp.maxHp : 0);
      const width = Math.max(24, entity.view.width * 0.9);
      const height = 6;
      const yOffset = Math.max(32, entity.view.height * 0.8);

      bar.clear();
      bar.roundRect(-width / 2 - 1, -1, width + 2, height + 2, 4).fill({ color: 0x000000, alpha: 0.5 });
      bar.roundRect(-width / 2, 0, width, height, 3).fill(0x1f2937);
      bar.roundRect(-width / 2, 0, width * ratio, height, 3).fill(ratio > 0.35 ? 0x22c55e : 0xef4444);
      bar.position.set(transform.position.x, transform.position.y - yOffset);
    }

    for (const [id, bar] of this.bars) {
      if (seen.has(id)) continue;
      if (bar.parent) bar.parent.removeChild(bar);
      bar.destroy();
      this.bars.delete(id);
    }
  }
}

function clamp01(v: number): number {
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}
