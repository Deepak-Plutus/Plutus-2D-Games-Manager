# Plutus 2D Game Editor - ECS Runtime Guide

This project is a JSON-driven 2D game runtime/editor based on ECS:

- Renderer: `PixiJS`
- Physics: `Matter.js`
- Runtime: `TypeScript + Vite`
- Architecture: `Entities + Components + Systems + Resources`

This README is written for both humans and AI agents so the project can scale safely.

## 1) How Runtime Works

1. `src/main.ts` selects a game JSON (`?game=...` or remote).
2. `src/games/createRuntime.ts` creates `BaseGameRuntime`.
3. `BaseGameRuntime` registers systems from its registry.
4. `LoadingSystem` preloads assets found in JSON.
5. Entities + components are spawned from JSON via registries.
6. Systems run every frame and drive behavior.

Core files:

- `src/Core/World.ts`
- `src/Definitions/GameDefinition.ts`
- `src/Definitions/registries.ts`
- `src/Definitions/loadGame.ts`
- `src/games/base/BaseGameRuntime.ts`

## 2) JSON Structure

Game definition shape (`src/Definitions/GameDefinition.ts`):

```json
{
  "genre": "platformer",
  "engine": "pixi_2d",
  "world": {},
  "systems": {},
  "entities": []
}
```

Entity shape:

```json
{
  "id": "hero",
  "entityType": "Sprite",
  "pos": [100, 200],
  "scale": 1,
  "props": {},
  "components": [{ "type": "Transform" }]
}
```

## 3) Systems Config (Enabled + Params)

You can now pass both toggles and params in `systems`.

### Boolean toggle (old style)

```json
"systems": {
  "CameraEntitySystem": true,
  "SpaceBulletHellSystem": false
}
```

### Object config (new style)

```json
"systems": {
  "CameraEntitySystem": {
    "enabled": true,
    "params": {
      "followAxis": "x"
    }
  },
  "CameraFollowSystem": {
    "enabled": false
  }
}
```

Rules:

- `enabled` is optional; default comes from runtime.
- `params` is optional; systems can read it from `RES_SYSTEM_PARAMS`.

## 4) Camera JSON (Entity/Group + Axis Follow)

Camera supports richer follow definitions.

### Entity camera example

```json
{
  "id": "camera_main",
  "entityType": "Camera",
  "components": [
    {
      "type": "Camera",
      "mode": "follow",
      "zoom": 2,
      "followTarget": { "type": "entity", "id": "hero", "axis": "xy" },
      "follow_right_only": true,
      "lock_y": false
    }
  ]
}
```

### Group camera example

```json
{
  "type": "Camera",
  "mode": "follow",
  "followTarget": { "type": "group", "id": "party", "axis": "x" }
}
```

Behavior:

- `followTarget.type: "entity"` -> follows entity by name.
- `followTarget.type: "group"` -> follows the average position of group members.
- `axis`: `"x" | "y" | "xy"` controls which axes move.

Backward compatibility is preserved:

- `follow_entity_id`
- world camera config for `CameraFollowSystem`

## 5) Assets: Where and How

Place assets in:

- `public/assets/sprites`
- `public/assets/backgrounds`
- `public/assets/audio` (recommended for sound/music files)

Resolution flow:

- JSON uses ids/names.
- `src/Definitions/assetResolvers.ts` maps ids -> URLs.
- `src/Definitions/extractAssets.ts` discovers URLs to preload.
- `LoadingSystem` loads all discovered assets before spawning entities.

When adding new asset-based features:

1. Add files in `public/assets/...`.
2. Add mapping in `assetResolvers.ts`.
3. Ensure extraction logic includes the JSON keys in `extractAssets.ts`.
4. Use ids in JSON, not hardcoded runtime URLs.

## 6) Where To Add New Functionality

- New entity constructor/view: `src/Entities/*` + `entityRegistry`.
- New component data API: `src/Components/*` + `componentRegistry`.
- New logic: `src/Systems/*` + register in `BaseGameRuntime`.
- New game profile: `src/games/*.json`.

## 7) Entity Catalog (Brief)

Common `entityType` values:

