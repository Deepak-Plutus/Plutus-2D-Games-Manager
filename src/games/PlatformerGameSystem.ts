import { Container, Graphics, Text } from 'pixi.js';
import gsap from 'gsap';
import { BaseSystem } from '../Systems/BaseSystem.js';
import { aabbOverlap, buildColliderList } from '../Core/CollisionService.js';
import {
  COMPONENT_BEHAVIORS,
  COMPONENT_CAMERA,
  COMPONENT_DISPLAY,
  COMPONENT_INSTANCE_VARIABLES,
  COMPONENT_META,
  COMPONENT_TRANSFORM,
} from '../Components/index.js';

/**
 * Platformer rules: enemies, coin blocks, optional win (coin quota and/or `goal` tag zone), HUD, game over / win overlays on screen UI.
 */
export class PlatformerGameSystem extends BaseSystem {
  [key: string]: any;
  constructor() {
    super();
    this.playerMetaName = 'player';
    this.hurtCooldown = 1.1;
    this.showHud = true;
    this.gameOverMessage = 'GAME OVER';
    /** Win when player coins >= this (0 = disabled). */
    this.winCoinTarget = 0;
    this.winMessage = 'YOU WIN!';
    /** @type {import('pixi.js').Container | null} */
    this._uiRoot = null;
    this._viewW = 800;
    this._viewH = 600;
    /** @type {((frozen: boolean) => void) | null} */
    this._freeze = null;
    /** @type {Text | null} */
    this._hud = null;
    /** @type {import('pixi.js').Container | null} */
    this._hudRoot = null;
    /** @type {Text | null} */
    this._livesText = null;
    /** @type {Text | null} */
    this._coinsText = null;
    /** @type {import('pixi.js').Container | null} */
    this._controlsRoot = null;
    /** @type {Map<string, boolean>} */
    this._touchHeld = new Map();
    /** @type {import('pixi.js').Container | null} */
    this._overlayBg = null;
    /** @type {Text | null} */
    this._overlayText = null;
    this._hurtT = 0;
    this._blinkT = 0;
    this._gameOver = false;
    this._gameWon = false;
    this._endSequence = 'none';
    this._winDoorX = null;
    this._winDelay = 0;
    this._finalScore = 0;
    this._prevPlayerY = null;
  }

  /**
   * @param {Record<string, unknown>} options
   */
  configure(options: Record<string, unknown> = {}): void {
    if (options.playerMetaName != null) this.playerMetaName = String(options.playerMetaName);
    if (options.hurtCooldown != null) this.hurtCooldown = Number(options.hurtCooldown) || 1.1;
    if (options.showHud != null) this.showHud = !!options.showHud;
    if (options.gameOverMessage != null) this.gameOverMessage = String(options.gameOverMessage);
    if (options.winCoinTarget != null) this.winCoinTarget = Math.max(0, Number(options.winCoinTarget) || 0);
    if (options.winMessage != null) this.winMessage = String(options.winMessage);
  }

  /**
   * @param {import('pixi.js').Container | null} uiRoot screen-fixed layer (sibling of world, not scrolled)
   * @param {number} viewWidth logical view width (e.g. app / canvas size)
   * @param {number} viewHeight logical view height
   */
  setScreenUi(uiRoot: Container | null, viewWidth: number, viewHeight: number): void {
    this._ensureBungeeFontLoaded();
    this._uiRoot = uiRoot;
    this._viewW = Number(viewWidth) || 800;
    this._viewH = Number(viewHeight) || 600;
    this._hud = null;
    this._hudRoot = null;
    this._livesText = null;
    this._coinsText = null;
    this._controlsRoot = null;
    this._overlayBg = null;
    this._overlayText = null;
    this._gameOver = false;
    this._gameWon = false;
    this._endSequence = 'none';
    this._winDoorX = null;
    this._winDelay = 0;
    this._finalScore = 0;
  }

