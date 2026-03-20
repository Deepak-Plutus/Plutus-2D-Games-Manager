import "./style.css";
import * as PIXI from "pixi.js";
import type { GameDefinition } from "./Definitions/GameDefinition";
import { createRuntime } from "./games/createRuntime";
import platformerDef from "./games/platformer_mario.json";
import topdownShooterDef from "./games/topdown_shooter.json";
import {
  fetchGameConfigFromS3,
  getConfigUrlFromQueryParam,
} from "./utils/configLoader";

const root = document.querySelector<HTMLDivElement>("#app");
if (!root) throw new Error("Missing #app");

root.innerHTML = `
  <div id="hud">
    <div class="title">Plutus JSON → Game (Pixi + ECS)</div>
    <div class="help">Move with <b>WASD</b> or <b>Arrow Keys</b></div>
  </div>
  <div id="game"></div>
`;

/**
 * Loads the game configuration from S3.
 */
async function loadGameConfig(): Promise<GameDefinition | undefined> {
  // Check if config URL is provided in query parameter
  const urlParams = new URLSearchParams(window.location.search);
  const hasConfigParam = urlParams.has("config");

  // Use S3 if query param exists
  const useS3 = hasConfigParam;

  if (useS3) {
    try {
      console.log("Loading game config from S3...");
      const s3Url = getConfigUrlFromQueryParam() ?? "";
      if (!s3Url) {
        throw new Error("No config URL found in query param");
      }
      const config = await fetchGameConfigFromS3(s3Url);
      console.log("Successfully loaded game config from S3");
      return config;
    } catch (error) {
      console.error(
        "Failed to load config from S3, falling back to local config:",
        error,
      );
    }
  }
}

async function boot() {
  const app = new PIXI.Application();
  await app.init({
    resizeTo: window,
    background: "#0b1020",
    antialias: true,
  });

  const gameHost = document.querySelector<HTMLDivElement>("#game");
  if (!gameHost) throw new Error("Missing #game");
  gameHost.appendChild(app.canvas);

  // Select game by URL query:
  // - ?game=platformer
  // - ?game=shooter
  const gameConfig = await loadGameConfig();
  if (!gameConfig) {
    throw new Error("No game config found");
  }
  const gameKey = gameConfig.genre;
  const gameDefs: Record<string, GameDefinition> = {
    platformer: platformerDef as GameDefinition,
    shooter: topdownShooterDef as GameDefinition,
  };
  const activeDef = gameDefs[gameKey ?? ""] ?? gameDefs.platformer;

  const runtime = createRuntime(app, activeDef);
  runtime.start();
}

void boot();
