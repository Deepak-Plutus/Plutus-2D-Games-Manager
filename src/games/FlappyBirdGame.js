import { Container, Graphics, Sprite, Text } from 'pixi.js';
import { BaseSystem } from '../Systems/BaseSystem.js';

/**
 * Flappy Bird-style game system (self-contained game-specific UI/logic).
 */
export class FlappyBirdGame extends BaseSystem {
  static inputRequirements = { keyboard: true, pointer: true, wheel: false, gamepad: false };

  constructor() {
    super();
    this.birdAssetId = 'birdSprite';
    this.pipeSpeed = 205;
    this.pipeWidth = 92;
    this.pipeGap = 188;
    this.pipeSpawnSec = 1.25;
    this.gravity = 1350;
    this.flapVelocity = -360;
    this.groundHeight = 92;
    this.birdScale = 0.16;
    this.birdRadius = 14;
    this.maxFallSpeed = 620;
    this.maxRiseSpeed = -440;

    this._layoutW = 800;
    this._layoutH = 600;
    this._registry = null;
    this._stage = null;
    this._uiRoot = null;
    this._inputCoordinator = null;
    this._inputHub = null;
    this._flapUnsub = null;

    this._root = null;
    this._pipesRoot = null;
    this._bird = null;
    this._scoreText = null;
    this._ground = null;
    this._gameOverText = null;

    this._birdX = 220;
    this._birdY = 280;
    this._birdVY = 0;
    this._spawnT = 0;
    this._score = 0;
    this._gameOver = false;
    this._pendingFlap = false;
    this._prevSpace = false;
    /** @type {Array<{ x:number, gapY:number, passed:boolean, top:Graphics, bottom:Graphics }>} */
    this._pipes = [];
  }

  /**
   * @param {Record<string, unknown>} options
   */
  configure(options = {}) {
    if (options.birdAssetId != null) this.birdAssetId = String(options.birdAssetId);
    if (options.pipeSpeed != null) this.pipeSpeed = Number(options.pipeSpeed) || this.pipeSpeed;
    if (options.pipeWidth != null) this.pipeWidth = Number(options.pipeWidth) || this.pipeWidth;
    if (options.pipeGap != null) this.pipeGap = Number(options.pipeGap) || this.pipeGap;
    if (options.pipeSpawnSec != null) this.pipeSpawnSec = Number(options.pipeSpawnSec) || this.pipeSpawnSec;
    if (options.gravity != null) this.gravity = Number(options.gravity) || this.gravity;
    if (options.flapVelocity != null) this.flapVelocity = Number(options.flapVelocity) || this.flapVelocity;
    if (options.groundHeight != null) this.groundHeight = Number(options.groundHeight) || this.groundHeight;
    if (options.birdScale != null) this.birdScale = Number(options.birdScale) || this.birdScale;
    if (options.birdRadius != null) this.birdRadius = Number(options.birdRadius) || this.birdRadius;
    if (options.maxFallSpeed != null) this.maxFallSpeed = Number(options.maxFallSpeed) || this.maxFallSpeed;
    if (options.maxRiseSpeed != null) this.maxRiseSpeed = Number(options.maxRiseSpeed) || this.maxRiseSpeed;
  }

  setRuntime(w, h, inputCoordinator, inputHub) {
    this._layoutW = Number(w) || 800;
    this._layoutH = Number(h) || 600;
    this._inputCoordinator = inputCoordinator;
    this._inputHub = inputHub;
    this._bindFlapInput();
  }

  setScreenUi(uiRoot, viewW, viewH) {
    this._uiRoot = uiRoot;
    this._layoutW = Number(viewW) || this._layoutW;
    this._layoutH = Number(viewH) || this._layoutH;
    if (!uiRoot) return;
    uiRoot.sortableChildren = true;
    this._createScoreUi();
  }

  _bindFlapInput() {
    if (this._flapUnsub) {
      this._flapUnsub();
      this._flapUnsub = null;
    }
    if (!this._inputHub) return;
    const onDown = () => {
      this._pendingFlap = true;
    };
    this._inputHub.addEventListener('pointer:down', onDown);
    this._flapUnsub = () => this._inputHub?.removeEventListener('pointer:down', onDown);
  }

