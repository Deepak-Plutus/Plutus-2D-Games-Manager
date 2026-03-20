import type * as PIXI from 'pixi.js';
import { World } from '../Core/World';
import type { GameDefinition } from './GameDefinition';
import { spawnEntity } from './spawnEntity';

export function loadGame(def: GameDefinition, world: World, app: PIXI.Application): void {
  for (const e of def.entities ?? []) {
    spawnEntity(e, world, app);
  }
}