- Rendering: `Sprite`, `Rect`, `Circle`, `Polygon`, `Background`, `SpriteAnimation`, `ParticleEmitter`
- UI: `Text`, `Label`, `Button`, `ProgressBar`, `Slider`, `CheckBox`, `InputField`
- Gameplay markers: `PlayerSpawn`, `EnemySpawn`, `Camera`, `ParallaxLayer`, `Group`, `Timer`, `StateMachine`, `Sound`, `Music`

Use `props` for visual construction data; use `components` for behavior.

## 8) Component Catalog (Brief)

Core transforms/motion:

- `Transform`, `Velocity`, `PhysicsBody`, `PhysicsController`, `PlatformerBehavior`, `Grounded`

Gameplay:

- `Health`, `Damage`, `CollisionHarm`, `Pickup`, `CoinCollectible`, `TriggerZone`
- `Timer`, `StateMachine`, `Lifetime`
- `PlayerSpawn`, `EnemySpawn`, `PlatformSpawner`, `MovingPlatform`, `SpringPlatform`
- `Group`, `Tag`

AI:

- `PatrolBehavior`, `FollowTarget`, `Wander`, `LookAt`

Rendering/UI:

- `SpriteAnimation`, `SpriteRender`, `AnimationState`
- `TextUi`, `ButtonUi`, `ProgressBarUi`, `SliderUi`, `CheckboxUi`, `InputFieldUi`
- `Clickable`, `Draggable`, `Layout`, `Visibility`, `ZIndex`

Audio:

- `AudioSound`, `AudioMusic`

Physics surface tuning:

- `Gravity`, `Friction`, `Bounce`

For full method-level APIs, inspect the component classes in `src/Components`.

## 9) System Catalog (Brief)

Core:

- `PixiAppSystem`, `LoadingSystem`, `EntitiesManagementSystem`, `PixiSyncSystem`
- `StateManagementSystem`, `InputSystem`, `KeyboardInputSystem`, `MouseInputSystem`, `TouchInputSystem`
- `AudioSystem`, `AudioEntitySystem`

Physics/gameplay:

- `PhysicsSystem`, `PhysicsContactsSystem`, `PhysicsMovementSystem`, `PhysicsSurfaceSystem`
- `PlatformerBehaviorSystem`, `MovementSystem`, `CollisionHarmSystem`, `HealthSystem`
- `TriggerSystem`, `PickupSystem`, `CoinCollectionSystem`
- `MovingPlatformSystem`, `SpringPlatformSystem`, `PlatformSpawnerSystem`
- `SpawnPointSystem`, `GroupSystem`, `TimerSystem`, `StateMachineSystem`, `LifetimeSystem`

AI/visual:

- `PatrolSystem`, `FollowTargetSystem`, `WanderSystem`, `LookAtSystem`
- `SpriteAnimationSystem`, `SpriteRenderSystem`, `ParticleEmitterSystem`
- `LayoutSystem`, `VisibilitySystem`, `ZIndexSystem`
- `CameraFollowSystem`, `CameraEntitySystem`, `ParallaxSystem`

Genre-specific opt-ins:

- `ShooterCombatSystem`, `EntityHealthBarSystem`, `SpaceBulletHellSystem`

## 10) Practical Examples

### Spawn with Physics + Platformer control

```json
{
  "id": "hero",
  "entityType": "Sprite",
  "props": { "texture": "/assets/sprites/hero.png", "width": 48, "height": 48 },
  "components": [
    { "type": "Transform", "pos": [100, 300] },
    { "type": "PhysicsBody", "shape": "box", "width": 48, "height": 48 },
    { "type": "PlatformerController", "speed": 7, "jump_force": 15 },
    { "type": "Health", "hp": 100, "maxHp": 100 }
  ]
}
```

### Trigger that heals player

```json
{
  "id": "heal_pickup",
  "entityType": "Powerup",
  "components": [
    { "type": "Transform", "pos": [600, 260] },
    { "type": "PowerupTrigger", "healAmount": 20, "once": true }
  ]
}
```

## 11) Scale Guidelines

For maintainability and AI-friendly scaling:

