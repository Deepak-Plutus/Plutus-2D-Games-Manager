import * as PIXI from 'pixi.js';
import type { GameDefinition } from '../Definitions/GameDefinition';
import { BaseGameRuntime } from './base/BaseGameRuntime';
import { RES_PLATFORMER_BEHAVIOR_API, type PlatformerBehaviorApi } from '../Systems/PlatformerBehaviorSystem';
import { RES_AUDIO_API, type AudioApi } from '../Systems/AudioSystem';

/**
 * Example per-game runtime extension.
 * Keep game-specific tuning/behavior here instead of changing global systems.
 */
export class PlatformerMarioRuntime extends BaseGameRuntime {
  constructor(app: PIXI.Application, gameDef: GameDefinition) {
    super(app, gameDef);
  }

  protected onGameReady(world: import('../Core/World').World): void {
    // Example: tune behavior without touching shared system code.
    const platformApi = world.getResource<PlatformerBehaviorApi>(RES_PLATFORMER_BEHAVIOR_API);
    platformApi?.setHorizontalMultiplier(1);
    platformApi?.setJumpMultiplier(1);

    const audioApi = world.getResource<AudioApi>(RES_AUDIO_API);
    audioApi?.registerSound({ id: 'ready_chime', type: 'tone', kind: 'sfx', freq: 1040, durationMs: 90, volume: 0.7 });
    audioApi?.play('ready_chime');
  }
}

