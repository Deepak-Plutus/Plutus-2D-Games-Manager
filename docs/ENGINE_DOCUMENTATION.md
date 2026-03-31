# Plutus 2D Games Manager - Engine Documentation

This document gives a single, practical overview of the engine: what it does, how to build games with it, how JSON is used and generated, behavior support, ECS architecture, animations, scalability, and the technology stack.

## 1) Engine Overview

Plutus 2D Games Manager is a JSON-driven 2D game runtime built around:

- `PixiJS` for rendering and scene graph handling.
- `Matter.js` integration points for physics-style systems.
- `GSAP` for tween and timeline-style visual animation behavior.
- A lightweight `ECS` (Entity Component System) core.
- A behavior plugin model inspired by Construct-style workflows.

The engine loads one JSON configuration, initializes the app, loads assets, creates entities/components/behaviors, and runs game systems every frame.

## 2) What The Engine Does

At runtime, the engine:

1. Creates a Pixi application and canvas host.
2. Resolves a config URL (usually from `?config=...` query parameter).
3. Fetches and validates JSON.
4. Applies app settings (width/height/background).
5. Loads assets and tracks progress.
6. Registers and configures systems from JSON.
7. Spawns entities from JSON into ECS world state.
8. Attaches behaviors to entities from JSON.
9. Runs update loop (`ticker`) with enabled systems.

This makes game logic data-driven and easy to iterate without changing core runtime code for every gameplay change.

## 3) How To Create Games

Create a game by preparing one JSON config file and opening the runtime with that config URL.

High-level flow:

1. Define app settings.
2. Add asset registry entries.
3. Enable required systems.
4. Define entities with transform/sprite/components.
5. Attach behavior list for each entity.
6. Run with `npm run dev` and pass config URL.

Example:

- Local dev URL: `http://localhost:3000/?config=/config.sample.json`

You can also host JSON remotely if CORS allows browser fetches.

## 4) JSON Usage In The Engine

JSON is the game source of truth for:

- Engine/app setup (`app`).
- Runtime system toggles/config (`systems`).
- Asset declarations (`assets`).
- Game object declarations (`entities`).
- Behavior attachment and behavior properties (`entities[].behaviors[]`).
- Optional game-specific top-level blocks (for registered game systems).

This allows:

- Fast balancing/tuning.
- Reusable templates.
- Procedural or tool-generated content.
- Easy versioning of game content files.

## 5) JSON Format (Core Structure)

```json
{
  "app": {
    "width": 1280,
    "height": 720,
    "background": "#1a1a2e"
  },
  "systems": {
    "displaySync": { "enabled": true },
    "behavior": { "enabled": true },
    "physics": {
      "enabled": false,
      "gravity": { "x": 0, "y": 1 }
    }
  },
  "assets": [
    {
      "id": "playerSprite",
      "url": "/sprites/player.png",
      "type": "image",
      "width": 64,
      "height": 64
    }
  ],
  "entities": [
    {
      "id": "player",
      "transform": {
        "x": 200,
        "y": 200,
        "rotation": 0,
        "scaleX": 1,
        "scaleY": 1
      },
      "sprite": { "assetId": "playerSprite" },
      "behaviors": [
        { "type": "platform", "defaultControls": true },
        { "type": "boundToLayout", "boundBy": "edge" }
      ]
    }
  ]
}
```

### Core JSON Rules

- `assets[].id` must be unique and referenced by entity sprite configs.
- `entities[].id` should be unique for easier targeting.
- `behaviors[]` entries must use valid registered behavior `type`.
- System blocks should include `enabled` where relevant.

## 6) Systems (Built-in Runtime Systems)

- `displaySync`: writes ECS transform data into Pixi display objects.
- `behavior`: updates behavior instances each frame.
- `physics`: engine integration point for physics updates.

Game-layer systems are also supported (for example platformer, flappy, 2048 style modules) and can be selected by JSON config.

## 7) ECS System Brief

The engine follows ECS principles:

- **Entity**: lightweight ID.
- **Component**: pure data attached to entity (transform, display, meta, group, etc.).
- **System**: logic that iterates entities with required component sets.

Benefits:

- Better separation of data and logic.
- Easy feature composition.
- Better scalability than monolithic object inheritance.
- Cleaner runtime querying (`world.query(...)` patterns).

## 8) Behaviors (Brief + Use Cases)

Below is a concise guide for each built-in behavior, with where it is useful and example game types.