- Keep game rules in JSON + reusable systems.
- Avoid one-off logic in `main.ts`.
- Prefer adding generic component fields and system params over hardcoded branches.
- Keep registries authoritative (entity/component factories).
- Add system toggles for optional features; keep defaults sane.
- Validate every change with `npm run build`.

## 12) Dev Commands

```bash
npm install
npm run dev
npm run build
```

Common URLs:

- `http://localhost:5173/?game=platformer`
- `http://localhost:5173/?game=shooter`
- `http://localhost:5173/?game=spaceBulletHell`
# Plutus 2D Game Editor (AI + JSON + ECS Guide)

This README is optimized for AI agents and developers who need to quickly understand how this engine works and how to add/modify games safely.

## Stack

- `PixiJS` for rendering
- `Matter.js` for physics
- `TypeScript + Vite`
- ECS architecture (`World`, `Entities`, `Components`, `Systems`)

---

## How The Engine Works

1. `src/main.ts` picks a game JSON (`?game=...`) or loads from S3.
2. `src/games/createRuntime.ts` creates `BaseGameRuntime`.
3. `BaseGameRuntime` registers systems (with JSON `systems` overrides).
4. `LoadingSystem` preloads assets from JSON (`extractAssets`).
5. `loadGame` + `spawnEntity` create entities/components from JSON.
6. Systems run every frame and update behavior.

This project is config-driven: most behavior should be controlled by JSON + reusable systems, not hardcoded per-game branches.

---

## ECS Structure

- **World**: stores entities, components, resources, systems
- **Entity**: object id + view (`PIXI.Container`) + components
- **Component**: pure data (health, transform, movement config, etc.)
- **System**: logic operating on components each tick
- **Resource**: global runtime service/state (input, physics API, loading, etc.)

Core files:

- `src/Core/World.ts`
- `src/Core/System.ts`
- `src/Definitions/registries.ts`
- `src/Definitions/loadGame.ts`
- `src/Definitions/spawnEntity.ts`

---

## JSON Contract (GameDefinition)

Defined in `src/Definitions/GameDefinition.ts`:

- `genre: string`
- `engine: string` (usually `pixi_2d`)
- `world?: Record<string, unknown>`
- `systems?: Record<string, boolean>`
- `entities: EntityDefinition[]`

Entity definition supports:

- `id`
- `entityType` or `prefab`
- `pos`, `width`, `height`, `scale`, `props`
- `components: [{ type: string, ... }]`

Unknown prefab/component types are logged in console.

---

## JSON-Driven System Enabling

Systems are registered in `src/games/base/BaseGameRuntime.ts`.

- Each system has a key (e.g. `CameraFollowSystem`, `SpaceBulletHellSystem`).
- JSON can enable/disable with:

```json
"systems": {
  "CameraFollowSystem": false,
  "SpaceBulletHellSystem": true
}
```

If not specified, runtime default is used.

---

## Assets: Name-Based Resolution

JSON should use stable IDs/names, not direct implementation logic.

- Prefabs/background names are resolved via:
  - `src/Definitions/assetResolvers.ts`
- Assets are preloaded via:
  - `src/Definitions/extractAssets.ts`

Place files under:

- `public/assets/sprites`
- `public/assets/backgrounds`

If JSON introduces a new prefab/background name, add mapping in `assetResolvers.ts`.

### Asset loading checklist for new JSON games

1. Add files to `public/assets/sprites` or `public/assets/backgrounds`.
2. Add ID -> URL mapping in `src/Definitions/assetResolvers.ts`:
   - `prefabTextureUrl()` for sprite prefabs
   - `backgroundTextureUrl()` for backgrounds
3. Ensure preloading discovers your fields in `src/Definitions/extractAssets.ts`.
   - If you add new world keys (example: `enemyPrefab`, `bossPrefab`), include them there.
4. Ensure prefab factory exists in `src/Definitions/registries.ts` (`prefabRegistry`).
5. Keep JSON using IDs/names (preferred), not hardcoded implementation details.

### Where to update assets for a specific game

- JSON IDs: `src/games/<game>.json`
- Resolver mapping: `src/Definitions/assetResolvers.ts`
- Prefab construction/size/anchor/tint: `src/Definitions/registries.ts`
- Preload discovery: `src/Definitions/extractAssets.ts`