  _createScoreUi() {
    if (!this._uiRoot) return;
    if (this._scoreText) {
      this._scoreText.parent?.removeChild(this._scoreText);
      this._scoreText.destroy();
      this._scoreText = null;
    }
    const t = new Text({
      text: '0',
      style: {
        fontFamily: 'Segoe UI, system-ui, sans-serif',
        fontWeight: '800',
        fontSize: 64,
        fill: 0x22d3ee,
        stroke: { width: 5, color: 0x7c3aed, join: 'round' },
      },
    });
    t.anchor.set(0.5);
    t.position.set(this._layoutW / 2, this._layoutH / 2);
    t.zIndex = 120;
    this._uiRoot.addChild(t);
    this._scoreText = t;
  }

  /**
   * @param {import('../ECS/World.js').World} _world
   * @param {import('../Core/AssetRegistry.js').AssetRegistry} registry
   * @param {import('pixi.js').Container} stage
   */
  bootstrap(_world, registry, stage) {
    this._registry = registry;
    this._stage = stage;
    this._rebuildScene();
    this._resetRound();
  }

  _rebuildScene() {
    const stage = this._stage;
    if (!stage) return;
    if (this._root) {
      this._root.parent?.removeChild(this._root);
      this._root.destroy({ children: true });
      this._root = null;
    }
    const root = new Container();
    root.zIndex = 30;
    root.sortableChildren = true;
    stage.addChild(root);
    this._root = root;

    const pipesRoot = new Container();
    pipesRoot.zIndex = 2;
    root.addChild(pipesRoot);
    this._pipesRoot = pipesRoot;

    const ground = new Graphics();
    ground.rect(0, this._layoutH - this.groundHeight, this._layoutW, this.groundHeight);
    ground.fill({ color: 0x93c5fd });
    ground.stroke({ width: 3, color: 0x7c3aed, alpha: 0.7 });
    ground.zIndex = 8;
    root.addChild(ground);
    this._ground = ground;

    const bird = this._createBirdView();
    bird.zIndex = 10;
    root.addChild(bird);
    this._bird = bird;
  }

  _createBirdView() {
    const reg = this._registry;
    const entry = reg?.get(this.birdAssetId);
    if (entry?.kind === 'texture' && entry.texture) {
      const bird = new Sprite({ texture: entry.texture });
      bird.anchor.set(0.5);
      bird.scale.set(this.birdScale);
      return bird;
    }
    const fallback = new Graphics();
    fallback.roundRect(-28, -20, 56, 40, 16);
    fallback.fill({ color: 0xf59e0b });
    fallback.stroke({ width: 2, color: 0xf97316 });
    return fallback;
  }

  _resetRound() {
    this._birdX = Math.round(this._layoutW * 0.28);
    this._birdY = Math.round(this._layoutH * 0.45);
    this._birdVY = 0;
    this._spawnT = 0;
    this._score = 0;
    this._gameOver = false;
    this._pendingFlap = false;
    this._prevSpace = false;
    this._gameOverText?.parent?.removeChild(this._gameOverText);
    this._gameOverText?.destroy();
    this._gameOverText = null;
    for (const p of this._pipes) {
      p.top.destroy();
      p.bottom.destroy();
    }
    this._pipes = [];
    this._scoreText && (this._scoreText.text = '0');
  }