  _ensureBungeeFontLoaded(): void {
    if (typeof document === 'undefined') return;
    if (document.querySelector('link[data-font="bungee-platformer"]')) return;

    const preconnectApi = document.createElement('link');
    preconnectApi.rel = 'preconnect';
    preconnectApi.href = 'https://fonts.googleapis.com';
    preconnectApi.setAttribute('data-font', 'bungee-platformer');
    document.head.appendChild(preconnectApi);

    const preconnectGstatic = document.createElement('link');
    preconnectGstatic.rel = 'preconnect';
    preconnectGstatic.href = 'https://fonts.gstatic.com';
    preconnectGstatic.crossOrigin = 'anonymous';
    preconnectGstatic.setAttribute('data-font', 'bungee-platformer');
    document.head.appendChild(preconnectGstatic);

    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = 'https://fonts.googleapis.com/css2?family=Bungee&display=swap';
    css.setAttribute('data-font', 'bungee-platformer');
    document.head.appendChild(css);
  }

  /**
   * @param {(frozen: boolean) => void} fn
   */
  setFreezeCallback(fn: ((frozen: boolean) => void) | null): void {
    this._freeze = typeof fn === 'function' ? fn : null;
  }

  /**
   * @param {import('../ECS/World.js').World} world
   * @param {string} tag
   */
  _entityHasTag(world: any, entityId: number, tag: string): boolean {
    const m = world.getComponent(entityId, COMPONENT_META);
    const tags = m?.tags;
    return Array.isArray(tags) && tags.includes(String(tag));
  }

