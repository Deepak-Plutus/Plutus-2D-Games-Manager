import * as PIXI from 'pixi.js';
import type { GameDefinition } from '../Definitions/GameDefinition';
import { BaseGameRuntime } from './base/BaseGameRuntime';

export function createRuntime(app: PIXI.Application, def: GameDefinition): BaseGameRuntime {
  return new BaseGameRuntime(app, def);
}