  _spawnPipePair() {
    const root = this._pipesRoot;
    if (!root) return;
    const minY = 120;
    const maxY = this._layoutH - this.groundHeight - 120;
    const gapY = minY + Math.random() * Math.max(40, maxY - minY);
    const x = this._layoutW + this.pipeWidth;

    const top = new Graphics();
    const topHeight = Math.max(36, gapY - this.pipeGap / 2);
    const capH = 34;
    const topStemH = Math.max(0, topHeight - capH);
    top.rect(8, 0, this.pipeWidth - 16, topStemH);
    top.fill({ color: 0x16a34a });
    top.roundRect(0, topStemH, this.pipeWidth, capH, 10);
    top.fill({ color: 0x22c55e });
    top.position.set(x, 0);

    const bottom = new Graphics();
    const by = gapY + this.pipeGap / 2;
    const bh = this._layoutH - this.groundHeight - by;
    bottom.rect(8, capH, this.pipeWidth - 16, Math.max(0, bh - capH));
    bottom.fill({ color: 0x16a34a });
    bottom.roundRect(0, 0, this.pipeWidth, 40, 10);
    bottom.fill({ color: 0x22c55e });
    bottom.position.set(x, by);

    root.addChild(top);
    root.addChild(bottom);
    this._pipes.push({ x, gapY, passed: false, top, bottom });
  }

  _consumeFlap() {
    const kb = this._inputCoordinator?.keyboard;
    const space = !!kb?.isDown('Space');
    const edgeSpace = space && !this._prevSpace;
    this._prevSpace = space;
    const flap = this._pendingFlap || edgeSpace;
    this._pendingFlap = false;
    return flap;
  }

  _enterGameOver() {
    if (this._gameOver) return;
    this._gameOver = true;
    if (this._uiRoot && !this._gameOverText) {
      const t = new Text({
        text: 'Tap / Click / Space to restart',
        style: {
          fontFamily: 'Segoe UI, system-ui, sans-serif',
          fontSize: 28,
          fontWeight: '700',
          fill: 0xf59e0b,
          stroke: { width: 3, color: 0x7c3aed, join: 'round' },
        },
      });
      t.anchor.set(0.5);
      t.position.set(this._layoutW / 2, this._layoutH * 0.72);
      t.zIndex = 130;
      this._uiRoot.addChild(t);
      this._gameOverText = t;
    }
  }

  update(dt) {
    if (!this.enabled || !this._bird) return;

    if (this._gameOver) {
      if (this._consumeFlap()) this._resetRound();
      return;
    }

    if (this._consumeFlap()) this._birdVY = this.flapVelocity;

    this._birdVY += this.gravity * dt;
    this._birdVY = Math.max(this.maxRiseSpeed, Math.min(this.maxFallSpeed, this._birdVY));
    this._birdY += this._birdVY * dt;
    this._bird.rotation = Math.max(-0.55, Math.min(1.1, this._birdVY / 650));
    this._bird.position.set(this._birdX, this._birdY);

    this._spawnT += dt;
    if (this._spawnT >= this.pipeSpawnSec) {
      this._spawnT = 0;
      this._spawnPipePair();
    }

    const topBound = 4;
    const bottomBound = this._layoutH - this.groundHeight - 4;
    const birdR = this.birdRadius;
    if (this._birdY - birdR <= topBound || this._birdY + birdR >= bottomBound) {
      this._enterGameOver();
      return;
    }

    const remove = [];
    for (let i = 0; i < this._pipes.length; i++) {
      const p = this._pipes[i];
      p.x -= this.pipeSpeed * dt;
      p.top.x = p.x;
      p.bottom.x = p.x;

      const withinX = this._birdX + birdR > p.x && this._birdX - birdR < p.x + this.pipeWidth;
      const gapTop = p.gapY - this.pipeGap / 2;
      const gapBottom = p.gapY + this.pipeGap / 2;
      const outsideGap = this._birdY - birdR < gapTop || this._birdY + birdR > gapBottom;
      if (withinX && outsideGap) {
        this._enterGameOver();
        return;
      }

      if (!p.passed && this._birdX > p.x + this.pipeWidth) {
        p.passed = true;
        this._score += 1;
        if (this._scoreText) this._scoreText.text = String(this._score);
      }
      if (p.x + this.pipeWidth < -20) remove.push(i);
    }
    for (let i = remove.length - 1; i >= 0; i--) {
      const p = this._pipes[remove[i]];
      p.top.destroy();
      p.bottom.destroy();
      this._pipes.splice(remove[i], 1);
    }
  }
}
