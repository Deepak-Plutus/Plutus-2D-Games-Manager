import gsap from 'gsap';
import { Container, Graphics, Sprite, Text } from 'pixi.js';
import { BaseSystem } from '../Systems/BaseSystem.js';
import { SoundSynth, type ToneStep } from '../Core/SoundSynth.js';

const SPIKE_FILL = 0x7c3aed;
const SPIKE_TOOTH = 0x6d28d9;
const SPIKE_STROKE = 0x4c1d95;

type PowerupView = {
  root: Container;
  ring: Graphics;
  label: Text;
  collected: boolean;
  value: number;
  radius: number;
};

/**
 * Flappy Bird-style game system (self-contained game-specific UI/logic).
 */
export class FlappyBirdGame extends BaseSystem {
  static inputRequirements = { keyboard: true, pointer: true, wheel: false, gamepad: false };
  [key: string]: any;

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
    this.powerupSpawnChance = 0.3;
    this.powerupRadius = 18;

    this._layoutW = 800;
    this._layoutH = 600;
    this._registry = null;
    this._stage = null;
    this._uiRoot = null;
    this._inputCoordinator = null;
    this._inputHub = null;
    this._flapUnsub = null;

    this._root = null;
    this._spikesRoot = null;
    this._spikeTop = null;
    this._spikeBottom = null;
    this._pipesRoot = null;
    this._bird = null;
    this._scoreText = null;
    this._scorePanel = null;
    this._ground = null;
    this._gameOverText = null;
    this._startText = null;
    this._spikeToothW = 16;
    this._spikeScroll = 0;

