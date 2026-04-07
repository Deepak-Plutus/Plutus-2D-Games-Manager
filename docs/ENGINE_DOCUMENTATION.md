# Plutus 2D Games Manager - Engine Documentation

This document reflects the current engine architecture, why each part exists, and how to use it in day-to-day game authoring.

## Engine Summary

Plutus 2D is a JSON-driven ECS runtime for 2D games built on:

- `PixiJS` for rendering and display hierarchy
- `GSAP` for tween-based animation and transitions
- `Matter.js` integration points for physics-style workflows
- Typed TypeScript config contracts for safer AI/manual authoring

Core idea: game content is data (`public/*.json`), engine behavior is modular (`systems`, `components`, `behaviors`, `games`), and bootstrap is extensible.

## Runtime Flow

At startup, `GameManager` performs:

1. Initialize app host + scene layers
2. Resolve config URL (`?config=...`) and fetch JSON
3. Parse and validate top-level config shape
4. Resolve system factories (core + game systems)
5. Apply app/input/system config
6. Load assets
7. Spawn entities/components/behaviors
8. Bootstrap game systems
9. Enter ticker loop (`update(dt)`)

This is why config structure consistency matters: the runtime path is fully data-driven.

## Current Architecture (And Why)

### Typed Config Contract

- `src/Core/GameConfig.ts`
- `src/Core/ConfigValidation.ts`

Why:
- Prevent brittle config evolution
- Make AI output predictable
- Catch malformed top-level config early

Use case:
- AI generation, tooling validation, and safer refactors.

### JSON Schema Generation

- Source type: `GameConfigSchema` in `src/Core/GameConfig.ts`
- Generator: `scripts/generate-config-schema.mjs`
- Output: `docs/schemas/game-config.schema.json`

Why:
- External tools can validate configs without running engine
- AI pipelines can validate before runtime

Use case:
- CI checks, prompt pipelines, editor integration.

### System Factory Registry

- `src/bootstrap/SystemFactoryRegistry.ts`
- Game registration: `src/games/registerGameSystems.ts`

Supports:
- `phase` ordering
- `after` dependencies
- config-driven enable checks
- explicit JSON ordering via `systemsOrder`

Why:
- Deterministic execution order across many game modes
- Easier future plugin/add-on systems

Use case:
- Add new game system with clear dependencies instead of ad-hoc ordering logic.

### Component Parser Registry

- `src/bootstrap/ComponentParserRegistry.ts`
- default parsers: `src/bootstrap/componentParsers.ts`
- consumed by: `src/Entities/EntityBuilder.ts`

Why:
- Keeps entity build pipeline extensible
- Allows adding new component families without bloating `EntityBuilder`

Use case:
- Add parser for a new authored block (e.g. custom fx component) cleanly.

### Bootstrap Contributions

- `src/bootstrap/BootstrapContributionRegistry.ts`

Stages:
- `beforeEntities`
- `afterEntities`
- `afterSystemsReady`

Why:
- Plugin-style extension points around bootstrap lifecycle
- Avoid deep edits in `GameManager` for every new initialization step

Use case:
- Register game/editor/debug setup hooks at specific lifecycle stages.

## Standard Game Config Shape

Recommended top-level order for all game JSONs:

1. `broadcastChannel` (optional)
2. `app`
3. `systems`
4. `systemsOrder`
5. `input`
6. `layers`
7. `objectTypes`
8. `assets`
9. `entities`
10. optional game-specific block (`platformerGame`, `game2048`, etc.)

Minimum practical starter:

```json
{
  "app": { "width": "fullscreen", "height": "fullscreen", "background": "#101828" },
  "systems": {
    "behavior": { "enabled": true },
    "displaySync": { "enabled": true },
    "physics": { "enabled": false }
  },
  "systemsOrder": ["behavior", "physics", "displaySync"],
  "layers": [{ "name": "Main", "zIndex": 100 }],
  "assets": [],
  "objectTypes": [],
  "entities": []
}
```

## Config Rules To Follow

- `assets[].id`, `objectTypes[].id`, `entities[].id` should be unique and stable
- `behaviors[]` entries must include `type`
- keep `systems` explicit (`enabled` flags)
- set `systemsOrder` explicitly for deterministic updates
- prefer reusable `objectTypes` and short entity instances
- avoid unknown top-level keys unless engine code consumes them

## AI Authoring Files

- Base template: `ai-friendly-base-config.ts`
- AI guide: `docs/AI_CONFIG_GUIDE.md`
- Schema: `docs/schemas/game-config.schema.json`

Purpose:
- Gives AI a consistent scaffold
- Reduces “invented shape” errors
- Keeps generated configs aligned with runtime expectations

## Systems, Components, Behaviors (Quick Use Cases)

- Systems: frame logic (`behavior`, `displaySync`, `physics`, plus game systems)
- Components: data (`transform`, `sprite`, `collision`, `instanceVariables`, etc.)
- Behaviors: reusable per-entity logic (`platform`, `patrolChase`, `sine`, `tween`, etc.)