  update(dt: number, world: any): void {
    if (!this.enabled || !world) return;
    this._stabilizeEnemyVisuals(world);
    if (this._gameOver || this._gameWon) return;

    const colliders = buildColliderList(world);
    const playerId = world.findEntityIdByMetaName(this.playerMetaName);
    if (playerId == null) return;

    const pBox = colliders.find((c) => c.entityId === playerId);
    if (!pBox) return;

    const pIv = world.getComponent(playerId, COMPONENT_INSTANCE_VARIABLES);
    const pDisp = world.getComponent(playerId, COMPONENT_DISPLAY);
    const pView = pDisp?.view;
    if (pView) {
      const baseW = Number(pIv?.get('basePlayerW'));
      const baseH = Number(pIv?.get('basePlayerH'));
      if (Number.isFinite(baseW) && baseW > 0 && Number.isFinite(baseH) && baseH > 0) {
        if (Math.abs((pView.width ?? baseW) - baseW) > 0.01) pView.width = baseW;
        if (Math.abs((pView.height ?? baseH) - baseH) > 0.01) pView.height = baseH;
      } else if ((pView.width ?? 0) > 0 && (pView.height ?? 0) > 0) {
        pIv?.set('basePlayerW', pView.width);
        pIv?.set('basePlayerH', pView.height);
      }
    }
    const pTr = world.getComponent(playerId, COMPONENT_TRANSFORM);
    const pBehaviors = world.getComponent(playerId, COMPONENT_BEHAVIORS);
    const pPlatform = Array.isArray(pBehaviors)
      ? pBehaviors.find((b) => b?.constructor?.type === 'platform')
      : null;
    const pBoundToLayout = Array.isArray(pBehaviors)
      ? pBehaviors.find((b) => b?.constructor?.type === 'boundToLayout')
      : null;
    if (pBoundToLayout && typeof pBoundToLayout.setEnabled === 'function') {
      pBoundToLayout.setEnabled(false);
    }
    if (pPlatform && Object.prototype.hasOwnProperty.call(pPlatform, 'useLayoutFloor')) {
      pPlatform.useLayoutFloor = false;
    }
    const pVelY = typeof pPlatform?.vectorY === 'number' ? pPlatform.vectorY : 0;
    this._syncCameraForViewport(world);

    if (this.showHud && this._uiRoot && !this._hudRoot) {
      this._buildHudPanels();
      this._buildMobileControls();
    }

    if (this._hud && pIv) {
      const lives = Number(pIv.get('lives') ?? 0);
      const coins = Number(pIv.get('coins') ?? 0);
      if (this.winCoinTarget > 0) {
        this._hud.text = `Lives: ${lives}     Coins: ${coins} / ${this.winCoinTarget}`;
      } else {
        this._hud.text = `Lives: ${lives}     Coins: ${coins}`;
      }
    }
    if (this._livesText && this._coinsText && pIv) {
      const lives = Number(pIv.get('lives') ?? 0);
      const coins = Number(pIv.get('coins') ?? 0);
      this._finalScore = coins;
      this._livesText.text = `LIVES ${lives}`;
      this._coinsText.text = this.winCoinTarget > 0 ? `COINS ${coins}/${this.winCoinTarget}` : `COINS ${coins}`;
    }

    if (this._endSequence !== 'none') {
      if (pPlatform && Object.prototype.hasOwnProperty.call(pPlatform, 'defaultControls')) {
        pPlatform.defaultControls = false;
      }
      if (this._endSequence === 'fall') {
        if (typeof pPlatform?.setVectorX === 'function') pPlatform.setVectorX(0);
        if (pPlatform?.isOnFloor) {
          this._endSequence = 'walk';
        }
      } else if (this._endSequence === 'walk') {
        if (pTr) {
          pTr.x += 120 * dt;
          if (this._winDoorX != null && pTr.x >= this._winDoorX) {
            this._endSequence = 'delay';
            this._winDelay = 1;
          }
        }
      } else if (this._endSequence === 'delay') {
        this._winDelay -= dt;
        if (this._winDelay <= 0) this._enterWin();
      }
      this._prevPlayerY = pTr?.y ?? null;
      return;
    }

    for (const c of colliders) {
      if (c.entityId === playerId) continue;
      if (!this._entityHasTag(world, c.entityId, 'goal')) continue;
      if (aabbOverlap(pBox, c)) {
        const doorId = world.findEntityIdByMetaName('castleDoor');
        const doorTr = doorId != null ? world.getComponent(doorId, COMPONENT_TRANSFORM) : null;
        this._winDoorX = (doorTr?.x ?? (pTr?.x ?? 0) + 50) - 8;
        this._endSequence = 'fall';
        break;
      }
    }

    for (const c of colliders) {
      if (c.entityId === playerId) continue;
      if (!this._entityHasTag(world, c.entityId, 'death')) continue;
      if (aabbOverlap(pBox, c)) {
        pIv?.set('lives', 0);
        this._enterGameOver();
        return;
      }
    }

    this._hurtT = Math.max(0, this._hurtT - dt);
    this._blinkT = Math.max(0, this._blinkT - dt);
    if (pView) {
      if (this._blinkT > 0) {
        pView.tint = Math.floor(this._blinkT * 20) % 2 ? 0xff5555 : 0xffffff;
      } else {
        pView.tint = 0xffffff;
      }
    }

    for (const c of colliders) {
      if (c.entityId === playerId) continue;
      if (!this._entityHasTag(world, c.entityId, 'enemy')) continue;
      this._normalizeEnemySize(world, c.entityId);
      if (!aabbOverlap(pBox, c)) continue;
      if (this._hurtT > 0) break;

      const halfH = (pBox.bottom - pBox.top) / 2;
      const prevY = this._prevPlayerY ?? pTr?.y ?? pBox.bottom - halfH;
      const prevBottom = prevY + halfH;
      const stomping = pVelY > 40 && prevBottom <= c.top + 10 && pBox.bottom >= c.top;
      if (stomping) {
        const enemyTr = world.getComponent(c.entityId, COMPONENT_TRANSFORM);
        const enemyView = world.getComponent(c.entityId, COMPONENT_DISPLAY)?.view;
        const popupParent = enemyView?.parent ?? pView?.parent ?? null;
        if (popupParent && enemyTr) {
          const plus = new Text({
            text: '+10',
            style: {
              fill: 0xfef08a,
              fontSize: 18,
              fontFamily: '"Bungee", "Press Start 2P", "Segoe UI", system-ui, monospace',
              fontWeight: '700',
              stroke: { width: 2, color: 0x1f2937, join: 'round' },
            },
          });
          plus.anchor.set(0.5);
          plus.position.set(Math.round(enemyTr.x), Math.round(enemyTr.y - 22));
          popupParent.addChild(plus);
          gsap.to(plus, {
            y: plus.y - 28,
            alpha: 0,
            duration: 0.45,
            ease: 'power1.out',
            onComplete: () => plus.destroy(),
          });
        }
        const curScore = Number(pIv?.get('coins') ?? 0);
        pIv?.set('coins', curScore + 10);
        world.destroyEntity(c.entityId);
        if (typeof pPlatform?.setVectorY === 'function') {
          pPlatform.setVectorY(-420);
        }
        continue;
      }

      const lives = Number(pIv?.get('lives') ?? 0);
      if (lives <= 0) break;

      pIv?.set('lives', lives - 1);
      this._hurtT = this.hurtCooldown;
      this._blinkT = 0.5;

      if (Number(pIv?.get('lives') ?? 0) <= 0) {
        this._enterGameOver();
      }
      break;
    }

    if (this._gameOver) return;

    for (const c of colliders) {
      if (c.entityId === playerId) continue;
      if (!this._entityHasTag(world, c.entityId, 'coinBlock')) continue;
      const iv = world.getComponent(c.entityId, COMPONENT_INSTANCE_VARIABLES);
      if (!iv || Number(iv.get('hasCoin') ?? 0) !== 1) continue;
      if (!aabbOverlap(pBox, c)) continue;

      iv.set('hasCoin', 0);
      const cur = Number(pIv?.get('coins') ?? 0);
      pIv?.set('coins', cur + 10);

      const coinTr = world.getComponent(c.entityId, COMPONENT_TRANSFORM);
      const dv = world.getComponent(c.entityId, COMPONENT_DISPLAY)?.view;
      if (dv) {
        const popupParent = dv.parent ?? pView?.parent ?? null;
        if (popupParent && coinTr) {
          const plus = new Text({
            text: '+10',
            style: {
              fill: 0xfef08a,
              fontSize: 17,
              fontFamily: '"Bungee", "Press Start 2P", "Segoe UI", system-ui, monospace',
              fontWeight: '700',
              stroke: { width: 2, color: 0x1f2937, join: 'round' },
            },
          });
          plus.anchor.set(0.5);
          plus.position.set(Math.round(coinTr.x), Math.round(coinTr.y - 16));
          popupParent.addChild(plus);
          gsap.to(plus, {
            y: plus.y - 26,
            alpha: 0,
            duration: 0.42,
            ease: 'power1.out',
            onComplete: () => plus.destroy(),
          });
        }
        const startY = coinTr?.y ?? 0;
        gsap.to(dv, { alpha: 0, duration: 0.24, ease: 'sine.out', overwrite: true });
        if (coinTr) {
          gsap.to(coinTr, {
            y: startY - 28,
            duration: 0.24,
            ease: 'sine.out',
            overwrite: true,
            onComplete: () => world.destroyEntity(c.entityId),
          });
        } else {
          gsap.delayedCall(0.25, () => world.destroyEntity(c.entityId));
        }
      }

      if (this.winCoinTarget > 0 && Number(pIv?.get('coins') ?? 0) >= this.winCoinTarget) {
        this._winDoorX = (pTr?.x ?? 0) + 50;
        this._endSequence = 'fall';
      }
      break;
    }

    this._prevPlayerY = pTr?.y ?? null;
  }