| Behavior | Brief | Best use case | Example games |
|---|---|---|---|
| `solid` | Blocks movement as a solid collider. | Ground, walls, static blockers. | Platformer, puzzle, top-down action |
| `jumpThru` | One-way platform collider. | Platforms you jump up through and land on. | Platformer, metroidvania |
| `platform` | Side-view run/jump movement. | Player control in gravity platform levels. | Platformer, endless runner |
| `eightDirection` | Free 8-axis directional movement. | Top-down player or enemy movement. | Zelda-like, twin-stick shooter |
| `car` | Car-like acceleration and turning. | Vehicle controls and racing feel. | Racing, driving missions |
| `moveTo` | Moves to target point smoothly. | Click-to-move or scripted movement. | RTS-lite, action RPG |
| `follow` | Follows another target/entity. | Companion AI, enemy tailing, camera target. | RPG, chase games |
| `pathfinding` | Navigates around obstacles. | Enemy AI route planning. | Stealth, tactics, maze games |
| `patrolChase` | Patrols until target is detected, then chases. | Guard/NPC behavior logic. | Stealth, survival |
| `lineOfSight` | Checks whether target is visible. | Detection cones and spotting systems. | Stealth, guard AI |
| `bullet` | Projectile movement and hit flow. | Shots, missiles, fast moving hazards. | Shooter, tower defense |
| `turret` | Auto target/aim/fire style logic. | Stationary or rotating defense units. | Tower defense, arena shooter |
| `physics` | Per-entity physics style behavior. | Physical responses, dynamic movement. | Physics platformer, sandbox |
| `tileMovement` | Grid/tile step-based movement. | Turn/grid movement on tile maps. | Puzzle, roguelike, tactics |
| `orbit` | Circular motion around a center/target. | Satellites, rotating hazards, rings. | Boss fights, arcade |
| `sine` | Sinusoidal oscillation movement. | Floating collectibles, enemy bobbing. | Arcade, platformer |
| `rotate` | Constant angular rotation. | Spinners, rotating blades, FX props. | Arcade, obstacle games |
| `tween` | Time-based value interpolation. | Smooth transitions, scripted motion. | UI-heavy games, cutscenes |
| `fade` | Fades object in/out over time. | Spawn/despawn visuals, ghosting effects. | Puzzle, narrative transitions |
| `flash` | Quick blink/tint flash effect. | Damage feedback, alert highlighting. | Combat games, arcade |
| `timer` | Triggers actions after delay/interval. | Cooldowns, delayed events, loops. | Any game genre |
| `dragDrop` | Pointer drag and drop interaction. | Card/item placement, editor interactions. | Card games, puzzle, level editor |
| `pin` | Pins object to another object. | Attach weapons, UI markers, effects. | Shooter, RPG, HUD-heavy games |
| `scrollTo` | Scrolls/focuses camera toward target. | Camera follow and cinematic pans. | Platformer, adventure |
| `boundToLayout` | Keeps entity inside layout bounds. | Prevent leaving visible play area. | Platformer, shooter, mobile arcade |
| `wrap` | Wraps entity to opposite edge. | Infinite looping world edges. | Asteroids-like, arcade |
| `destroyOutside` | Removes entity outside margins. | Cleanup for bullets/enemies/particles. | Shooter, endless runner |
| `persist` | Preserves entity/state across transitions. | Keep player/global managers alive. | Multi-level games, RPG |

## 9) Animations

Animation in this engine can be achieved via:

- Behavior-driven animation (`rotate`, `sine`, `fade`, `flash`, `tween`).
- Frame-update logic through systems.
- Pixi transform/sprite updates.
- GSAP-backed tweens for richer easing/timelines.

This enables both simple arcade motion and cinematic transitions.

## 10) Possibilities Of Games That Can Be Built

The architecture supports many genres, including:

- Platformers and runner games.
- Top-down shooters and survival games.
- Puzzle games (grid/tile based, e.g. 2048-like logic).
- Flappy/bird-style endless games.
- Tower-defense/turret-based mechanics.
- AI patrol/chase stealth prototypes.
- Physics-driven action mini-games.

Because systems and behaviors are modular, mixed-genre experiments are also possible.

## 11) JSON Generation

JSON can be created manually or generated by external tools/editors/pipelines.

Recommended generation workflow:

1. Maintain a schema-like template for required keys.
2. Generate deterministic IDs (`asset id`, `entity id`).
3. Validate behavior `type` names before export.
4. Run lightweight JSON validation before runtime load.
5. Store generated files in version control for reproducibility.

Good generator output should be human-readable and stable across exports to make diffs clean.

## 12) Extending And Scalability

### Extending

- Add new components under `src/Components`.
- Add new systems under `src/Systems` or `src/games`, then register in game system registry.
- Add new behaviors in `src/Behaviors`, then register in behavior bootstrap.
- Add new asset pipelines by extending loader/registry flow.

### Scalability

- JSON-driven content lets teams add content without touching core loop.
- ECS queries keep update logic focused and modular.
- Behavior composition avoids deep class inheritance.
- Game-specific systems can remain isolated from core engine internals.
- Tooling can auto-generate large content packs (levels, waves, object sets).

## 13) Folder Structure (Project-Level)

Typical structure:

- `src/Core`: app host, config loading, asset loading, game manager.
- `src/ECS`: world/entity-component storage/query logic.
- `src/Systems`: frame update systems.
- `src/Components`: reusable component data definitions.
- `src/Entities`: entity builders/spawners.
- `src/Behaviors`: behavior classes, registry, config defaults.
- `src/games`: game-mode specific systems/modules.
- `public`: static files and local JSON configs/assets.
- `docs`: project documentation (this file).

## 14) Tech Stack Brief

- `PixiJS`: high-performance WebGL/canvas 2D rendering and display graph.
- `Matter.js`: 2D physics engine integration path for physical simulation.
- `GSAP`: tweening and timeline-based motion/easing.
- `Vite`: fast development server and modern frontend build tooling.
- `JavaScript (ES modules)`: runtime and engine implementation language.

## 15) Game Development Notes

Recommended iterative workflow:

1. Start with minimal JSON and one player entity.
2. Add systems and one behavior at a time.
3. Keep assets IDs consistent and descriptive.
4. Use small reusable behavior presets.
5. Add game-specific system modules only when behavior composition is not enough.
6. Keep one sample config per game mode for testing and onboarding.

This helps maintain fast iteration and predictable runtime behavior.