### Background usage rule

- Preferred JSON value: a background **name/id** (example: `space_bullet_hell_bg`).
- URL/path should be resolved in code (`assetResolvers.ts`), not hardcoded in game logic.
- If direct path support is needed, keep it as a fallback, but prefer IDs for consistency.

---

## Canvas, Viewport, and Game-Specific World Properties

Canvas/view behavior combines `main.ts` + game JSON:

- `main.ts`:
  - loads game JSON first,
  - applies layout shell from JSON viewport config,
  - initializes Pixi and resizes to game host.

- JSON `world.viewport` controls mobile-style desktop presentation:

```json
{
  "world": {
    "viewport": {
      "mode": "mobile",
      "width": 390,
      "height": 844
    }
  }
}
```

Meaning:

- `mode: "mobile"` -> centered canvas on desktop with left/right gaps
- `width/height` -> target aspect ratio

### Common game-specific world keys

These are read by systems and can vary per game JSON:

- `world.bounds`
- `world.physics`
- `world.camera`
- `world.viewport`
- `world.background`
- `world.enemyStepEveryMs`
- `world.enemyCollisionDamage`
- `world.enemyPrefab`
- `world.bossPrefab`

Rule: any new world property should be explicitly consumed by a system (usually in an `applyWorldTuning`-style method).

---

## Creating A New Game (Recommended Procedure)

1. Create `src/games/<newGame>.json`.
2. Register that JSON in `main.ts` local map (query key -> definition).
3. Configure `world` settings and `systems`.
4. Define `entities` + `components`.
5. Add/match asset resolver entries for any new prefab/background names.
6. If behavior is missing:
   - add a new component class (`src/Components`) and/or
   - add a new system (`src/Systems`)
   - register system in `BaseGameRuntime`
   - register component factory in `registries.ts`
7. Run `npm run build` and fix errors.

---

## Folder Structure (Current)

```text
src/
  Core/
  Entities/
  Components/
  Systems/
  Definitions/
  games/
    base/BaseGameRuntime.ts
    createRuntime.ts
    *.json
public/
  assets/
    sprites/
    backgrounds/
```

---

## Modifying Folder Structure Safely

Folder structure is modifiable when features are missing. If you add new files/folders, also update integration points:

- New component -> register in `registries.ts`
- New system -> register in `BaseGameRuntime.ts` + toggle via JSON
- New prefab/background name -> map in `assetResolvers.ts`
- New game JSON -> add in `main.ts`

Do not leave orphan files. Every new runtime element must be reachable from JSON + registry wiring.

---

## AI Agent Rules For This Repo

- Prefer JSON and existing systems first.
- Keep game-specific data in JSON (`world`, `entities`, `components`, `systems`).
- Keep reusable logic in systems/components.
- Avoid hardcoded behavior in `main.ts`.
- Validate with:

```bash
npm run build
```

---

## Run

```bash
npm install
npm run dev
```

Examples:

- `http://localhost:5173/?game=platformer`
- `http://localhost:5173/?game=shooter`
- `http://localhost:5173/?game=spaceBulletHell`
# Plutus 2D Game Editor (JSON-Driven Runtime)

This project runs games from JSON definitions using:

- `PixiJS` (rendering)
- `Matter.js` (physics)
- `Vite + TypeScript`
- ECS-style architecture (`Entities`, `Components`, `Systems`, `Definitions`)

The architecture is **config-driven**: game behavior is selected through JSON (especially `systems` + `components`), not game-specific runtime classes.

---

## Quick Start

```bash
npm install
npm run dev
```

Build:

```bash
npm run build
```

Switch games via URL:

- `http://localhost:5173/?game=platformer`
- `http://localhost:5173/?game=shooter`

If missing/unknown, it falls back to `platformer`.

---

## Runtime Flow

1. `main.ts` selects and loads a game JSON.
2. `createRuntime.ts` creates a `BaseGameRuntime`.
3. `BaseGameRuntime` registers systems from a registry, using JSON `systems` flags.
4. `LoadingSystem` preloads assets discovered from JSON.
5. JSON entities/components are spawned.
6. Enabled systems update each frame.

