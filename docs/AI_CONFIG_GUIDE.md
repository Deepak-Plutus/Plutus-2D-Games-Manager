# AI Config Authoring Guide

This guide defines the preferred JSON authoring format for AI-generated games in Plutus 2D.

## Source of Truth

- Type contract: `src/Core/GameConfig.ts`
- Runtime validation: `src/Core/ConfigValidation.ts`
- JSON schema: `docs/schemas/game-config.schema.json`
- AI template: `ai-friendly-base-config.ts`

## Authoring Rules

- Always output a JSON object root.
- Keep IDs stable and deterministic:
  - `assets[].id`
  - `entities[].id`
  - `objectTypes[].id`
- Prefer `objectTypes` + `entities[].type` reuse over duplicating large per-entity blocks.
- Put system config in `systems.<systemName>`.
- Keep optional game-specific blocks (`platformerGame`, `flappyBird`, etc.) consistent with `systems` entries.
- Every behavior object in `behaviors[]` must include `type`.

## Recommended Minimal Template

```json
{
  "app": {
    "width": 1280,
    "height": 720,
    "background": "#101828"
  },
  "systems": {
    "behavior": { "enabled": true },
    "displaySync": { "enabled": true },
    "physics": { "enabled": false }
  },
  "systemsOrder": ["behavior", "physics", "displaySync"],
  "assets": [],
  "layers": [{ "name": "Main", "zIndex": 100 }],
  "objectTypes": [],
  "entities": []
}
```

## System Ordering

Use `systemsOrder` to request explicit update order.

- Unknown system names are ignored.
- Enabled systems not listed in `systemsOrder` are appended automatically.
- Dependency/phase metadata is still respected by factory resolution.

## Bootstrap Hooks (Engine Extensions)

The engine exposes staged bootstrap contribution points:

- `beforeEntities`
- `afterEntities`
- `afterSystemsReady`

These are for plugin/module authors, so AI-generated engine extensions can inject setup logic without editing `GameManager`.

## Validation Workflow

1. Generate JSON from prompt/tooling.
2. Validate against `docs/schemas/game-config.schema.json`.
3. Run engine; runtime guard in `ConfigValidation` enforces top-level shape.
4. Fix invalid blocks and retry.
