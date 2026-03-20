import * as PIXI from 'pixi.js';
import { World } from '../../Core/World';
import type { GameDefinition } from '../../Definitions/GameDefinition';
import { RES_GAME_DEF, RES_LOADING, type LoadingState, LoadingSystem } from '../../Systems/LoadingSystem';
import { PixiAppSystem } from '../../Systems/PixiAppSystem';
import { StateManagementSystem } from '../../Systems/StateManagementSystem';
import { PhysicsSystem } from '../../Systems/PhysicsSystem';
import { PhysicsContactsSystem } from '../../Systems/PhysicsContactsSystem';
import { TriggerSystem } from '../../Systems/TriggerSystem';
import { BackgroundSystem } from '../../Systems/BackgroundSystem';
import { EntitiesManagementSystem } from '../../Systems/EntitiesManagementSystem';
import { AudioSystem } from '../../Systems/AudioSystem';
import { InputSystem } from '../../Systems/InputSystem';
import { MouseInputSystem } from '../../Systems/MouseInputSystem';
import { TouchInputSystem } from '../../Systems/TouchInputSystem';
import { KeyboardInputSystem } from '../../Systems/KeyboardInputSystem';
import { PhysicsMovementSystem } from '../../Systems/PhysicsMovementSystem';
import { PlatformerBehaviorSystem } from '../../Systems/PlatformerBehaviorSystem';
import { PatrolSystem } from '../../Systems/PatrolSystem';
import { AnimationSystem } from '../../Systems/AnimationSystem';
import { CollisionHarmSystem } from '../../Systems/CollisionHarmSystem';
import { MovementSystem } from '../../Systems/MovementSystem';
import { PixiSyncSystem } from '../../Systems/PixiSyncSystem';

/**
 * BaseGameRuntime
 * Extend this class in each game folder to customize systems cleanly
 * without editing global project structure.
 */
export class BaseGameRuntime {
  protected readonly app: PIXI.Application;
  protected readonly gameDef: GameDefinition;
  protected readonly world: World;
  private didCallOnGameReady = false;

  constructor(app: PIXI.Application, gameDef: GameDefinition) {
    this.app = app;
    this.gameDef = gameDef;
    this.world = new World();
  }

  start(): World {
    this.world.setResource(RES_GAME_DEF, this.gameDef);

    this.beforeRegisterSystems(this.world);
    this.registerDefaultSystems(this.world);
    this.afterRegisterSystems(this.world);

    this.app.ticker.add((ticker) => {
      this.world.update(ticker.deltaMS);
      this.tryCallOnGameReady(this.world);
      this.afterTick(ticker.deltaMS, this.world);
    });

    return this.world;
  }

  protected beforeRegisterSystems(_world: World): void {}
  protected afterRegisterSystems(_world: World): void {}
  protected onGameReady(_world: World): void {}
  protected afterTick(_dtMs: number, _world: World): void {}

  // Factory methods for easy per-game overrides.
  protected createPixiAppSystem(): PixiAppSystem { return new PixiAppSystem(this.app); }
  protected createStateManagementSystem(): StateManagementSystem { return new StateManagementSystem(); }
  protected createPhysicsSystem(): PhysicsSystem { return new PhysicsSystem(); }
  protected createPhysicsContactsSystem(): PhysicsContactsSystem { return new PhysicsContactsSystem(); }
  protected createTriggerSystem(): TriggerSystem { return new TriggerSystem(); }
  protected createLoadingSystem(): LoadingSystem { return new LoadingSystem(); }
  protected createBackgroundSystem(): BackgroundSystem { return new BackgroundSystem(); }
  protected createEntitiesManagementSystem(): EntitiesManagementSystem { return new EntitiesManagementSystem(); }
  protected createAudioSystem(): AudioSystem { return new AudioSystem(); }
  protected createInputSystem(): InputSystem { return new InputSystem(); }
  protected createMouseInputSystem(): MouseInputSystem { return new MouseInputSystem(); }
  protected createTouchInputSystem(): TouchInputSystem { return new TouchInputSystem(); }
  protected createKeyboardInputSystem(): KeyboardInputSystem { return new KeyboardInputSystem(); }
  protected createPhysicsMovementSystem(): PhysicsMovementSystem { return new PhysicsMovementSystem(); }
  protected createPlatformerBehaviorSystem(): PlatformerBehaviorSystem { return new PlatformerBehaviorSystem(); }
  protected createPatrolSystem(): PatrolSystem { return new PatrolSystem(); }
  protected createAnimationSystem(): AnimationSystem { return new AnimationSystem(); }
  protected createCollisionHarmSystem(): CollisionHarmSystem { return new CollisionHarmSystem(); }
  protected createMovementSystem(): MovementSystem { return new MovementSystem(); }
  protected createPixiSyncSystem(): PixiSyncSystem { return new PixiSyncSystem(); }

  protected registerDefaultSystems(world: World): void {
    world.addSystem(this.createPixiAppSystem());
    world.addSystem(this.createStateManagementSystem());
    world.addSystem(this.createPhysicsSystem());
    world.addSystem(this.createPhysicsContactsSystem());
    world.addSystem(this.createTriggerSystem());
    world.addSystem(this.createLoadingSystem());
    world.addSystem(this.createBackgroundSystem());
    world.addSystem(this.createEntitiesManagementSystem());
    world.addSystem(this.createAudioSystem());
    world.addSystem(this.createInputSystem());
    world.addSystem(this.createMouseInputSystem());
    world.addSystem(this.createTouchInputSystem());
    world.addSystem(this.createKeyboardInputSystem());
    world.addSystem(this.createPhysicsMovementSystem());
    world.addSystem(this.createPlatformerBehaviorSystem());
    world.addSystem(this.createPatrolSystem());
    world.addSystem(this.createAnimationSystem());
    world.addSystem(this.createCollisionHarmSystem());
    world.addSystem(this.createMovementSystem());
    world.addSystem(this.createPixiSyncSystem());
  }

  private tryCallOnGameReady(world: World): void {
    if (this.didCallOnGameReady) return;
    const loading = world.getResource<LoadingState>(RES_LOADING);
    if (!loading || loading.phase !== 'ready') return;
    this.didCallOnGameReady = true;
    this.onGameReady(world);
  }
}