---

## JSON Definition Shape

`src/Definitions/GameDefinition.ts`

- `genre`
- `engine`
- `world` (free-form)
- `systems?: Record<string, boolean>` (system toggles)
- `entities[]`
  - `id`
  - `entityType` or `prefab`
  - `pos`, `width`, `height`, `scale`, `props`
  - `components[]` as `{ type: string, ...data }`

Unknown `prefab` / `component.type` are logged in console.

---

## Creating a New Game (Current Procedure)

### 1) Add a JSON file

Create `src/games/my_game.json` with:

- `world` settings (`bounds`, `physics`, `camera`, `background`, etc.)
- `systems` toggles for required systems
- `entities` and their components

Example:

```json
{
  "genre": "my_genre",
  "engine": "pixi_2d",
  "systems": {
    "ShooterCombatSystem": true,
    "EntityHealthBarSystem": true
  },
  "world": {
    "bounds": [0, 0, 3000, 1080],
    "physics": { "gravity": { "x": 0, "y": 0, "scale": 0.001 } }
  },
  "entities": []
}
```

### 2) Wire game selection in `main.ts`

Add your JSON import to local game defs map so `?game=<key>` resolves it.

### 3) Enable only required systems

Use `systems` flags in JSON (from `BaseGameRuntime` registry), for example:

- `ShooterCombatSystem`
- `EntityHealthBarSystem`
- `HealthHudSystem`
- `CameraFollowSystem`

If a system is not listed in JSON, runtime uses its default enabled/disabled behavior.

### 4) Define entities and components

Use existing `entityType`/`prefab` and component types in JSON.

For new component behavior:

- Add component class in `src/Components/`
- Add system logic in `src/Systems/` (if needed)
- Register component factory in `src/Definitions/registries.ts`

### 5) Add/Map assets

Place files in `public/assets/...` and map IDs in:

- `src/Definitions/assetResolvers.ts` (ID -> file URL)
- `src/Definitions/registries.ts` (prefab/entity construction)

This keeps JSON stable while allowing asset file changes.

### 6) Add missing systems when required

If your game needs behavior not present yet:

- Create new system in `src/Systems/`
- Register it in `BaseGameRuntime` system registry with a key and default
- Enable it in your game JSON `systems`

---

## Folder Notes

```text
src/
  Definitions/
    GameDefinition.ts
    registries.ts
    assetResolvers.ts
  Systems/
    ... core systems ...
    ShooterCombatSystem.ts
    EntityHealthBarSystem.ts
  games/
    base/BaseGameRuntime.ts
    createRuntime.ts
    platformer_mario.json
    topdown_shooter.json
```

There are no per-game runtime subclasses in the active structure.

---

## Design Rules

- Prefer JSON configuration over hardcoded per-game branching.
- Keep systems reusable and toggled per game through `systems`.
- Keep components declarative in JSON; keep logic in systems.
- Add new systems/components only when existing ones cannot express the behavior.

---
## JSON ECS Catalog (Updated)

This section exists so an AI agent can quickly understand what **entity types**, **component types**, and **system keys** are available in the current engine.

### Systems you can toggle in `gameDef.systems`

Rendering helpers (disabled by default):
- `UiSystem`
- `SpriteAnimationSystem`
- `ParticleEmitterSystem`

Gameplay utilities (enabled by default):
- `SpawnPointSystem`
- `GroupSystem`
- `TimerSystem`

Camera/Parallax (disabled by default):
- `CameraEntitySystem`
- `ParallaxSystem`

Advanced (disabled by default):
- `StateMachineSystem`

Audio registration (enabled by default):
- `AudioEntitySystem`

Important: system toggles use the system singleton/registry key (the strings above).

### Rendering Entity Types (`entityType`)

- `Background`
  - Uses Pixi `Sprite` via JSON `props.texture` (+ optional `props.width/props.height`).
- `SpriteAnimation`
  - Uses Pixi `AnimatedSprite`.
  - JSON `props.frames` is an array of frame URLs/paths; enable `SpriteAnimationSystem`.