  _normalizeEnemySize(world: any, entityId: number): void {
    const tr = world.getComponent(entityId, COMPONENT_TRANSFORM);
    if (tr) {
      // Hard lock gameplay enemy scale to prevent any runtime inflation.
      tr.scaleX = tr.scaleX >= 0 ? 1 : -1;
      tr.scaleY = 1;
    }
    const view = world.getComponent(entityId, COMPONENT_DISPLAY)?.view;
    if (view) {
      // Keep enemy render size deterministic regardless of behavior/tween side effects.
      if (view.width !== 40) view.width = 40;
      if (view.height !== 40) view.height = 40;
    }
  }

  _stabilizeEnemyVisuals(world: any): void {
    const enemyIds = typeof world.findEntityIdsByTag === 'function' ? world.findEntityIdsByTag('enemy') : [];
    for (const enemyId of enemyIds) this._normalizeEnemySize(world, enemyId);
  }

  _enterGameOver(): void {
    if (this._gameOver || this._gameWon) return;
    this._gameOver = true;
    this._freeze?.(true);
    this._showEndPanel('GAME OVER', this.gameOverMessage, 0xffe0e0);
  }

  _enterWin(): void {
    if (this._gameOver || this._gameWon) return;
    this._gameWon = true;
    this._freeze?.(true);
    this._showEndPanel('YOU WIN', this.winMessage, 0xd8ffd8);
  }

