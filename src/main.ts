import './style.css';
import * as PIXI from 'pixi.js';
import type { GameDefinition } from './Definitions/GameDefinition';
import { createRuntime } from './games/createRuntime';
import platformerDef from './games/platformer_mario.json';
import topdownShooterDef from './games/topdown_shooter.json';

const root = document.querySelector<HTMLDivElement>('#app');
if (!root) throw new Error('Missing #app');

root.innerHTML = `
  <div id="hud">
    <div class="title">Plutus JSON → Game (Pixi + ECS)</div>
    <div class="help">Move with <b>WASD</b> or <b>Arrow Keys</b></div>
  </div>
  <div id="game"></div>
`;

async function boot() {
  const app = new PIXI.Application();
  await app.init({
    resizeTo: window,
    background: '#0b1020',
    antialias: true,
  });

  const gameHost = document.querySelector<HTMLDivElement>('#game');
  if (!gameHost) throw new Error('Missing #game');
  gameHost.appendChild(app.canvas);

  // Select game by URL query:
  // - ?game=platformer
  // - ?game=shooter
  const gameKey = new URLSearchParams(window.location.search).get('game')?.toLowerCase();
  const gameDefs: Record<string, GameDefinition> = {
    platformer: platformerDef as GameDefinition,
    shooter: topdownShooterDef as GameDefinition,
  };
  const activeDef = gameDefs[gameKey ?? ''] ?? gameDefs.platformer;

  const runtime = createRuntime(app, activeDef);
  runtime.start();
}

void boot();