- `ParticleEmitter`
  - Uses a Pixi `Container` and is driven by the `ParticleEmitter` component; enable `ParticleEmitterSystem`.

### UI Entity Types (`entityType`)

All UI entities are Pixi display objects; enable `UiSystem` to drive updates/interaction.

- `Text`
  - Component: `TextUi`
- `Label`
  - Component: `TextUi` (same rendering system)
- `ProgressBar`
  - Component: `ProgressBarUi`
- `Slider`
  - Component: `SliderUi` (draggable, writes into `ui.values[key]`)
- `CheckBox`
  - Component: `CheckboxUi` (click toggles, writes into `ui.values[key]`)
- `InputField`
  - Component: `InputFieldUi` (click prompts for text; writes into `ui.values[key]`)

### Physics Entity Types & Trigger Entities

Physics bodies are created via the `PhysicsBody` component (Matter.js). Visual physics helpers:

- `Box`
  - Visual: Pixi rounded rectangle
- `Circle`
  - Visual: Pixi circle
- `Polygon`
  - Visual: Pixi polygon (for display); physics uses `PhysicsBody` with `shape: "polygon"` + `vertices`

Trigger visual entities (sensor-like look):
- `Checkpoint`, `Trap`, `CoinPickup`, `LevelEnd`
  - The *actual* behavior is driven by `TriggerZoneComponent` and `PhysicsBody` sensor/static config.

Convenience component factories for common gameplay sensors:
- `CollectibleTrigger`
  - Creates a sensor body and attaches `TriggerZoneComponent` using `CollectCoin`.
  - Also attaches `CoinCollectible` so collection value can be read.
- `PowerupTrigger`
  - Sensor body + `HealOther`
- `PortalTrigger`
  - Sensor body + `TeleportOther`
- `PlatformBody`
  - Static physics rectangle body for collision/ground geometry

Trigger behavior is executed by `TriggerSystem` (enabled by default).

### Gameplay Marker Entities

Marker views are mainly for positioning/config and are meant to be consumed by game logic systems.

- `PlayerSpawn`
  - Add component `PlayerSpawn` (fields: `prefab?`, `slot?`)
- `EnemySpawn`
  - Add component `EnemySpawn` (fields: `prefab?`, `slot?`)

`SpawnPointSystem` collects all `PlayerSpawn`/`EnemySpawn` into the `spawn_points` resource.

### Camera Entities & Parallax

- `Camera`
  - Component: `Camera`
  - Enable `CameraEntitySystem` (and disable/avoid `CameraFollowSystem` if you want fixed camera).
- `ParallaxLayer`
  - Component: `ParallaxLayer` (field: `factor`)
  - Enable `ParallaxSystem`

### Audio Entities

- `Sound` (entityType)
  - Component: `AudioSound`
- `Music` (entityType)
  - Component: `AudioMusic`

Enable/keep `AudioEntitySystem` (it is enabled by default).

JSON component rule:
- In `AudioSound` / `AudioMusic`, use `soundType`:
  - `soundType: "tone"` or `soundType: "url"`
  - Do not use the key `type` for tone/url because `type` is reserved for the component identifier in ECS JSON.

### Util Entities

- `Group` (entityType)
  - Component: `Group`
    - Supports `members: [entityName...]` and/or `tag` (tag-based membership assumes entities have been tagged via `EntitiesManagementSystem` API).
  - `GroupSystem` also re-parents member Pixi views into the group’s `PIXI.Container` so visuals are grouped.

- `Timer` (entityType)
  - Component: `Timer`
  - `TimerSystem` ticks timers (respects `state_api.is("paused")`) and executes JSON actions on expire.

### Advanced: State Machine Entity

- `StateMachine` (entityType)
  - Component: `StateMachine`
  - Enable `StateMachineSystem` to make transitions run.

State machine JSON supports:
- Conditions: `Always`, `KeyJustPressed`, `UiEquals`, `ResourceEquals`, `TimerEnded`
- Actions: `PlaySound`, `SetResource`, `TransitionGameState`, `DespawnSelf`

---
## Component/JSON Rules (Critical)

