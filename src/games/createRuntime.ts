import * as PIXI from 'pixi.js';
import type { GameDefinition } from '../Definitions/GameDefinition';
import { PlatformerMarioRuntime } from './PlatformerMarioRuntime';
import { TopDownShooterRuntime } from './TopDownShooterRuntime';
import { BaseGameRuntime } from './base/BaseGameRuntime';

export function createRuntime(app: PIXI.Application, def: GameDefinition): BaseGameRuntime {
  switch (def.genre) {
    case 'platformer':
      return new PlatformerMarioRuntime(app, def);
    case 'shoot_em_up':
      return new TopDownShooterRuntime(app, def);
    default:
      return new BaseGameRuntime(app, def);
  }
}