Typical mapping:
- platformers: `platform`, `solid`, `jumpThru`, `patrolChase`
- top-down/stealth: `eightDirection`, `pathfinding`, `lineOfSight`
- puzzle/grids: `tileMovement`, game-specific system orchestration

## Behavior Brief + Use Cases

| Behavior | What it does | Common use cases |
|---|---|---|
| `solid` | Adds solid collision contribution. | Walls, floors, blockers. |
| `jumpThru` | One-way platform collision. | Platform floors you can jump through from below. |
| `platform` | Side-view movement with jump/gravity. | Player in platformer levels. |
| `eightDirection` | Free directional movement. | Top-down player/NPC movement. |
| `car` | Car-like steer/acceleration handling. | Driving gameplay. |
| `moveTo` | Moves toward target position. | Click-to-move actors, scripted movement. |
| `follow` | Follows another entity/path history. | Companions, snake-tail logic. |
| `pathfinding` | Computes route around blockers. | Enemy navigation in mazes/stealth maps. |
| `patrolChase` | Patrols and chases based on conditions. | Guard and enemy AI loops. |
| `lineOfSight` | Visibility checks with blockers. | Detection cones and stealth logic. |
| `bullet` | Projectile stepping/collision checks. | Shooter bullets and hitscan-like movement. |
| `turret` | Periodic targeting and firing behavior. | Automated defense units. |
| `physics` | Per-entity motion/collision resolution. | Dynamic actors with collision constraints. |
| `tileMovement` | Grid-locked movement steps. | Grid puzzle/roguelike movement. |
| `orbit` | Circular movement around center/target. | Orbiting enemies/effects. |
| `sine` | Oscillatory movement/size animation. | Floating pickups, idle enemy motion. |
| `rotate` | Constant angular rotation. | Spinning hazards/props. |
| `tween` | Property interpolation over time. | Smooth scripted transforms/fades. |
| `fade` | Alpha fade in/out behavior. | Spawn/despawn effects. |
| `flash` | Temporary blink/tint feedback. | Damage feedback and alerts. |
| `timer` | Delay/interval-driven callbacks. | Cooldowns and scheduled triggers. |
| `dragDrop` | Pointer drag/drop interaction. | Puzzle UI and editor-like interactions. |
| `pin` | Attaches transform to another entity. | Weapon-to-player, marker-to-target linkage. |
| `scrollTo` | Requests camera focus/scroll changes. | Camera follow/pan effects. |
| `boundToLayout` | Clamps entity to layout bounds. | Keep actors inside game area. |
| `wrap` | Wraps to opposite side of layout. | Asteroids-like looping maps. |
| `destroyOutside` | Auto-destroys off-layout entities. | Projectile/particle cleanup. |
| `persist` | Marks entity for persistence intent. | Manager-like entities across flows. |

Practical rule: use behavior composition first; add/extend a game system only when orchestration across many entities is required.

## Animations Brief

Animation in this engine is usually done in three layers:

- **Behavior animation**  
  Use `sine`, `rotate`, `fade`, `flash`, `tween` for per-entity motion/visual transitions.

- **System/game animation**  
  Use game system logic for sequence-level animations (for example 2048 slide/merge flow, stealth UI transitions, game-over panels).

- **GSAP-driven interpolation**  
  For timed movement, easing, and chained effects where raw frame math would be verbose.

Common guidance:
- Use behavior-level animation for reusable patterns.
- Use GSAP for short, polished transitions.
- Keep transforms pixel-snapped where needed (e.g. grid/tile games) to avoid visual jitter/artifacts.

## Package Scripts (Brief)

From `package.json`:

- `npm run dev`  
  Starts Vite dev server.

- `npm run typecheck`  
  Runs strict TS checks (`tsc --noEmit`).

- `npm run generate:schema`  
  Generates `docs/schemas/game-config.schema.json` from `src/Core/GameConfig.ts`.

- `npm run build`  
  Produces production build via Vite.

- `npm run preview`  
  Serves built output locally.

Recommended workflow:
- author/update config
- run `npm run generate:schema` when config types change
- run `npm run typecheck`
- run `npm run dev` and test with target `?config=...`

## Folder Guide

- `src/Core` - startup/runtime orchestration (`GameManager`, config, input, assets)
- `src/ECS` - world storage + querying
- `src/Components` - component data models
- `src/Behaviors` - reusable behavior modules + defaults
- `src/Systems` - core update systems
- `src/Entities` - entity spawn/build pipeline
- `src/bootstrap` - system/parser/contribution registries
- `src/games` - game-mode systems (Platformer, 2048, Flappy, Stealth)
- `public` - game JSONs and static assets
- `docs` - guides and schema

## Practical Notes

- Current architecture is intentionally backward-compatible with existing game JSONs.
- Standardized JSON (especially `systemsOrder`) improves reproducibility.
- If visuals disappear after refactors, verify entity parse/build order first (components before display creation).

This structure is designed for both manual game development and AI-assisted generation at scale.
