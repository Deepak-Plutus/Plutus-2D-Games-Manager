import * as PIXI from 'pixi.js';
import type { GameDefinition } from '../Definitions/GameDefinition';
import { BaseGameRuntime } from './base/BaseGameRuntime';
import type { World } from '../Core/World';
import { RES_AUDIO_API, type AudioApi } from '../Systems/AudioSystem';

export class TopDownShooterRuntime extends BaseGameRuntime {
  constructor(app: PIXI.Application, gameDef: GameDefinition) {
    super(app, gameDef);
  }

  protected onGameReady(world: World): void {
    const audioApi = world.getResource<AudioApi>(RES_AUDIO_API);
    audioApi?.registerSound({ id: 'shooter_ready', type: 'tone', kind: 'sfx', freq: 1320, durationMs: 70, volume: 0.6 });
    audioApi?.play('shooter_ready');
  }
}

