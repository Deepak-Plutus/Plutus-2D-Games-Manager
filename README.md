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