- `components[].type` must match a key in `src/Definitions/registries.ts` (`componentRegistry`).
- Keep component logic out of `main.ts`. Add new systems/components only if no existing system can express the behavior.
- Some JSON keys are reserved:
  - For ECS JSON, `components[].type` identifies the component.
  - For audio components, tone-vs-url selector is `soundType` (not `type`).

---
## Component Functions Spec (from doc)

This repo also includes an extracted “components + required function list” reference:
- `ecs_2d_editor_components_reference.md`

### Extended Runtime Helper APIs

Beyond the doc-required methods, many components now expose convenience helpers for cleaner gameplay scripting and system code.

- Core state/components:
  - `Health`: `setHealth`, `getHealth`, `getMaxHealth`, `fullHeal`, `revive`, `isAlive`, `getHealthPercent`
  - `Timer`: `restart`, `getRemainingMs`, `getElapsedMs`, `getProgress`
  - `StateMachine`: `getState`, `getTimeInStateMs`, `addTransition`, `getTransitionsFrom`, `resetToInitialState`
  - `AnimationState`: `setClips`, `getClipForCurrentState`, `isState`

- Event/listener components:
  - `CollisionResponse`: `removeEnterListener`, `removeStayListener`, `removeExitListener`, `clearListeners`
  - `ButtonUi`: `offClick`, `clearClickListeners`
  - `CheckboxUi`: `offChange`, `clearChangeListeners`
  - `SliderUi`: `offChange`, `clearChangeListeners`
  - `InputFieldUi`: `offSubmit`, `clearSubmitListeners`
  - `Clickable`: `offClick`, `offHover`, `offPress`, `clearListeners`

- Movement/AI:
  - `Velocity`: `setSpeed`, `scale`, `getDirection`
  - `PhysicsController`: `stopMoving`, `clearMoveDir`, `hasJumpRequested`, `hasDashRequested`, `clearRequests`
  - `PlatformerBehavior`: `stopMoving`, `hasJumpIntent`, `clearJumpIntent`
  - `FollowTarget`: `clearTarget`, `setSpeed`, `hasTarget`
  - `Wander`: `setSpeed`, `setChangeInterval`, `getDirection`, `resetOrigin`
  - `LookAt`: `setTargetEntity`, `clearTargetEntity`, `clearTargetPosition`, `setRotationSpeed`, `hasTarget`

- Spawning/group/trigger utilities:
  - `Group`: `isEmpty`, `getMembers`
  - `TriggerZone`: `removeOnEnterAction`, `removeOnExitAction`, `getActions`
  - `EnemySpawn`: `resetSpawner`, `clearPendingSpawns`
  - `PlayerSpawn`: `requestSpawn`, `clearSpawnRequest`, `resetSpawnPoint`
  - `PlatformSpawner`: `hasPendingSpawn`, `resetSpawner`

- Rendering/layout/camera:
  - `Camera`: `setMode`, `clearFollowTarget`, `setBounds`, `stopShake`, `isShaking`
  - `Visibility`: `reset`
  - `ZIndex`: `offset`, `reset`, `isFrontQueued`, `isBackQueued`
  - `Layout`: `getAnchor`, `getMargin`, `isDirty`, `clearDirty`
  - `SpriteRender`: `clearTexture`, `toggleVisible`, `isFlippedX`, `isFlippedY`
  - `SpriteAnimation`: `setFps`, `setLoop`, `restart`, `isFinished`

- Audio/physics-surface helpers:
  - `AudioSound`: `hasPendingPlay`, `hasPendingStop`, `consumePlayRequest`, `consumeStopRequest`, `clearRequests`
  - `AudioMusic`: `hasPendingPlay`, `hasPendingPause`, `hasPendingStop`, `consumePlayRequest`, `consumePauseRequest`, `consumeStopRequest`, `clearRequests`
  - `ParticleEmitter`: `isRunning`, `setRate`, `clearPendingEmit`, `resetBurst`
  - `Gravity`: `getGravity`, `toggleGravity`
  - `Friction`: `getFriction`, `clearFriction`
  - `Bounce`: `getRestitution`, `clearBounce`
  - `PhysicsBody`: `isStatic`, `setVelocity`, `getVelocity`, `setPosition`, `getPosition`


