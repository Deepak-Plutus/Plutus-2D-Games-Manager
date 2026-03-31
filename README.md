# Plutus — JSON-driven Game Manager (PixiJS + ECS)

This project is a **game runtime**, not a single fixed game. A game is described by **JSON**: canvas size, asset list, which **systems** run, **entities** (components), and **behaviors**. The editor/runtime flow is inspired by a **Construct 3–style** pipeline: load config → preload assets → spawn entities → tick systems.

## Runtime workflow (order matters)

1. **Boot** — `AppHost` creates the Pixi `Application`, appends the **canvas** to `#app`, and uses default width/height until config is applied.
2. **Loading screen (Pixi)** — A full-stage **black overlay** with centered **“Loading…”** text and a **percentage** (`LoadingScreen`). This is the first thing visible.
3. **Resolve config URL** — Read `?config=<url>` from the page query string. If `config` is missing, the dev fallback is `/config.sample.json` (with a console warning).
4. **Fetch JSON** — `GET` the config (local path under `public/` or any URL your browser can fetch; remote URLs need **CORS**).
5. **Parse JSON** — Validate as an object; invalid JSON shows an error on the loading overlay.
6. **Apply `app` block** — Set renderer **width**, **height**, and **background** from JSON (`AppHost.applyAppConfig`).
7. **Resize loading UI** — Overlay matches the new canvas size.
8. **Load assets** — For each entry in `assets`, download and register by **`id`** (keyword) in `AssetRegistry`:
   - **`type`: `"image"`** (default) — Pixi `Texture` (GIFs load like raster images in the browser).
   - **`type`: `"audio"`** — `HTMLAudioElement` preloaded (`mp3`, etc.).
   - Optional **`width` / `height`** define the **display size in app space** (used when spawning sprites).
9. **Progress** — Loading text updates through **config + assets** (roughly 0% → 20% setup, 20% → 100% per-asset progress).
10. **Configure systems** — `SystemRegistry` reads `systems.<name>.enabled` and passes each block to `system.configure(options)` for **property-driven** setup.
11. **Spawn entities** — `EntityBuilder.spawnFromConfig(...)` creates ECS entities from `entities[]`: **transform** (`Transform.fromJson`), optional **sprite** (uses registry sizes), optional **behaviors** list.
12. **Hide loading screen** — Overlay is removed; **game loop** starts.
13. **Game loop** — Pixi `ticker` calls `SystemRegistry.update(dt, world)` on the `GameManager` instance each frame. Only **enabled** systems run. **Behavior** runs before **displaySync** so transforms update before Pixi views sync.

## Folder map

| Area | Path | Role |
|------|------|------|
| Entry | `src/script.js` → `src/main.js` | `new GameManager(container).start()` |
| Bootstrap | `src/Core/GameManager.js` | Class that orchestrates the workflow above |
| Canvas / Pixi app | `src/Core/AppHost.js` | Canvas in DOM, size/background from JSON |
| Config | `src/Core/ConfigLoader.js` (static `fetch` / `parse`), `src/Core/ConfigResolver.js` (`resolveUrlFromQuery`) | `?config=` resolution |
| Assets | `src/Core/AssetLoader.js` (`loadAll`), `src/Core/AssetRegistry.js` | Preload + keyword storage |
| Loading UI | `src/Core/LoadingScreen.js` | Black overlay, status + percent |
| Systems | `src/Core/SystemRegistry.js`, `src/Systems/*` | Enable/disable + tick |
| ECS world | `src/ECS/World.js` | Entities + component maps |
| **Components** | `src/Components/*` (`Transform.js`, `Display.js`, `index.js`) | Component data + id constants |
| **Entities** | `src/Entities/EntityBuilder.js` | JSON → entities + Pixi views |
| **Behaviors** | `src/Behaviors/*` | `BehaviorRegistry`, `RotateBehavior.js`, `index.js` (`BehaviorBootstrap`) |

## JSON schema (minimal)

```json
{
  "app": {
    "width": 800,
    "height": 600,
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
      "id": "bunny",
      "url": "https://example.com/bunny.png",
      "type": "image",
      "width": 80,
      "height": 90
    },
    {
      "id": "click",
      "url": "/sfx/click.mp3",
      "type": "audio"
    }
  ],
  "entities": [
    {
      "id": "player",
      "transform": { "x": 400, "y": 300, "rotation": 0, "scaleX": 1, "scaleY": 1 },
      "sprite": { "assetId": "bunny" },
      "behaviors": [
        { "type": "platform", "defaultControls": true },
        { "type": "boundToLayout", "boundBy": "edge" }
      ]
    }
  ]
}
```

### Systems (built-in names)

- **`displaySync`** — Copies each entity’s `transform` to its Pixi `display.view`.
- **`behavior`** — Runs behavior plugins for entities with a `behaviors` array.
- **`physics`** — Matter.js engine **stub**; when `enabled: true`, starts a runner. Extend to sync bodies with components.

### Behaviors (Construct-style)

Each entry in `behaviors` becomes a **class instance** (not raw JSON at runtime). All extend `BaseBehavior`:

- **`enabled`** in JSON; at runtime: `enabled` getter/setter, `isEnabled()`, `setEnabled(boolean)`.
- **Properties** — defaults on `static defaultProperties`, overridden by JSON keys; `applyJsonProperties()` maps them.
- **Actions** — methods (e.g. `simulateControl`, `setVector`, `setMaxSpeed`).
- **Expressions** — getters (e.g. `vectorX`, `isOnFloor`, `speed`).

**Defaults (no magic numbers in classes)** — Each Construct-like behavior pulls numeric defaults from `src/Behaviors/Config/*BehaviorConfig.js`. `static defaultProperties` clones that object; JSON overrides the same keys.

