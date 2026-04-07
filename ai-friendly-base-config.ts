import { defineGameConfig } from './src/Core/GameConfig.js'

// AI authoring guardrails for Plutus 2D:
// 1) Keep this file schema-valid first (see docs/schemas/game-config.schema.json).
// 2) Keep IDs stable across references:
//    - systems.<gameSystem>
//    - assets[].id
//    - objectTypes[].id
//    - entities[].id
// 3) Prefer objectTypes + entities[].type reuse over repeating large per-entity blocks.
// 4) Every behavior entry must include a valid `type`.
// 5) Keep systems explicit and ordered via systemsOrder.
// 6) Use fullscreen app defaults unless user asks otherwise.
// 7) Do not invent unknown top-level keys unless engine has a consumer for them.

// Common system name reference (use one or more game systems as needed):
// - platformerGame
// - game2048
// - flappyBird
// - stealthAssassin

export default defineGameConfig({
  broadcastChannel: 'plutus-ai-game',

  app: {
    fullscreen: true,
    width: 'fullscreen',
    height: 'fullscreen',
    background: '#101828'
  },

  systems: {
    behavior: { enabled: true },
    displaySync: { enabled: true },
    physics: { enabled: false },

    // Enable exactly the game mode you are authoring.
    platformerGame: {
      enabled: false
    },
    game2048: {
      enabled: false
    },
    flappyBird: {
      enabled: false
    },
    stealthAssassin: {
      enabled: false
    }
  },

  // Keep deterministic update order. Add active game system(s) at end.
  systemsOrder: ['behavior', 'physics', 'displaySync'],

  input: {
    actions: {
      left: ['ArrowLeft', 'KeyA'],
      right: ['ArrowRight', 'KeyD'],
      up: ['ArrowUp', 'KeyW'],
      down: ['ArrowDown', 'KeyS'],
      jump: ['Space'],
      interact: ['KeyE']
    },
    wheel: { enabled: false },
    gamepad: { enabled: false }
  },

  layers: [
    { name: 'Background', zIndex: 0 },
    { name: 'Main', zIndex: 100 },
    { name: 'Top', zIndex: 200 }
  ],

  assets: [
    // Example:
    // { id: 'pixel', url: '/pixel.png', type: 'image' }
  ],

  objectTypes: [
    {
      id: 'groundBlock',
      plugin: 'Sprite',
      layer: 'Main',
      sprite: { shape: 'rect', tint: 0x5b9e5b, anchorX: 0.5, anchorY: 0.5 },
      collision: { kind: 'solid', width: 1, height: 1, offsetX: 0, offsetY: 0 }
    },
    {
      id: 'playerAgent',
      plugin: 'Sprite',
      layer: 'Main',
      sprite: { shape: 'rect', tint: 0x4f46e5, anchorX: 0.5, anchorY: 0.5 },
      tags: ['player'],
      behaviors: [
        // Replace based on selected game mode.
        { type: 'platform', defaultControls: true }
      ],
      instanceVariables: { lives: 3, score: 0 }
    }
  ],

  entities: [
    {
      id: 'ground_0',
      type: 'groundBlock',
      transform: { x: 640, y: 700, rotation: 0, scaleX: 1280, scaleY: 40 }
    },
    {
      id: 'player',
      type: 'playerAgent',
      transform: { x: 240, y: 620, rotation: 0, scaleX: 32, scaleY: 32 }
    }
  ]
})
