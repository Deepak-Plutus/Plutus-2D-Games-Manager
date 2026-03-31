import { Graphics, Text } from 'pixi.js';
import gsap from 'gsap';
import { BaseSystem } from '../Systems/BaseSystem.js';
import { aabbOverlap, buildColliderList } from '../Core/CollisionService.js';
import {
  COMPONENT_BEHAVIORS,
  COMPONENT_DISPLAY,
  COMPONENT_INSTANCE_VARIABLES,
  COMPONENT_META,
  COMPONENT_TRANSFORM,
} from '../Components/index.js';

/**
 * Platformer rules: enemies, coin blocks, optional win (coin quota and/or `goal` tag zone), HUD, game over / win overlays on screen UI.
 */
export class PlatformerGameSystem extends BaseSystem {
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
    this._overlayBg = null;
    /** @type {Text | null} */
    this._overlayText = null;
    this._hurtT = 0;
    this._blinkT = 0;
    this._gameOver = false;
    this._gameWon = false;
    this._prevPlayerY = null;
  }

  /**
   * @param {Record<string, unknown>} options
   */
  configure(options = {}) {
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
  setScreenUi(uiRoot, viewWidth, viewHeight) {
    this._uiRoot = uiRoot;
    this._viewW = Number(viewWidth) || 800;
    this._viewH = Number(viewHeight) || 600;
    this._hud = null;
    this._overlayBg = null;
    this._overlayText = null;
    this._gameOver = false;
    this._gameWon = false;
  }

  /**
   * @param {(frozen: boolean) => void} fn
   */
  setFreezeCallback(fn) {
    this._freeze = typeof fn === 'function' ? fn : null;
  }

  /**
   * @param {import('../ECS/World.js').World} world
   * @param {string} tag
   */
  _entityHasTag(world, entityId, tag) {
    const m = world.getComponent(entityId, COMPONENT_META);
    const tags = m?.tags;
    return Array.isArray(tags) && tags.includes(String(tag));
  }

  update(dt, world) {
    if (!this.enabled || !world || this._gameOver || this._gameWon) return;

    const colliders = buildColliderList(world);
    const playerId = world.findEntityIdByMetaName(this.playerMetaName);
    if (playerId == null) return;

    const pBox = colliders.find((c) => c.entityId === playerId);
    if (!pBox) return;

    const pIv = world.getComponent(playerId, COMPONENT_INSTANCE_VARIABLES);
    const pDisp = world.getComponent(playerId, COMPONENT_DISPLAY);
    const pView = pDisp?.view;
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

    if (this.showHud && this._uiRoot && !this._hud) {
      const t = new Text({
        text: '',
        style: {
          fill: 0xfff8e8,
          fontSize: 17,
          fontFamily: 'system-ui, Segoe UI, sans-serif',
        },
      });
      t.position.set(14, 12);
      t.zIndex = 10;
      this._uiRoot.addChild(t);
      this._hud = t;
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

    for (const c of colliders) {
      if (c.entityId === playerId) continue;
      if (!this._entityHasTag(world, c.entityId, 'goal')) continue;
      if (aabbOverlap(pBox, c)) {
        this._enterWin();
        return;
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
      pIv?.set('coins', cur + 1);

      const coinTr = world.getComponent(c.entityId, COMPONENT_TRANSFORM);
      const dv = world.getComponent(c.entityId, COMPONENT_DISPLAY)?.view;
      if (dv) {
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
        this._enterWin();
      }
      break;
    }

    this._prevPlayerY = pTr?.y ?? null;
  }

  _normalizeEnemySize(world, entityId) {
    const tr = world.getComponent(entityId, COMPONENT_TRANSFORM);
    if (tr) {
      tr.scaleX = tr.scaleX >= 0 ? 1 : -1;
      tr.scaleY = 1;
    }
    const view = world.getComponent(entityId, COMPONENT_DISPLAY)?.view;
    if (view) {
      view.width = 40;
      view.height = 40;
    }
  }

  _enterGameOver() {
    if (this._gameOver || this._gameWon) return;
    this._gameOver = true;
    this._freeze?.(true);
    this._showOverlay(this.gameOverMessage, 0xffe0e0);
  }

  _enterWin() {
    if (this._gameOver || this._gameWon) return;
    this._gameWon = true;
    this._freeze?.(true);
    this._showOverlay(this.winMessage, 0xd8ffd8);
  }

  /**
   * @param {string} message
   * @param {number} textFill
   */
  _showOverlay(message, textFill) {
    if (!this._uiRoot) return;
    const w = this._viewW;
    const h = this._viewH;
    const layer = new Graphics();
    layer.zIndex = 100;
    layer.eventMode = 'none';
    layer.rect(0, 0, w, h);
    layer.fill({ color: 0x000000, alpha: 0.75 });

    const msg = new Text({
      text: message,
      style: {
        fill: textFill,
        fontSize: 28,
        fontFamily: 'system-ui, Segoe UI, sans-serif',
        align: 'center',
        wordWrap: true,
        wordWrapWidth: Math.max(120, w - 40),
      },
    });
    msg.anchor.set(0.5);
    msg.position.set(w / 2, h / 2);
    msg.zIndex = 110;

    this._uiRoot.addChild(layer);
    this._uiRoot.addChild(msg);
    this._overlayBg = layer;
    this._overlayText = msg;
  }
}