  /**
   * @param {string} message
   * @param {number} textFill
   */
  _showEndPanel(title: string, message: string, textFill: number): void {
    if (!this._uiRoot) return;
    if (this._overlayBg) {
      this._overlayBg.parent?.removeChild(this._overlayBg);
      this._overlayBg.destroy({ children: true });
      this._overlayBg = null;
    }
    if (this._overlayText) {
      this._overlayText.parent?.removeChild(this._overlayText);
      this._overlayText.destroy();
      this._overlayText = null;
    }
    const w = this._viewW;
    const h = this._viewH;
    const layer = new Container();
    layer.sortableChildren = true;
    layer.zIndex = 100;
    const dim = new Graphics();
    dim.rect(0, 0, w, h);
    dim.fill({ color: 0x000000, alpha: 0.72 });
    dim.zIndex = 100;
    layer.addChild(dim);

    const cardW = Math.min(420, Math.max(280, Math.floor(w * 0.84)));
    const cardH = Math.min(280, Math.max(220, Math.floor(h * 0.42)));
    const cardX = Math.round((w - cardW) / 2);
    const cardY = Math.round((h - cardH) / 2);
    const card = new Graphics();
    card.roundRect(cardX, cardY, cardW, cardH, 18);
    card.fill({ color: 0x111827, alpha: 0.93 });
    card.stroke({ width: 2, color: 0x60a5fa, alpha: 0.95 });
    card.zIndex = 101;
    layer.addChild(card);

    const heading = new Text({
      text: title,
      style: {
        fill: textFill,
        fontSize: Math.max(16, Math.min(28, Math.floor(cardH * 0.13))),
        fontFamily: '"Bungee", "Press Start 2P", "Segoe UI", system-ui, monospace',
        align: 'center',
      },
    });
    heading.anchor.set(0.5);
    const contentPadX = Math.max(16, Math.floor(cardW * 0.06));
    const contentPadY = Math.max(14, Math.floor(cardH * 0.08));
    const innerTop = cardY + contentPadY;
    const innerBottom = cardY + cardH - contentPadY;
    const gap = Math.max(10, Math.floor(cardH * 0.045));
    heading.position.set(cardX + cardW / 2, innerTop + heading.height * 0.5);
    heading.zIndex = 102;
    layer.addChild(heading);

    const scoreText = new Text({
      text: `Final Score: ${this._finalScore}`,
      style: {
        fill: 0xfef3c7,
        fontSize: Math.max(12, Math.min(20, Math.floor(cardH * 0.085))),
        fontFamily: '"Bungee", "Press Start 2P", "Segoe UI", system-ui, monospace',
        align: 'center',
      },
    });
    scoreText.anchor.set(0.5);
    scoreText.position.set(
      cardX + cardW / 2,
      heading.position.y + heading.height * 0.5 + gap + scoreText.height * 0.5,
    );
    scoreText.zIndex = 102;
    layer.addChild(scoreText);

    const msg = new Text({
      text: message,
      style: {
        fill: 0xe2e8f0,
        fontSize: Math.max(11, Math.min(16, Math.floor(cardH * 0.062))),
        fontFamily: '"Bungee", system-ui, Segoe UI, sans-serif',
        align: 'center',
        wordWrap: true,
        wordWrapWidth: cardW - contentPadX * 2,
        lineHeight: Math.max(14, Math.floor(cardH * 0.085)),
      },
    });
    msg.anchor.set(0.5, 0);
    msg.zIndex = 102;
    layer.addChild(msg);

    const btnW = Math.min(200, Math.max(150, Math.floor(cardW * 0.56)));
    const btnH = Math.max(42, Math.floor(cardH * 0.18));
    const btnX = cardX + (cardW - btnW) / 2;
    const btnY = innerBottom - btnH;
    const btn = new Graphics();
    btn.roundRect(btnX, btnY, btnW, btnH, 14);
    btn.fill({ color: 0x2563eb, alpha: 0.95 });
    btn.stroke({ width: 2, color: 0x93c5fd, alpha: 0.95 });
    btn.eventMode = 'static';
    btn.cursor = 'pointer';
    btn.zIndex = 103;
    btn.on('pointertap', () => {
      if (typeof window !== 'undefined') window.location.reload();
    });
    layer.addChild(btn);
    const btnText = new Text({
      text: 'RESTART',
      style: {
        fill: 0xffffff,
        fontSize: Math.max(12, Math.floor(btnH * 0.35)),
        fontFamily: '"Bungee", "Press Start 2P", "Segoe UI", system-ui, monospace',
      },
    });
    btnText.anchor.set(0.5);
    btnText.position.set(btnX + btnW / 2, btnY + btnH / 2);
    btnText.zIndex = 104;
    layer.addChild(btnText);

    const msgTop = scoreText.position.y + scoreText.height * 0.5 + gap;
    const msgBottomLimit = btnY - gap;
    msg.position.set(cardX + cardW / 2, msgTop);
    if (msg.y + msg.height > msgBottomLimit) {
      const available = Math.max(32, msgBottomLimit - msgTop);
      msg.style.wordWrapWidth = Math.max(140, cardW - contentPadX * 2);
      msg.style.fontSize = Math.max(10, Math.min(msg.style.fontSize, Math.floor(available / 3.2)));
      msg.style.lineHeight = Math.max(12, Math.floor(msg.style.fontSize * 1.25));
      if (msg.y + msg.height > msgBottomLimit) {
        msg.y = Math.max(msgTop, msgBottomLimit - msg.height);
      }
    }

    this._uiRoot.addChild(layer);
    this._overlayBg = layer;
    this._overlayText = msg;
  }

