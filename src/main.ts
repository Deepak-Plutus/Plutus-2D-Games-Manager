import "./style.css";
import * as PIXI from "pixi.js";
import type { GameDefinition } from "./Definitions/GameDefinition";
import { createRuntime } from "./games/createRuntime";
import platformerDef from "./games/platformer_mario.json";
import topdownShooterDef from "./games/topdown_shooter.json";
import spaceBulletHellDef from "./games/spaceBulletHell.json";
import {
  fetchGameConfigFromS3,
  getConfigUrlFromQueryParam,
} from "./utils/configLoader";

const root = document.querySelector<HTMLDivElement>("#app");
if (!root) throw new Error("Missing #app");

root.innerHTML = `
  <div id="hud">
    <div class="help">Move with <b>WASD</b> or <b>Arrow Keys</b> • Aim with <b>Mouse</b> • Shoot with <b>Click</b></div>
    <div id="hud-stats" class="stats">HUD: --</div>
  </div>
  <div id="game-shell">
    <div id="game"></div>
  </div>
`;

/**
 * Loads the game configuration from S3.
 */
function getLocalGameConfig(): GameDefinition {
  const urlParams = new URLSearchParams(window.location.search);
  const gameKey = urlParams.get("game");
  const gameDefs: Record<string, GameDefinition> = {
    platformer: platformerDef as GameDefinition,
    shooter: topdownShooterDef as GameDefinition,
    spaceBulletHell: spaceBulletHellDef as GameDefinition,
  };

  return gameDefs[gameKey ?? ""] ?? gameDefs.platformer;
}

async function loadGameConfig(): Promise<GameDefinition> {
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

  return getLocalGameConfig();
}

async function boot() {
  // Select game by URL query:
  // - ?game=platformer
  // - ?game=shooter
  const activeDef = await loadGameConfig();

  applyViewportLayout(activeDef);

  const gameHost = document.querySelector<HTMLDivElement>("#game");
  if (!gameHost) throw new Error("Missing #game");

  const app = new PIXI.Application();
  await app.init({
    resizeTo: gameHost,
    background: "#0b1020",
    antialias: true,
  });

  gameHost.appendChild(app.canvas);

  const runtime = createRuntime(app, activeDef);
  runtime.start();
}

void boot();

function applyViewportLayout(def: GameDefinition): void {
  const shell = document.querySelector<HTMLDivElement>("#game-shell");
  if (!shell) return;

  const viewport = (def.world as any)?.viewport;
  const mode = typeof viewport?.mode === "string" ? viewport.mode : "fill";
  if (mode !== "mobile") {
    shell.classList.remove("mobile-shell");
    shell.style.removeProperty("--game-view-width");
    shell.style.removeProperty("--game-view-height");
    return;
  }

  const width = Number(viewport?.width);
  const height = Number(viewport?.height);
  const safeWidth = Number.isFinite(width) && width > 0 ? width : 390;
  const safeHeight = Number.isFinite(height) && height > 0 ? height : 844;

  shell.classList.add("mobile-shell");
  shell.style.setProperty("--game-view-width", `${safeWidth}`);
  shell.style.setProperty("--game-view-height", `${safeHeight}`);
}