    this._birdX = 220;
    this._birdY = 280;
    this._birdVY = 0;
    this._spawnT = 0;
    this._score = 0;
    this._started = false;
    this._gameOver = false;
    this._pendingFlap = false;
    this._prevSpace = false;
    this._soundSynth = SoundSynth.getInstance();
    /** @type {Array<{ top: Graphics, bottom: Graphics }>} */
    this._pipePool = [];
    /** @type {Array<{ x:number, gapY:number, passed:boolean, top:Graphics, bottom:Graphics, powerup?: { value:number, radius:number, root:Container, collected:boolean } }>} */
    this._pipes = [];
  }

  /**
   * @param {Record<string, unknown>} options
   */
  configure(options: Record<string, unknown> = {}): void {
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
    if (options.powerupSpawnChance != null) {
      const chance = Number(options.powerupSpawnChance);
      if (Number.isFinite(chance)) this.powerupSpawnChance = Math.max(0, Math.min(1, chance));
    }
    if (options.powerupRadius != null) this.powerupRadius = Math.max(10, Number(options.powerupRadius) || this.powerupRadius);
  }

  setRuntime(w: number, h: number, inputCoordinator: unknown, inputHub: EventTarget | null): void {
    this._layoutW = Number(w) || 800;
    this._layoutH = Number(h) || 600;
    this._inputCoordinator = inputCoordinator;
    this._inputHub = inputHub;
    this._applyResponsiveMetrics();
    this._bindFlapInput();
    this._rebuildScene();
    this._createScoreUi();
    this._refreshStartPrompt();
  }

  setScreenUi(uiRoot: Container | null, viewW: number, viewH: number): void {
    this._uiRoot = uiRoot;
    this._layoutW = Number(viewW) || this._layoutW;
    this._layoutH = Number(viewH) || this._layoutH;
    if (!uiRoot) return;
    uiRoot.sortableChildren = true;
    this._createScoreUi();
  }

  _bindFlapInput(): void {
    if (this._flapUnsub) {
      this._flapUnsub();
      this._flapUnsub = null;
    }
    if (!this._inputHub) return;
    const onDown = () => {
      this._pendingFlap = true;
      this._soundSynth.unlock();
      this._soundSynth.playSequence(
        [{ frequency: 640, delaySec: 0, durationSec: 0.045, oscillator: 'square', volume: 0.18 }],
        { masterVolume: 0.06 },
      );
    };
    this._inputHub.addEventListener('pointer:down', onDown);
    this._flapUnsub = () => this._inputHub?.removeEventListener('pointer:down', onDown);
  }

  _createScoreUi(): void {
    if (!this._uiRoot) return;
    if (this._scorePanel) {
      this._scorePanel.parent?.removeChild(this._scorePanel);
      this._scorePanel.destroy();
      this._scorePanel = null;
    }
    if (this._scoreText) {
      this._scoreText.parent?.removeChild(this._scoreText);
      this._scoreText.destroy();
      this._scoreText = null;
    }
    const panelW = Math.min(180, Math.max(112, Math.floor(this._layoutW * 0.26)));
    const panelH = Math.min(56, Math.max(40, Math.floor(this._layoutH * 0.08)));
    const topPad = Math.max(10, Math.floor(this._layoutH * 0.025));
    const panel = new Graphics();
    panel.roundRect(0, 0, panelW, panelH, 12);
    panel.fill({ color: 0xeef2ff, alpha: 0.95 });
    panel.stroke({ width: 2, color: 0x6366f1, alpha: 0.85 });
    panel.position.set(Math.round((this._layoutW - panelW) / 2), topPad);
    panel.zIndex = 119;
    this._uiRoot.addChild(panel);
    this._scorePanel = panel;

    const t = new Text({
      text: '0',
      style: {
        fontFamily: 'Segoe UI, system-ui, sans-serif',
        fontWeight: '800',
        fontSize: Math.max(22, Math.min(36, Math.floor(this._layoutH * 0.05))),
        fill: 0x4f46e5,
        stroke: { width: 3, color: 0xffffff, join: 'round' },
      },
    });
    t.anchor.set(0.5);
    t.position.set(Math.round(this._layoutW / 2), Math.round(topPad + panelH / 2));
    t.zIndex = 120;
    this._uiRoot.addChild(t);
    this._scoreText = t;
  }

  /**
   * @param {import('../ECS/World.js').World} _world
   * @param {import('../Core/AssetRegistry.js').AssetRegistry} registry
   * @param {import('pixi.js').Container} stage
   */
  bootstrap(_world: unknown, registry: unknown, stage: Container): void {
    this._registry = registry;
    this._stage = stage;
    this._applyResponsiveMetrics();
    this._rebuildScene();
    this._resetRound();
  }

  _applyResponsiveMetrics(): void {
    this.groundHeight = Math.max(72, Math.floor(this._layoutH * 0.13));
    const mobile = this._layoutW <= 768;
    const leftRatio = mobile ? 0.22 : 0.26;
    this._birdX = Math.round(this._layoutW * leftRatio);
    this._birdRadius = Math.max(12, Math.floor(this._layoutW * 0.018));
    this.pipeWidth = mobile
      ? Math.max(72, Math.min(112, Math.floor(this._layoutW * 0.14)))
      : Math.max(84, Math.min(104, Math.floor(this._layoutW * 0.075)));
    const maxGap = Math.max(148, Math.floor((this._layoutH - this.groundHeight) * 0.42));
    this.pipeGap = Math.max(140, Math.min(220, maxGap));
  }

  _rebuildScene(): void {
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

    const spikesRoot = new Container();
    spikesRoot.zIndex = 1;
    root.addChild(spikesRoot);
    this._spikesRoot = spikesRoot;
    this._drawSpikeBands();

    const pipesRoot = new Container();
    pipesRoot.zIndex = 2;
    pipesRoot.sortableChildren = true;
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

  _drawSpikeBands(): void {
    const root = this._spikesRoot;
    if (!root) return;
    if (!this._spikeTop) this._spikeTop = new Graphics();
    if (!this._spikeBottom) this._spikeBottom = new Graphics();
    const topBand = this._spikeTop;
    const bottomBand = this._spikeBottom;
    if (topBand.parent !== root) root.addChild(topBand);
    if (bottomBand.parent !== root) root.addChild(bottomBand);
    topBand.clear();
    bottomBand.clear();

    const spikeH = Math.max(16, Math.floor(this._layoutH * 0.04));
    const toothW = Math.max(14, Math.floor(this._layoutW / 36));
    this._spikeToothW = toothW;
    const drawX = -toothW;
    const drawW = this._layoutW + toothW * 2;
    const teeth = Math.ceil(drawW / toothW) + 1;

    for (let i = 0; i < teeth; i++) {
      const x = drawX + i * toothW;
      topBand.poly([x, 0, x + toothW / 2, spikeH - 2, x + toothW, 0]);
      topBand.fill({ color: SPIKE_TOOTH, alpha: 0.95 });
      topBand.stroke({ width: 1, color: SPIKE_STROKE, alpha: 0.7 });
    }
    topBand.stroke({ width: 2, color: SPIKE_STROKE, alpha: 0.9 });

    const by = this._layoutH - this.groundHeight;
    for (let i = 0; i < teeth; i++) {
      const x = drawX + i * toothW;
      bottomBand.poly([x, by, x + toothW / 2, by - spikeH + 2, x + toothW, by]);
      bottomBand.fill({ color: SPIKE_TOOTH, alpha: 0.95 });
      bottomBand.stroke({ width: 1, color: SPIKE_STROKE, alpha: 0.7 });
    }
    bottomBand.stroke({ width: 2, color: SPIKE_STROKE, alpha: 0.9 });

  }

  _acquirePipePairViews(): { top: Graphics; bottom: Graphics } {
    const pair = this._pipePool.pop();
    if (pair) return pair;
    return { top: new Graphics(), bottom: new Graphics() };
  }

  /**
   * @param {{ top: Graphics, bottom: Graphics }} pair
   */
  _releasePipePairViews(pair: { top: Graphics; bottom: Graphics }): void {
    pair.top.visible = false;
    pair.bottom.visible = false;
    pair.top.parent?.removeChild(pair.top);
    pair.bottom.parent?.removeChild(pair.bottom);
    pair.top.clear();
    pair.bottom.clear();
    this._pipePool.push(pair);
  }

  _acquirePowerupView(): PowerupView {
    const root = new Container();
    root.sortableChildren = true;
    const ring = new Graphics();
    ring.zIndex = 1;
    const label = new Text({
      text: '',
      style: {
        fontFamily: 'Segoe UI, system-ui, sans-serif',
        fontSize: 14,
        fontWeight: '800',
        fill: 0xffffff,
        stroke: { width: 2, color: 0x111827, join: 'round' },
      },
    });
    label.anchor.set(0.5);
    label.zIndex = 2;
    root.addChild(ring);
    root.addChild(label);
    root.zIndex = 6;
    return { root, ring, label, collected: false, value: 0, radius: this.powerupRadius };
  }

  _releasePowerupView(pu: { root: Container } | undefined): void {
    if (!pu) return;
    gsap.killTweensOf(pu.root);
    gsap.killTweensOf(pu.root.scale);
    pu.root.visible = false;
    pu.root.parent?.removeChild(pu.root);
    pu.root.destroy({ children: true });
  }

  _playPowerupSfx(positive: boolean): void {
    const steps: ToneStep[] = positive
      ? [
          { frequency: 660, delaySec: 0, durationSec: 0.12, oscillator: 'sine' },
          { frequency: 990, delaySec: 0.08, durationSec: 0.18, oscillator: 'triangle' },
        ]
      : [
          { frequency: 330, delaySec: 0, durationSec: 0.16, oscillator: 'sawtooth' },
          { frequency: 220, delaySec: 0.12, durationSec: 0.22, oscillator: 'triangle' },
        ];
    this._soundSynth.playSequence(steps, { masterVolume: 0.08 });
  }

  _createBirdView(): Container {
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

  _resetRound(): void {
    this._applyResponsiveMetrics();
    this._birdY = Math.round(this._layoutH * 0.45);
    this._birdVY = 0;
    this._spawnT = 0;
    this._score = 0;
    this._started = false;
    this._gameOver = false;
    this._pendingFlap = false;
    this._prevSpace = false;
    this._gameOverText?.parent?.removeChild(this._gameOverText);
    this._gameOverText?.destroy();
    this._gameOverText = null;
    for (const p of this._pipes) {
      this._releasePipePairViews({ top: p.top, bottom: p.bottom });
      if (p.powerup) this._releasePowerupView(p.powerup);
    }
    this._pipes = [];
    this._scoreText && (this._scoreText.text = '0');
    this._spikeScroll = 0;
    if (this._spikesRoot) this._spikesRoot.x = 0;
    this._refreshStartPrompt();
  }

  _spawnPipePair(): void {
    const root = this._pipesRoot;
    if (!root) return;
    const minY = 120;
    const maxY = this._layoutH - this.groundHeight - 120;
    const gapY = minY + Math.random() * Math.max(40, maxY - minY);
    const x = this._layoutW + this.pipeWidth;

    const pair = this._acquirePipePairViews();
    const top = pair.top;
    top.visible = true;
    top.clear();
    const topHeight = Math.max(36, gapY - this.pipeGap / 2);
    const capH = 34;
    const topStemH = Math.max(0, topHeight - capH);
    top.rect(8, 0, this.pipeWidth - 16, topStemH);
    top.fill({ color: 0x16a34a });
    top.roundRect(0, topStemH, this.pipeWidth, capH, 10);
    top.fill({ color: 0x22c55e });
    top.position.set(x, 0);

    const bottom = pair.bottom;
    bottom.visible = true;
    bottom.clear();
    const by = gapY + this.pipeGap / 2;
    const bh = this._layoutH - this.groundHeight - by;
    bottom.rect(8, capH, this.pipeWidth - 16, Math.max(0, bh - capH));
    bottom.fill({ color: 0x16a34a });
    bottom.roundRect(0, 0, this.pipeWidth, 40, 10);
    bottom.fill({ color: 0x22c55e });
    bottom.position.set(x, by);

    /** @type {{ value:number, radius:number, root:Container, collected:boolean } | undefined} */
    let powerup;
    if (Math.random() < this.powerupSpawnChance && !this._wouldPowerupOverlap(x + this.pipeWidth / 2, gapY)) {
      powerup = this._createPowerup();
      powerup.root.position.set(x + this.pipeWidth / 2, gapY);
      powerup.root.zIndex = 6;
      root.addChild(powerup.root);
    }

    root.addChild(top);
    root.addChild(bottom);
    this._pipes.push({ x, gapY, passed: false, top, bottom, powerup });
  }

  /**
   * @param {number} x
   * @param {number} y
   */
  _wouldPowerupOverlap(x: number, y: number): boolean {
    const minDist = this.powerupRadius * 2.2;
    for (const p of this._pipes) {
      const pu = p.powerup;
      if (!pu || pu.collected) continue;
      const px = p.x + this.pipeWidth / 2;
      const py = p.gapY;
      if (Math.hypot(px - x, py - y) < minDist) return true;
    }
    return false;
  }

  _randomPowerupValue(): number {
    const magnitude = 1 + Math.floor(Math.random() * 20);
    const sign = Math.random() < 0.7 ? 1 : -1;
    return sign * magnitude;
  }

  _createPowerup(): PowerupView {
    const value = this._randomPowerupValue();
    const positive = value > 0;
    const pu = this._acquirePowerupView();
    pu.value = value;
    pu.radius = this.powerupRadius;
    pu.ring.clear();
    pu.ring.circle(0, 0, pu.radius);
    pu.ring.fill({ color: positive ? 0x22c55e : 0xef4444, alpha: 0.96 });
    pu.ring.stroke({ width: 3, color: positive ? 0x166534 : 0x991b1b, alpha: 0.9 });
    pu.label.text = `${value > 0 ? '+' : ''}${value}`;
    pu.label.style.fontSize = Math.max(12, Math.floor(pu.radius * 0.9));
    return pu;
  }

  _consumeFlap(): boolean {
    const kb = this._inputCoordinator?.keyboard;
    const space = !!kb?.isDown('Space');
    const edgeSpace = space && !this._prevSpace;
    this._prevSpace = space;
    const flap = this._pendingFlap || edgeSpace;
    this._pendingFlap = false;
    return flap;
  }

  _refreshStartPrompt(): void {
    if (!this._uiRoot) return;
    if (this._startText) {
      this._startText.parent?.removeChild(this._startText);
      this._startText.destroy();
      this._startText = null;
    }
    if (this._started || this._gameOver) return;
    const t = new Text({
      text: 'Tap / click to play',
      style: {
        fontFamily: 'Segoe UI, system-ui, sans-serif',
        fontSize: Math.max(22, Math.min(34, Math.floor(this._layoutH * 0.05))),
        fontWeight: '800',
        fill: 0x1d4ed8,
        stroke: { width: 3, color: 0xffffff, join: 'round' },
      },
    });
    t.anchor.set(0.5);
    t.position.set(Math.round(this._layoutW / 2), Math.round(this._layoutH * 0.63));
    t.zIndex = 125;
    this._uiRoot.addChild(t);
    this._startText = t;
  }

  _enterGameOver(): void {
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
    if (this._startText) {
      this._startText.parent?.removeChild(this._startText);
      this._startText.destroy();
      this._startText = null;
    }
  }

  update(dt: number): void {
    if (!this.enabled || !this._bird) return;

    if (this._gameOver) {
      if (this._consumeFlap()) this._resetRound();
      return;
    }

    if (!this._started) {
      this._bird.position.set(this._birdX, this._birdY);
      this._bird.rotation = 0;
      if (this._consumeFlap()) {
        this._started = true;
        this._birdVY = this.flapVelocity;
        if (this._startText) {
          this._startText.parent?.removeChild(this._startText);
          this._startText.destroy();
          this._startText = null;
        }
      }
      return;
    }

    if (this._spikesRoot) {
      this._spikeScroll += this.pipeSpeed * dt;
      const wrap = Math.max(1, this._spikeToothW);
      this._spikesRoot.x = -Math.round(this._spikeScroll % wrap);
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
      if (p.powerup && !p.powerup.collected) {
        const px = p.x + this.pipeWidth / 2;
        const py = p.gapY;
        p.powerup.root.zIndex = 6;
        p.powerup.root.visible = true;
        p.powerup.root.alpha = 1;
        p.powerup.root.position.set(px, py);
        if (Math.hypot(this._birdX - px, this._birdY - py) <= birdR + p.powerup.radius) {
          p.powerup.collected = true;
          this._score += p.powerup.value;
          if (this._scoreText) this._scoreText.text = String(this._score);
          const positive = p.powerup.value > 0;
          this._playPowerupSfx(positive);
          p.powerup.root.zIndex = 12;
          gsap.killTweensOf(p.powerup.root);
          gsap.killTweensOf(p.powerup.root.scale);
          gsap.to(p.powerup.root.scale, {
            x: 1.35,
            y: 1.35,
            duration: 0.45,
            ease: 'power1.out',
          });
          gsap.to(p.powerup.root, {
            y: py - Math.max(30, this.powerupRadius * 2.2),
            alpha: 0,
            duration: 0.45,
            ease: 'power1.out',
            onComplete: () => this._releasePowerupView(p.powerup),
          });
        }
      }

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
      const idx = remove[i];
      if (idx == null) continue;
      const p = this._pipes[idx];
      this._releasePipePairViews({ top: p.top, bottom: p.bottom });
      if (p.powerup && !p.powerup.collected) this._releasePowerupView(p.powerup);
      this._pipes.splice(idx, 1);
    }
  }
}