  _isMobileControlsMode(): boolean {
    if (typeof window === 'undefined') return false;
    const coarse = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
    return coarse || this._viewW <= 768;
  }

  _buildHudPanels(): void {
    if (!this._uiRoot) return;
    if (this._hudRoot) {
      this._hudRoot.parent?.removeChild(this._hudRoot);
      this._hudRoot.destroy({ children: true });
      this._hudRoot = null;
    }
    const root = new Container();
    root.sortableChildren = true;
    const panelH = Math.max(30, Math.min(44, Math.floor(this._viewH * 0.06)));
    const panelW = Math.max(112, Math.min(188, Math.floor(this._viewW * 0.16)));
    const topPad = Math.max(8, Math.floor(this._viewH * 0.02));

    const leftX = 10;
    const rightX = this._viewW - panelW - 10;
    const leftPanel = new Graphics();
    leftPanel.roundRect(leftX, topPad, panelW, panelH, 12);
    leftPanel.fill({ color: 0x0f172a, alpha: 0.78 });
    leftPanel.stroke({ width: 2, color: 0xf59e0b, alpha: 0.95 });
    root.addChild(leftPanel);
    const rightPanel = new Graphics();
    rightPanel.roundRect(rightX, topPad, panelW, panelH, 12);
    rightPanel.fill({ color: 0x0f172a, alpha: 0.78 });
    rightPanel.stroke({ width: 2, color: 0x22d3ee, alpha: 0.95 });
    root.addChild(rightPanel);
    root.zIndex = 200;
    this._uiRoot.addChild(root);
    this._hudRoot = root;

    const fontFamily = '"Bungee", "Press Start 2P", "Segoe UI", system-ui, monospace';
    const size = Math.max(8, Math.floor(panelH * 0.3));
    const livesText = new Text({
      text: 'LIVES 0',
      style: {
        fill: 0xfef3c7,
        fontSize: size,
        fontFamily,
        fontWeight: '700',
      },
    });
    livesText.position.set(leftX + 9, topPad + Math.max(7, Math.floor(panelH * 0.28)));
    livesText.zIndex = 201;
    root.addChild(livesText);
    this._livesText = livesText;

    const coinsText = new Text({
      text: 'COINS 0',
      style: {
        fill: 0xcffafe,
        fontSize: size,
        fontFamily,
        fontWeight: '700',
      },
    });
    coinsText.position.set(rightX + 9, topPad + Math.max(7, Math.floor(panelH * 0.28)));
    coinsText.zIndex = 201;
    root.addChild(coinsText);
    this._coinsText = coinsText;
  }

