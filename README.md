# Plutus 2D Game Editor (JSON-Driven Runtime)

This project is a JSON-driven 2D game runtime built with:

- `PixiJS` for rendering
- `Matter.js` for physics
- `Vite + TypeScript` for development/build
- A class-based ECS-style architecture (Entities, Components, Systems, Definitions)

Goal: define a game in JSON, load it, and run it with reusable systems and managers.

---

## Core Idea

You describe a game using JSON:

- `world` config (background, bounds, physics, audio, etc.)
- `entities` list (prefab/entity type, position, components)
- `components` that drive behavior through systems

The runtime reads JSON, resolves IDs (prefabs/background), loads assets, spawns entities, and updates systems every frame.

---

## How It Works

1. `main.ts` creates Pixi app and picks active game JSON.
2. A game runtime class (based on `BaseGameRuntime`) registers systems.
3. `LoadingSystem` preloads assets from JSON references.
4. Game definition is converted into entities/components.
5. Systems run each tick (input, physics, platform behavior, triggers, animation, rendering, etc.).

---

## Folder Structure

```text
src/
  Core/
    System.ts                # base system class (enabled, lifecycle hooks, singletonKey)
    World.ts                 # entity/component storage, resources, system registry

  Entities/
    EntityBase.ts            # base entity abstraction around Pixi display object
    SpriteEntity.ts
    RectEntity.ts
    CircleEntity.ts
    ButtonEntity.ts

  Components/
    TransformComponent.ts
    VelocityComponent.ts
    KeyboardControllerComponent.ts
    PhysicsBodyComponent.ts
    PhysicsControllerComponent.ts
    PlatformerBehaviorComponent.ts
    GroundedComponent.ts
    AnimationStateComponent.ts
    PatrolBehaviorComponent.ts
    CollisionHarmComponent.ts
    HealthComponent.ts
    TriggerZoneComponent.ts

  Systems/
    InputSystem.ts
    MouseInputSystem.ts
    TouchInputSystem.ts
    AudioSystem.ts
    PhysicsSystem.ts
    PhysicsContactsSystem.ts
    PhysicsMovementSystem.ts
    PlatformerBehaviorSystem.ts
    PatrolSystem.ts
    CollisionHarmSystem.ts
    TriggerSystem.ts
    LoadingSystem.ts
    StateManagementSystem.ts
    BackgroundSystem.ts
    EntitiesManagementSystem.ts
    MovementSystem.ts
    AnimationSystem.ts
    PixiAppSystem.ts
    PixiSyncSystem.ts

  Definitions/
    GameDefinition.ts        # JSON type shape
    registries.ts            # component + prefab + entity factories
    assetResolvers.ts        # ID -> file URL mappings
    extractAssets.ts         # scans JSON for preloadable asset URLs
    loadGame.ts              # converts definition to spawned entities
    spawnEntity.ts           # spawn one entity from definition

  games/
    base/BaseGameRuntime.ts  # extendable runtime template per game
    PlatformerMarioRuntime.ts
    TopDownShooterRuntime.ts
    createRuntime.ts         # genre -> runtime factory
    platformer_mario.json
    topdown_shooter.json

public/
  assets/
    sprites/
    backgrounds/
```

---

## Running the Project

Install and run:

```bash
npm install
npm run dev
```

Build:

```bash
npm run build
```

---

## Switching Games

Game selection is URL-based in `main.ts`:

- `?game=platformer`
- `?game=shooter`

Examples:

- `http://localhost:5173/?game=platformer`
- `http://localhost:5173/?game=shooter`

If missing/unknown, it falls back to `platformer`.

---

## JSON Conventions

Current definition shape (`src/Definitions/GameDefinition.ts`) supports:

- `genre`
- `engine`
- `world` (free-form settings)
- `entities[]`
  - `id`
  - `entityType` (for direct entity factories) OR `prefab`
  - `pos`
  - `props`
  - `components[]` with `{ type: string, ...data }`

Example component usage:

- `PlatformerController`
- `AnimationState`
- `PatrolBehavior`
- `CollisionHarm`
- `PhysicsBody`
- `PhysicsController`
- `Grounded`
- `TriggerZone`
- `Health`

Unknown component/prefab IDs are logged to the console.

---

## Assets: Where to Put Files

Put real files in `public/assets/...`.

Use stable IDs in JSON:

- `prefab: "sprite_hero_2d"`
- `world.background: "parallax_hills_2d"`

Map those IDs in:

- `src/Definitions/assetResolvers.ts`
- `src/Definitions/registries.ts` (prefab/entity factory behavior)

This keeps JSON stable while allowing asset paths to evolve.

---

## System Manager APIs (Singleton Pattern)

Systems expose manager-style APIs through world resources (instead of only `update()`):

- Audio: `RES_AUDIO_API`
- Input: `RES_INPUT_API`
- Mouse: `RES_MOUSE_API`
- Touch: `RES_TOUCH_API`
- Physics: `RES_PHYSICS_API`
- Physics contacts: `RES_PHYSICS_CONTACTS_API`
- Platform behavior tuning: `RES_PLATFORMER_BEHAVIOR_API`
- State machine: `RES_STATE_API`
- Loading: `RES_LOADING_API`
- Trigger: `RES_TRIGGER_API`
- Entity manager: `RES_ENTITIES`

Use these APIs in custom game runtimes/systems for clean extension.

---

## Creating a New Game with This Approach

### 1) Add JSON

Create `src/games/my_game.json` with your genre/world/entities/components.

### 2) Add runtime class

Create `src/games/MyGameRuntime.ts` that extends `BaseGameRuntime`.

Override any of:

- `beforeRegisterSystems(world)`
- `afterRegisterSystems(world)`
- `onGameReady(world)`
- `afterTick(dt, world)`
- or system factory methods (e.g. `createAudioSystem()`)

### 3) Register runtime selection

Update `src/games/createRuntime.ts` with genre -> runtime mapping.

### 4) Add assets + mappings

- Place files in `public/assets/...`
- Update `assetResolvers.ts` and/or `registries.ts`

### 5) Add missing behaviors

If JSON introduces new component types:

- Add component class in `src/Components/`
- Add system logic in `src/Systems/`
- Register component factory in `src/Definitions/registries.ts`

---

## Notes

- This runtime is intentionally incremental and extensible.
- Several systems are minimal first-pass implementations and meant to be refined per game.
- Prefer adding game-specific behavior in runtime subclasses, not by editing core engine files.