**Events & BroadcastChannel** — `GameManager` creates `BehaviorEventHub` (`src/Core/BehaviorEventHub.js`). Behaviors call `ctx.events.emit('eventName', { ...detail })`. Listen with `game.behaviorEvents.addEventListener('fade:complete', (e) => { ... e.detail })`. Optional root JSON **`broadcastChannel`**: string name mirrors emits to `BroadcastChannel` for other tabs/workers.

**Runtime context** (`ctx` in `tick`) includes `world`, `events`, `pointer`, `input`, `layoutWidth` / `layoutHeight`, `displayView`, `stage`, and **`colliders`** (AABB list from entities with `collision`).

**Collision** — Entity JSON may set `"collision": { "kind": "solid"|"jumpThru", "width", "height", "offsetX", "offsetY" }`. Behaviors **`solid`** / **`jumpThru`** also register the same via `getCollisionContribution()`. Manual `collision` on an entity overrides behavior-provided shapes (applied last in `EntityBuilder`).

**GSAP** — Used by **`fade`** and **`flash`** (project dependency `gsap`).

Built-in `type` strings:

| `type` | Class | Notes |
|--------|--------|--------|
| `solid` | `SolidBehavior` | Registers solid AABB; [C3 ref](https://www.construct.net/en/make-games/manuals/construct-3/behavior-reference/solid) |
| `jumpThru` | `JumpThruBehavior` | Jump-through platform; [C3 ref](https://www.construct.net/en/make-games/manuals/construct-3/behavior-reference/jump-thru) |
| `bullet` | `BulletBehavior` | speed, angle, acceleration, gravity, bounceOffSolids, bounceDamping, destroyOnSolid; emits `bullet:hit`; [C3 ref](https://www.construct.net/en/make-games/manuals/construct-3/behavior-reference/bullet) |
| `platform` | `PlatformBehavior` | Uses **layout floor** plus **solid/jumpThru** colliders for landing (jump-thru only when falling). [C3 ref](https://www.construct.net/en/make-games/manuals/construct-3/behavior-reference/platform) |
| `eightDirection` | `EightDirectionBehavior` | [C3 ref](https://www.construct.net/en/make-games/manuals/construct-3/behavior-reference/8-direction) |
| `moveTo` | `MoveToBehavior` | targetX/Y, maxSpeed, acceleration, arriveDistance, rotateToward, autoStart; emits `moveTo:arrived`; [C3 ref](https://www.construct.net/en/make-games/manuals/construct-3/behavior-reference/move) |
| `follow` | `FollowBehavior` | targetName (`meta.name`), maxSpeed, stopDistance, rotateToward; [C3 ref](https://www.construct.net/en/make-games/manuals/construct-3/behavior-reference/follow) |
| `lineOfSight` | `LineOfSightBehavior` | targetName, range, rayStep; emits `lineOfSight:changed` `{ hasLos }`; [C3 ref](https://www.construct.net/en/make-games/manuals/construct-3/behavior-reference/line-of-sight) |
| `dragDrop` | `DragDropBehavior` | axes, dragThreshold, dragZOffset; uses `PointerInput` + Pixi `pointerdown`; emits `dragDrop:dragStart`, `dragDrop:dragMove`, `dragDrop:drop`; [C3 ref](https://www.construct.net/en/make-games/manuals/construct-3/behavior-reference/drag-drop) |
| `fade` | `FadeBehavior` | fadeInDuration, waitDuration, fadeOutDuration, loop, destroyOnComplete, startDelay, ease; emits `fade:complete`; [C3 ref](https://www.construct.net/en/make-games/manuals/construct-3/behavior-reference/fade) |
| `flash` | `FlashBehavior` | onDuration, offDuration, repeatCount, flashTint, restoreTint, ease; emits `flash:complete`; [C3 ref](https://www.construct.net/en/make-games/manuals/construct-3/behavior-reference/flash) |
| `destroyOutside` | `DestroyOutsideLayoutBehavior` | marginLeft/Right/Top/Bottom; emits `destroyOutside:beforeDestroy`; [C3 ref](https://www.construct.net/en/make-games/manuals/construct-3/behavior-reference/destroy-outside) |
| `boundToLayout` | `BoundToLayoutBehavior` | [C3 ref](https://www.construct.net/en/make-games/manuals/construct-3/behavior-reference/bound-to-layout) |
| `rotate` | `RotateBehavior` | `speed` (rad/s) |

**Priority** — lower runs first (e.g. solid `5`, platform `10`, drag `25`, lineOfSight `35`, fade `40`, destroyOutside `110`). Same priority keeps JSON order.

**Input** — `KeyboardInput` + **`PointerInput`** (canvas-normalized). Platform / eightDirection **`keyBindings`** default to arrow keys; **`updateKeyBindings`** / **`getKeyBindings`** on those two.

**New behavior** — extend `BaseBehavior`, add defaults in `Behaviors/Config/`, set `static defaultProperties`, `registerClass` in `BehaviorBootstrap`.

## Config URL examples

- Local (Vite `public/`):  
  `http://localhost:3000/?config=/config.sample.json`
- Hosted:  
  `https://your.cdn/game.json` → `?config=https%3A%2F%2Fyour.cdn%2Fgame.json`

## Commands

```bash
npm install
npm run dev
```

Dev server port is **3000** (`vite.config.js`).

## Extending

- **New component** — Add under `src/Components/`, attach in `EntityBuilder` or a dedicated spawner.
- **New game system** — Add class under `src/games/` or `src/Systems/`, register it in `src/games/registerGameSystems.js`, and configure with `systems.<name>` and optional root `<name>` JSON block.
- **New behavior** — `registry.registerClass(YourBehavior)` in `BehaviorBootstrap.registerAll`.
