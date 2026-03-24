import * as PIXI from "pixi.js";
import { World } from "../../Core/World";
import type { GameDefinition } from "../../Definitions/GameDefinition";
import {
  RES_GAME_DEF,
  RES_LOADING,
  type LoadingState,
  LoadingSystem,
} from "../../Systems/LoadingSystem";
import { PixiAppSystem } from "../../Systems/PixiAppSystem";
import { StateManagementSystem } from "../../Systems/StateManagementSystem";
import { PhysicsSystem } from "../../Systems/PhysicsSystem";
import { PhysicsContactsSystem } from "../../Systems/PhysicsContactsSystem";
import { TriggerSystem } from "../../Systems/TriggerSystem";
import { BackgroundSystem } from "../../Systems/BackgroundSystem";
import { EntitiesManagementSystem } from "../../Systems/EntitiesManagementSystem";
import { AudioSystem } from "../../Systems/AudioSystem";
import { InputSystem } from "../../Systems/InputSystem";
import { MouseInputSystem } from "../../Systems/MouseInputSystem";
import { TouchInputSystem } from "../../Systems/TouchInputSystem";
import { KeyboardInputSystem } from "../../Systems/KeyboardInputSystem";
import { PhysicsMovementSystem } from "../../Systems/PhysicsMovementSystem";
import { PlatformerBehaviorSystem } from "../../Systems/PlatformerBehaviorSystem";
import { PatrolSystem } from "../../Systems/PatrolSystem";
import { AnimationSystem } from "../../Systems/AnimationSystem";
import { CollisionHarmSystem } from "../../Systems/CollisionHarmSystem";
import { HealthSystem } from "../../Systems/HealthSystem";
import { HealthHudSystem } from "../../Systems/HealthHudSystem";
import { MovingPlatformSystem } from "../../Systems/MovingPlatformSystem";
import { SpringPlatformSystem } from "../../Systems/SpringPlatformSystem";
import { PlatformSpawnerSystem } from "../../Systems/PlatformSpawnerSystem";
import { CoinCollectionSystem } from "../../Systems/CoinCollectionSystem";
import { MovementSystem } from "../../Systems/MovementSystem";
import { PixiSyncSystem } from "../../Systems/PixiSyncSystem";
import { CameraFollowSystem } from "../../Systems/CameraFollowSystem";
import { ShooterCombatSystem } from "../../Systems/ShooterCombatSystem";
import { EntityHealthBarSystem } from "../../Systems/EntityHealthBarSystem";
import { SpaceBulletHellSystem } from "../../Systems/SpaceBulletHellSystem";

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
  protected createPixiAppSystem(): PixiAppSystem {
    return new PixiAppSystem(this.app);
  }
  protected createStateManagementSystem(): StateManagementSystem {
    return new StateManagementSystem();
  }
  protected createPhysicsSystem(): PhysicsSystem {
    return new PhysicsSystem();
  }
  protected createPhysicsContactsSystem(): PhysicsContactsSystem {
    return new PhysicsContactsSystem();
  }
  protected createTriggerSystem(): TriggerSystem {
    return new TriggerSystem();
  }
  protected createLoadingSystem(): LoadingSystem {
    return new LoadingSystem();
  }
  protected createBackgroundSystem(): BackgroundSystem {
    return new BackgroundSystem();
  }
  protected createEntitiesManagementSystem(): EntitiesManagementSystem {
    return new EntitiesManagementSystem();
  }
  protected createAudioSystem(): AudioSystem {
    return new AudioSystem();
  }
  protected createInputSystem(): InputSystem {
    return new InputSystem();
  }
  protected createMouseInputSystem(): MouseInputSystem {
    return new MouseInputSystem();
  }
  protected createTouchInputSystem(): TouchInputSystem {
    return new TouchInputSystem();
  }
  protected createKeyboardInputSystem(): KeyboardInputSystem {
    return new KeyboardInputSystem();
  }
  protected createPhysicsMovementSystem(): PhysicsMovementSystem {
    return new PhysicsMovementSystem();
  }
  protected createPlatformerBehaviorSystem(): PlatformerBehaviorSystem {
    return new PlatformerBehaviorSystem();
  }
  protected createPatrolSystem(): PatrolSystem {
    return new PatrolSystem();
  }
  protected createAnimationSystem(): AnimationSystem {
    return new AnimationSystem();
  }
  protected createCollisionHarmSystem(): CollisionHarmSystem {
    return new CollisionHarmSystem();
  }
  protected createHealthSystem(): HealthSystem {
    return new HealthSystem();
  }
  protected createHealthHudSystem(): HealthHudSystem {
    return new HealthHudSystem();
  }
  protected createMovingPlatformSystem(): MovingPlatformSystem {
    return new MovingPlatformSystem();
  }
  protected createSpringPlatformSystem(): SpringPlatformSystem {
    return new SpringPlatformSystem();
  }
  protected createPlatformSpawnerSystem(): PlatformSpawnerSystem {
    return new PlatformSpawnerSystem();
  }
  protected createCoinCollectionSystem(): CoinCollectionSystem {
    return new CoinCollectionSystem();
  }
  protected createMovementSystem(): MovementSystem {
    return new MovementSystem();
  }
  protected createCameraFollowSystem(): CameraFollowSystem {
    return new CameraFollowSystem();
  }
  protected createPixiSyncSystem(): PixiSyncSystem {
    return new PixiSyncSystem();
  }

  protected registerDefaultSystems(world: World): void {
    const systemFactories: Array<{ key: string; enabledByDefault: boolean; add: () => void }> = [
      { key: "PixiAppSystem", enabledByDefault: true, add: () => world.addSystem(this.createPixiAppSystem()) },
      { key: "StateManagementSystem", enabledByDefault: true, add: () => world.addSystem(this.createStateManagementSystem()) },
      { key: "PhysicsSystem", enabledByDefault: true, add: () => world.addSystem(this.createPhysicsSystem()) },
      { key: "PhysicsContactsSystem", enabledByDefault: true, add: () => world.addSystem(this.createPhysicsContactsSystem()) },
      { key: "TriggerSystem", enabledByDefault: true, add: () => world.addSystem(this.createTriggerSystem()) },
      { key: "LoadingSystem", enabledByDefault: true, add: () => world.addSystem(this.createLoadingSystem()) },
      { key: "BackgroundSystem", enabledByDefault: true, add: () => world.addSystem(this.createBackgroundSystem()) },
      { key: "EntitiesManagementSystem", enabledByDefault: true, add: () => world.addSystem(this.createEntitiesManagementSystem()) },
      { key: "AudioSystem", enabledByDefault: true, add: () => world.addSystem(this.createAudioSystem()) },
      { key: "InputSystem", enabledByDefault: true, add: () => world.addSystem(this.createInputSystem()) },
      { key: "MouseInputSystem", enabledByDefault: true, add: () => world.addSystem(this.createMouseInputSystem()) },
      { key: "TouchInputSystem", enabledByDefault: true, add: () => world.addSystem(this.createTouchInputSystem()) },
      { key: "KeyboardInputSystem", enabledByDefault: true, add: () => world.addSystem(this.createKeyboardInputSystem()) },
      { key: "PhysicsMovementSystem", enabledByDefault: true, add: () => world.addSystem(this.createPhysicsMovementSystem()) },
      { key: "PlatformerBehaviorSystem", enabledByDefault: true, add: () => world.addSystem(this.createPlatformerBehaviorSystem()) },
      { key: "PatrolSystem", enabledByDefault: true, add: () => world.addSystem(this.createPatrolSystem()) },
      { key: "AnimationSystem", enabledByDefault: true, add: () => world.addSystem(this.createAnimationSystem()) },
      { key: "CollisionHarmSystem", enabledByDefault: true, add: () => world.addSystem(this.createCollisionHarmSystem()) },
      { key: "HealthSystem", enabledByDefault: true, add: () => world.addSystem(this.createHealthSystem()) },
      { key: "HealthHudSystem", enabledByDefault: true, add: () => world.addSystem(this.createHealthHudSystem()) },
      { key: "MovingPlatformSystem", enabledByDefault: true, add: () => world.addSystem(this.createMovingPlatformSystem()) },
      { key: "SpringPlatformSystem", enabledByDefault: true, add: () => world.addSystem(this.createSpringPlatformSystem()) },
      { key: "PlatformSpawnerSystem", enabledByDefault: true, add: () => world.addSystem(this.createPlatformSpawnerSystem()) },
      { key: "CoinCollectionSystem", enabledByDefault: true, add: () => world.addSystem(this.createCoinCollectionSystem()) },
      { key: "MovementSystem", enabledByDefault: true, add: () => world.addSystem(this.createMovementSystem()) },
      { key: "CameraFollowSystem", enabledByDefault: true, add: () => world.addSystem(this.createCameraFollowSystem()) },
      { key: "PixiSyncSystem", enabledByDefault: true, add: () => world.addSystem(this.createPixiSyncSystem()) },
      // Shooter-specific systems are opt-in through gameDef.systems.
      { key: "ShooterCombatSystem", enabledByDefault: false, add: () => world.addSystem(new ShooterCombatSystem()) },
      { key: "EntityHealthBarSystem", enabledByDefault: false, add: () => world.addSystem(new EntityHealthBarSystem()) },
      { key: "SpaceBulletHellSystem", enabledByDefault: false, add: () => world.addSystem(new SpaceBulletHellSystem()) },
    ];

    for (const entry of systemFactories) {
      if (this.isSystemEnabled(entry.key, entry.enabledByDefault)) {
        entry.add();
      }
    }
  }

  private isSystemEnabled(key: string, enabledByDefault: boolean): boolean {
    const raw = this.gameDef.systems?.[key];
    return typeof raw === "boolean" ? raw : enabledByDefault;
  }

  private tryCallOnGameReady(world: World): void {
    if (this.didCallOnGameReady) return;
    const loading = world.getResource<LoadingState>(RES_LOADING);
    if (!loading || loading.phase !== "ready") return;
    this.didCallOnGameReady = true;
    this.onGameReady(world);
  }
}