  _emitVirtualKey(code: string, isDown: boolean): void {
    if (typeof window === 'undefined') return;
    const ev = new KeyboardEvent(isDown ? 'keydown' : 'keyup', {
      code,
      key: code,
      bubbles: true,
      cancelable: true,
      repeat: false,
    });
    window.dispatchEvent(ev);
  }

  _attachTouchButton(btn: Container, code: string): void {
    btn.eventMode = 'static';
    btn.cursor = 'pointer';
    btn.on('pointerdown', (e) => {
      if (this._endSequence !== 'none' || this._gameOver || this._gameWon) return;
      e.stopPropagation();
      this._touchHeld.set(code, true);
      this._emitVirtualKey(code, true);
    });
    const release = (e?: { stopPropagation?: () => void }) => {
      e?.stopPropagation?.();
      if (!this._touchHeld.get(code)) return;
      this._touchHeld.set(code, false);
      this._emitVirtualKey(code, false);
    };
    btn.on('pointerup', release);
    btn.on('pointerupoutside', release);
    btn.on('pointercancel', release);
    btn.on('pointerout', release);
  }

  _makeTouchButton(icon: string, x: number, y: number, size: number, code: string): Container {
    const c = new Graphics();
    const cx = x + size / 2;
    const cy = y + size / 2;
    const r = size / 2;
    c.circle(cx, cy, r);
    c.fill({ color: 0x0f172a, alpha: 0.74 });
    c.stroke({ width: 2, color: 0x7dd3fc, alpha: 0.95 });
    const iconG = new Graphics();
    const s = Math.max(12, Math.floor(size * 0.24));
    if (icon === 'left') {
      iconG.poly([cx + s * 0.6, cy - s, cx - s * 0.9, cy, cx + s * 0.6, cy + s]);
    } else if (icon === 'right') {
      iconG.poly([cx - s * 0.6, cy - s, cx + s * 0.9, cy, cx - s * 0.6, cy + s]);
    } else {
      iconG.poly([cx - s, cy + s * 0.6, cx, cy - s * 0.9, cx + s, cy + s * 0.6]);
    }
    iconG.fill({ color: 0xffffff, alpha: 1 });
    iconG.stroke({ width: 1.5, color: 0x1e293b, alpha: 0.8 });
    c.addChild(iconG);
    this._attachTouchButton(c, code);
    return c;
  }

  _buildMobileControls(): void {
    if (!this._uiRoot) return;
    if (this._controlsRoot) {
      this._controlsRoot.parent?.removeChild(this._controlsRoot);
      this._controlsRoot.destroy({ children: true });
      this._controlsRoot = null;
    }
    if (!this._isMobileControlsMode()) return;
    const root = new Container();
    root.sortableChildren = true;
    root.zIndex = 220;
    this._uiRoot.addChild(root);
    this._controlsRoot = root;

    const size = Math.max(56, Math.min(84, Math.floor(this._viewW * 0.14)));
    const pad = Math.max(14, Math.floor(this._viewW * 0.04));
    const bottomY = this._viewH - size - pad;

    const left = this._makeTouchButton('left', pad, bottomY, size, 'ArrowLeft');
    const right = this._makeTouchButton('right', pad + size + 12, bottomY, size, 'ArrowRight');
    const jump = this._makeTouchButton('up', this._viewW - size - pad, bottomY, size, 'Space');
    left.zIndex = 221;
    right.zIndex = 221;
    jump.zIndex = 221;
    this._controlsRoot.addChild(left);
    this._controlsRoot.addChild(right);
    this._controlsRoot.addChild(jump);
  }

  _syncCameraForViewport(world: any): void {
    const mobile = this._isMobileControlsMode();
    for (const ent of world.entities.values()) {
      const cam = ent.components.get(COMPONENT_CAMERA);
      if (!cam) continue;
      cam.offsetX = mobile ? 130 : 220;
      cam.offsetY = mobile ? -70 : -120;
    }
  }
}
