import gsap from 'gsap';
import { Container, Graphics, Rectangle, Text } from 'pixi.js';
import { BaseSystem } from '../Systems/BaseSystem.js';
import { getDisplayMountParent } from '../Core/DisplayHierarchy.js';
import {
  COMPONENT_BEHAVIORS,
  COMPONENT_DISPLAY,
  COMPONENT_INSTANCE_VARIABLES,
  COMPONENT_TRANSFORM,
} from '../Components/index.js';
import type { World } from '../ECS/World.js';
import type { AssetRegistry } from '../Core/AssetRegistry.js';
import type { EntityBuilder } from '../Entities/EntityBuilder.js';
import type { InputCoordinator } from '../Core/InputCoordinator.js';
import type { InputEventHub } from '../Core/InputEventHub.js';

type MoveDir = 'up' | 'down' | 'left' | 'right';

interface PointerEventLike {
  detail?: {
    x?: number;
    y?: number;
  };
}

/**
 * Spectral palette (ColorBrewer-style): 2 → 2048, left-to-right in the ramp.
 * @param {number} value Tile value.
 * @returns {{ bg: number, stroke: number }} Fill and stroke colors.
 */
function vibrantTileColors(value: number): { bg: number; stroke: number } {
  const tiers = [2048, 1024, 512, 256, 128, 64, 32, 16, 8, 4, 2];
  let tier = 2;
  for (const t of tiers) {
    if (value >= t) {
      tier = t;
      break;
    }
  }
  const map: Record<number, { bg: number; stroke: number }> = {
    2: { bg: 0xff6b6b, stroke: 0xd94848 },
    4: { bg: 0xff8e3c, stroke: 0xcc6b2b },
    8: { bg: 0xffbe0b, stroke: 0xcc9809 },
    16: { bg: 0xa8e063, stroke: 0x7eb64a },
    32: { bg: 0x4cd964, stroke: 0x2faa48 },
    64: { bg: 0x2ec4b6, stroke: 0x209387 },
    128: { bg: 0x00b4d8, stroke: 0x0284a8 },
    256: { bg: 0x3a86ff, stroke: 0x2d63bf },
    512: { bg: 0x6a4cff, stroke: 0x4f39c5 },
    1024: { bg: 0x9d4edd, stroke: 0x7539a6 },
    2048: { bg: 0xff2e93, stroke: 0xc21f6f },
  };
  return map[tier] ?? { bg: 0xff2e93, stroke: 0xc21f6f };
}

/**
 * Pick readable number color from tile background luminance.
 * @param {number} bgColor Background color as 0xRRGGBB.
 * @returns {string} CSS text color.
 */
function tileTextColor(bgColor: number): string {
  const r = (bgColor >> 16) & 0xff;
  const g = (bgColor >> 8) & 0xff;
  const b = bgColor & 0xff;
  const toLinear = (v: number): number => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const l = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  const contrastWithWhite = (1.0 + 0.05) / (l + 0.05);
  const contrastWithDark = (l + 0.05) / (0.05 + 0.05);
  return contrastWithDark >= contrastWithWhite ? '#111827' : '#ffffff';
}

/** Light purple grid tray + darker purple borders; inner fill is the lightest shade. */
const GRID_PURPLE_INNER = 0xede9fe;
const GRID_PURPLE_RING = 0xddd6fe;
const GRID_PURPLE_BORDER = 0xc4b5fd;
const GRID_PURPLE_BORDER_DEEP = 0xa78bfa;

/**
 * Tray behind the 4×4 grid (centered at 0,0): light purple fill, stepped darker purple rims.
 * @param {Graphics} g Graphics target.
 * @param {number} innerW Inner tray width.
 * @param {number} innerH Inner tray height.
 * @param {number} cornerR Corner radius.
 * @returns {void} Nothing.
 */
function drawMetallicGridBacking(g: Graphics, innerW: number, innerH: number, cornerR: number): void {
  const ring = 14;
  const ox = -innerW / 2;
  const oy = -innerH / 2;
  const outerW = innerW + ring * 2;
  const outerH = innerH + ring * 2;
  const outerR = cornerR + 6;
  const oxo = -outerW / 2;
  const oyo = -outerH / 2;

  g.roundRect(oxo, oyo, outerW, outerH, outerR);
  g.fill({ color: GRID_PURPLE_RING });

  g.roundRect(oxo, oyo, outerW, outerH, outerR);
  g.stroke({ width: 4, color: GRID_PURPLE_BORDER_DEEP, alpha: 0.55 });

  g.roundRect(oxo + 3, oyo + 3, outerW - 6, outerH - 6, outerR - 3);
  g.stroke({ width: 2, color: GRID_PURPLE_BORDER, alpha: 0.95 });

  g.roundRect(oxo + 7, oyo + 7, outerW - 14, outerH - 14, outerR - 5);
  g.stroke({ width: 1.5, color: GRID_PURPLE_BORDER, alpha: 0.65 });

  const sheenH = Math.max(14, (outerH * 0.12) | 0);
  g.roundRect(oxo + 10, oyo + 8, outerW - 20, sheenH, Math.max(6, outerR - 8));
  g.fill({ color: 0xffffff, alpha: 0.2 });

  g.roundRect(ox, oy, innerW, innerH, cornerR);
  g.fill({ color: GRID_PURPLE_INNER });
  g.stroke({ width: 2, color: GRID_PURPLE_BORDER, alpha: 1 });
}

/**
 * @param {number} value Tile value.
 * @returns {number} Font size in pixels.
 */
function tileFontSize(value: number): number {
  const n = String(value).length;
  if (n >= 4) return 18;
  if (n === 3) return 22;
  return 28;
}

/**
 * @param {number[]} rowV Row values.
 * @returns {{ outV: number[], mergeScore: number }} Slid row and merge score.
 */
function slideRowLeftValues(rowV: number[]): { outV: number[]; mergeScore: number } {
  const items: number[] = [];
  for (let c = 0; c < 4; c++) {
    if (rowV[c] !== 0) items.push(rowV[c]!);
  }
  const outV = [0, 0, 0, 0];
  let mergeScore = 0;
  let w = 0;
  let i = 0;
  while (i < items.length) {
    if (i < items.length - 1 && items[i] === items[i + 1]) {
      const merged = items[i]! * 2;
      outV[w] = merged;
      mergeScore += merged;
      w += 1;
      i += 2;
    } else {
      outV[w] = items[i]!;
      w += 1;
      i += 1;
    }
  }
  return { outV, mergeScore };
}

const UI_FONT = { fontFamily: 'Segoe UI, system-ui, sans-serif' };

/**
 * Layered HUD / modal panel: drop shadow + face + inner rim + soft top sheen.
 * @param {Container} parent Parent container.
 * @param {number} panelW Panel width.
 * @param {number} panelH Panel height.
 * @param {number} cornerR Corner radius.
 * @param {number} z Base z-index.
 * @returns {void} Nothing.
 */
function addGamePanelLayers(parent: Container, panelW: number, panelH: number, cornerR: number, z: number): void {
  const sh = new Graphics();
  sh.roundRect(6, 9, panelW - 12, panelH - 10, Math.max(4, cornerR - 2));
  sh.fill({ color: 0x475569, alpha: 0.14 });
  sh.zIndex = z;
  parent.addChild(sh);

  const face = new Graphics();
  face.roundRect(0, 0, panelW, panelH, cornerR);
  face.fill({ color: 0xeef2f7, alpha: 0.97 });
  face.stroke({ width: 2, color: 0xa5b4d8, alpha: 0.9 });
  face.stroke({ width: 1.25, color: 0x93c5fd, alpha: 0.55 });
  face.zIndex = z + 1;
  parent.addChild(face);

  const rim = new Graphics();
  rim.roundRect(3, 3, panelW - 6, panelH - 6, cornerR - 3);
  rim.stroke({ width: 1, color: 0xc4b5fd, alpha: 0.35 });
  rim.zIndex = z + 2;
  parent.addChild(rim);

  const sheenH = Math.max(22, (panelH * 0.22) | 0);
  const sheen = new Graphics();
  sheen.roundRect(12, 4, panelW - 24, sheenH, Math.max(6, cornerR - 6));
  sheen.fill({ color: 0xdbeafe, alpha: 0.45 });
  sheen.zIndex = z + 2;
  parent.addChild(sheen);

  const sheen2 = new Graphics();
  sheen2.roundRect(12, 4, panelW - 24, (sheenH * 0.45) | 0, 8);
  sheen2.fill({ color: 0xe9d5ff, alpha: 0.28 });
  sheen2.zIndex = z + 2;
  parent.addChild(sheen2);

  const accent = new Graphics();
  accent.roundRect(16, panelH - 5, panelW - 32, 4, 2);
  accent.fill({ color: 0x8b5cf6, alpha: 0.55 });
  accent.zIndex = z + 3;
  parent.addChild(accent);
}

/**
 * @param {string} label Button label.
 * @param {number} w Button width.
 * @param {number} h Button height.
 * @param {() => void} onTap Tap callback.
 * @param {{ fontSize?: number, bold?: boolean, bg?: number, fg?: number, border?: number, borderHi?: number }} [opts] Visual options.
 * @returns {Container} Button container.
 */
function makePixiButton(
  label: string,
  w: number,
  h: number,
  onTap: () => void,
  opts: { fontSize?: number; bold?: boolean; bg?: number; fg?: number; border?: number; borderHi?: number } = {}
): Container {
  const bg = opts.bg ?? 0x6d28d9;
  const fg = opts.fg ?? 0xffffff;
  const border = opts.border ?? 0x4c1d95;
  const borderHi = opts.borderHi ?? 0xf0abfc;
  const c = new Container();
  c.eventMode = 'static';
  c.cursor = 'pointer';
  c.hitArea = new Rectangle(0, 0, w, h);
  const rr = Math.min(12, Math.floor(h / 3));

  const drop = new Graphics();
  drop.roundRect(2, 5, w - 4, h - 3, rr);
  drop.fill({ color: 0x64748b, alpha: 0.18 });
  c.addChild(drop);

  const g = new Graphics();
  g.roundRect(0, 0, w, h, rr);
  g.fill({ color: bg });
  g.stroke({ width: 2, color: borderHi, alpha: 0.55 });
  g.stroke({ width: 1.25, color: border, alpha: 0.95 });
  c.addChild(g);

  const gloss = new Graphics();
  gloss.roundRect(3, 2, w - 6, (h * 0.38) | 0, rr - 2);
  gloss.fill({ color: 0xffffff, alpha: 0.12 });
  c.addChild(gloss);

  const t = new Text({
    text: label,
    style: {
      ...UI_FONT,
      fontSize: opts.fontSize ?? 15,
      fontWeight: opts.bold ? '800' : '700',
      fill: fg,
      dropShadow: {
        alpha: 0.45,
        angle: Math.PI / 2,
        blur: 3,
        color: 0x64748b,
        distance: 1,
      },
    },
  });
  t.anchor.set(0.5);
  t.position.set(w / 2, h / 2 + 0.5);
  c.addChild(t);
  c.on('pointertap', (e) => {
    e.stopPropagation();
    onTap();
  });
  c.on('pointerover', () => {
    c.scale.set(1.04);
    g.tint = 0xfff1a8;
  });
  c.on('pointerout', () => {
    c.scale.set(1);
    g.tint = 0xffffff;
  });
  return c;
}

/**
 * 4×4 2048-style game: keyboard / action keys + drag swipes; snap grid; slide tweens (GSAP).
 * Object types should attach {@link import('../Behaviors/TweenBehavior.js').TweenBehavior} on tiles and
 * {@link import('../Behaviors/SineBehavior.js').SineBehavior} on cell backplates (configured in JSON).
 */
export class Game2048Game extends BaseSystem {
  static inputRequirements = { keyboard: true, pointer: true, wheel: false, gamepad: false };
  [key: string]: any;

  constructor() {
    super();
    this.cellSize = 72;
    this.gap = 8;
    this.boardCenterX = 400;
    this.boardCenterY = 300;
    this.slideDuration = 0.14;
    this.slideEase = 'power2.out';
    this.winValue = 2048;
    /** @type {import('../Core/InputCoordinator.js').InputCoordinator | null} */
    this._inputCoordinator = null;
    /** @type {import('../Core/InputEventHub.js').InputEventHub | null} */
    this._inputHub = null;
    this._layoutW = 800;
    this._layoutH = 600;
    /** @type {import('pixi.js').Container | null} */
    this._uiRoot = null;
    /** @type {import('pixi.js').Container | null} */
    this._headerRoot = null;
    /** @type {Text | null} */
    this._title = null;
    /** @type {Text | null} */
    this._instructions = null;
    /** @type {Text | null} */
    this._scoreValueText = null;
    /** @type {Text | null} */
    this._goalValueText = null;
    /** @type {Container | null} */
    this._pauseBtn = null;
    /** @type {import('pixi.js').Container | null} */
    this._pauseOverlayRoot = null;
    this._paused = false;
    /** @type {Record<string, unknown> | null} */
    this._spawnOpts = null;
    /** @type {import('../Entities/EntityBuilder.js').EntityBuilder | null} */
    this._entityBuilder = null;
    /** @type {import('../Core/AssetRegistry.js').AssetRegistry | null} */
    this._registry = null;
    /** @type {import('pixi.js').Container | null} */
    this._stage = null;
    /** @type {import('pixi.js').Container | null} */
    this._boardFrameRoot = null;
    /** @type {import('pixi.js').Container | null} */
    this._gridCellEntityGroup = null;
    /** @type {import('../ECS/World.js').World | null} */
    this._world = null;

    /** @type {number[][]} */
    this._values = [];
    /** @type {(number | null)[][]} */
    this._entityAt = [];
    this._animating = false;
    /** @type {Record<string, boolean>} */
    this._prevKey = { up: false, down: false, left: false, right: false };
    /** @type {{ x: number, y: number } | null} */
    this._dragStart = null;
    this._dragUnsubs = [];
    /** @type {Map<number, { root: Container, bg: Graphics, text: Text, tileMask: Graphics, viewUnderlay: Graphics }>} */
    this._labels = new Map();
    this._moveScheduled = false;
    /** @type {'up'|'down'|'left'|'right'|null} */
    this._pendingDir = null;

    this._score = 0;
    /** @type {'playing' | 'won' | 'lost'} */
    this._playState = 'playing';
    /** @type {import('pixi.js').Container | null} */
    this._endOverlay = null;
    this._prevKeyR = false;
  }

  /**
   * Recompute responsive 2048 layout based on viewport:
   * top 5% gap, panel 30%, panel→grid gap 10%, grid 50%, bottom 5% gap.
   * Keeps integer sizes/positions to reduce blur.
   * @param {number} viewW View width.
   * @param {number} viewH View height.
   * @returns {void} Nothing.
   */
  _reflowResponsiveLayout(viewW: number, viewH: number) {
    const vw = Math.max(320, Math.floor(viewW));
    const vh = Math.max(480, Math.floor(viewH));
    const topGap = Math.floor(vh * 0.05);
    const panelH = Math.floor(vh * 0.3);
    const panelGridGap = Math.floor(vh * 0.1);
    const gridBandH = Math.floor(vh * 0.5);
    const centerX = Math.floor(vw / 2);
    const centerY = topGap + panelH + panelGridGap + Math.floor(gridBandH / 2);

    const maxGridW = Math.floor(vw * 0.9);
    const maxGridH = Math.floor(gridBandH * 0.92);
    const gridSize = Math.max(220, Math.min(maxGridW, maxGridH));
    const gap = Math.max(6, Math.round(gridSize * 0.03));
    const cell = Math.max(28, Math.floor((gridSize - 3 * gap) / 4));

    this.boardCenterX = centerX;
    this.boardCenterY = centerY;
    this.gap = gap;
    this.cellSize = cell;
  }

  /**
   * Applies 2048 config overrides.
   *
   * @param {Record<string, unknown>} options Merged `systems.game2048` and optional `game2048` root config.
   * @returns {void} Nothing.
   */
  configure(options: Record<string, unknown> = {}) {
    if (options.cellSize != null) this.cellSize = Number(options.cellSize) || 72;
    if (options.gap != null) this.gap = Number(options.gap) || 8;
    const ox = (options.boardOrigin ?? {}) as { x?: unknown; y?: unknown };
    if (ox.x != null) this.boardCenterX = Number(ox.x);
    if (ox.y != null) this.boardCenterY = Number(ox.y);
    if (options.slideDuration != null) this.slideDuration = Number(options.slideDuration) || 0.14;
    if (options.slideEase != null) this.slideEase = String(options.slideEase);
    if (options.winValue != null) this.winValue = Number(options.winValue) || 2048;
    if (this._goalValueText) this._goalValueText.text = String(this.winValue);
    if (this._stage) {
      this._reflowResponsiveLayout(this._layoutW, this._layoutH);
      this._syncBoardFrame();
      this._syncGridCellEntityViews();
      this._syncEntityTransformsToGrid();
      this._syncAllLabels();
    }
  }

  /**
   * Sets runtime dependencies and viewport.
   *
   * @param {number} w View width.
   * @param {number} h View height.
   * @param {import('../Core/InputCoordinator.js').InputCoordinator} inputCoordinator Input coordinator.
   * @param {import('../Core/InputEventHub.js').InputEventHub} inputHub Input event hub.
   * @returns {void} Nothing.
   */
  setRuntime(w: number, h: number, inputCoordinator: InputCoordinator, inputHub: InputEventHub) {
    this._layoutW = w;
    this._layoutH = h;
    this._inputCoordinator = inputCoordinator;
    this._inputHub = inputHub;
    this._reflowResponsiveLayout(w, h);
    this._syncBoardFrame();
    this._syncGridCellEntityViews();
    this._syncEntityTransformsToGrid();
    this._syncAllLabels();
    this._bindDrag();
  }

  /**
   * Top edge of the 4×4 board (matches {@link cellCenter} / entity layout).
   * @returns {number} Grid top y coordinate.
   */
  _gridTopY() {
    const step = this._step();
    return this.boardCenterY - 1.5 * step - this.cellSize / 2;
  }

  /**
   * Builds and mounts 2048 HUD/UI on the screen layer.
   *
   * @param {import('pixi.js').Container | null} uiRoot Screen-space UI root.
   * @param {number} viewW View width.
   * @param {number} viewH View height.
   * @returns {void} Nothing.
   */
  setScreenUi(uiRoot: Container | null, viewW: number, viewH: number) {
    this._uiRoot = uiRoot;
    if (!uiRoot) return;
    uiRoot.sortableChildren = true;
    this._reflowResponsiveLayout(viewW, viewH);

    if (this._headerRoot) {
      this._headerRoot.parent?.removeChild(this._headerRoot);
      this._headerRoot.destroy({ children: true });
      this._headerRoot = null;
    }
    if (this._pauseOverlayRoot) {
      this._pauseOverlayRoot.parent?.removeChild(this._pauseOverlayRoot);
      this._pauseOverlayRoot.destroy({ children: true });
      this._pauseOverlayRoot = null;
    }

    const isMobileWidth = viewW <= 768;
    const marginX = isMobileWidth ? Math.floor(viewW * 0.05) : 16;
    const desktopCap = 760;
    const panelW = isMobileWidth
      ? Math.max(280, Math.floor(viewW - marginX * 2))
      : Math.max(280, Math.min(viewW - marginX * 2, Math.floor(viewW * 0.78), desktopCap));
    const panelH = Math.max(120, Math.floor(viewH * 0.3));
    const top = Math.floor(viewH * 0.05);
    const left = Math.max(marginX, (viewW - panelW) / 2);

    const headerRoot = new Container();
    headerRoot.position.set(left, top);
    headerRoot.zIndex = 15;
    headerRoot.sortableChildren = true;
    this._headerRoot = headerRoot;

    addGamePanelLayers(headerRoot, panelW, panelH, 16, 0);

    const hPad = 12;
    const rowControlsY = Math.max(40, Math.floor(panelH * 0.34));
    const statValueFontSize = 20;

    const pauseBtn = makePixiButton('||', 40, 32, () => this._openPause(), {
      fontSize: 14,
      bg: 0x5b21b6,
      border: 0x4c1d95,
      borderHi: 0x22d3ee,
    });
    pauseBtn.position.set(hPad, rowControlsY);
    pauseBtn.zIndex = 8;
    this._pauseBtn = pauseBtn;
    headerRoot.addChild(pauseBtn);

    const scoreLabel = new Text({
      text: 'SCORE',
      style: {
        ...UI_FONT,
        fill: 0x6d28d9,
        fontSize: 10,
        letterSpacing: 1.4,
        fontWeight: '700',
        dropShadow: {
          alpha: 0.35,
          blur: 2,
          color: 0x94a3b8,
          distance: 1,
          angle: Math.PI / 2,
        },
      },
    });
    scoreLabel.position.set(hPad + 46, rowControlsY);
    scoreLabel.zIndex = 8;

    const scoreValue = new Text({
      text: '0',
      style: {
        ...UI_FONT,
        fill: 0x0e7490,
        fontSize: statValueFontSize,
        fontWeight: '800',
        dropShadow: {
          alpha: 0.35,
          blur: 3,
          color: 0x94a3b8,
          distance: 0,
        },
      },
    });
    scoreValue.position.set(hPad + 46, rowControlsY + 14);
    scoreValue.zIndex = 8;
    this._scoreValueText = scoreValue;

    const title = new Text({
      text: 'Plutus 2048',
      style: {
        ...UI_FONT,
        fill: 0x5b21b6,
        fontSize: Math.max(16, Math.floor(panelH * 0.16)),
        fontWeight: '800',
        letterSpacing: 0.8,
        align: 'center',
        wordWrap: true,
        wordWrapWidth: Math.max(160, panelW - hPad * 2),
        dropShadow: {
          alpha: 0.25,
          angle: Math.PI / 2,
          blur: 4,
          color: 0xc4b5fd,
          distance: 1,
        },
      },
    });
    title.anchor.set(0.5, 0);
    title.position.set(panelW / 2, hPad + 2);
    title.zIndex = 8;

    const goalLabel = new Text({
      text: 'GOAL',
      style: {
        ...UI_FONT,
        fill: 0xa21caf,
        fontSize: 10,
        letterSpacing: 1.4,
        fontWeight: '700',
        dropShadow: {
          alpha: 0.35,
          blur: 2,
          color: 0x94a3b8,
          distance: 1,
          angle: Math.PI / 2,
        },
      },
    });
    goalLabel.anchor.set(1, 0);
    goalLabel.position.set(panelW - hPad, rowControlsY);
    goalLabel.zIndex = 8;

    const goalValue = new Text({
      text: String(this.winValue),
      style: {
        ...UI_FONT,
        fill: 0xd97706,
        fontSize: statValueFontSize,
        fontWeight: '800',
        dropShadow: {
          alpha: 0.35,
          blur: 3,
          color: 0x94a3b8,
          distance: 1,
          angle: Math.PI / 2,
        },
      },
    });
    goalValue.anchor.set(1, 0);
    goalValue.position.set(panelW - hPad, rowControlsY + 14);
    goalValue.zIndex = 8;
    this._goalValueText = goalValue;

    const instructions = new Text({
      text:
        '• Swipe (or use arrow keys) to move all tiles.\n' +
        '• Merge matching tiles to reach 2048.',
      style: {
        ...UI_FONT,
        fill: 0x475569,
        fontSize: Math.max(9, Math.floor(panelH * 0.064)),
        lineHeight: Math.max(12, Math.floor(panelH * 0.1)),
        wordWrap: true,
        wordWrapWidth: panelW - hPad * 2 - 24,
        align: 'center',
        dropShadow: {
          alpha: 0.2,
          blur: 1,
          color: 0xe2e8f0,
          distance: 1,
          angle: Math.PI / 2,
        },
      },
    });
    const statsBottomY = Math.max(scoreValue.y + scoreValue.height, goalValue.y + goalValue.height);
    const statsToInstructionsGap = Math.max(10, Math.floor(panelH * 0.08));
    const instructionsY = Math.max(64, Math.floor(panelH * 0.52), Math.ceil(statsBottomY + statsToInstructionsGap));
    instructions.anchor.set(0.5, 0);
    instructions.position.set(panelW / 2, instructionsY);
    instructions.zIndex = 8;

    headerRoot.addChild(scoreLabel);
    headerRoot.addChild(scoreValue);
    headerRoot.addChild(title);
    headerRoot.addChild(goalLabel);
    headerRoot.addChild(goalValue);
    headerRoot.addChild(instructions);
    uiRoot.addChild(headerRoot);

    this._title = title;
    this._instructions = instructions;

    this._buildPauseOverlay(viewW, viewH);
    this._syncPauseButtonState();
  }

  /**
   * Builds pause modal overlay.
   *
   * @param {number} viewW View width.
   * @param {number} viewH View height.
   * @returns {void} Nothing.
   */
  _buildPauseOverlay(viewW: number, viewH: number) {
    const ui = this._uiRoot;
    if (!ui) return;

    const root = new Container();
    root.visible = false;
    root.zIndex = 300;
    root.sortableChildren = true;

    const dim = new Graphics();
    dim.rect(0, 0, viewW, viewH);
    dim.fill({ color: 0x334155, alpha: 0.48 });
    dim.eventMode = 'static';
    dim.zIndex = 0;
    root.addChild(dim);

    const modalW = 320;
    const modalH = 248;
    const mx = (viewW - modalW) / 2;
    const my = (viewH - modalH) / 2;

    const modal = new Container();
    modal.position.set(mx, my);
    modal.zIndex = 1;
    modal.sortableChildren = true;
    addGamePanelLayers(modal, modalW, modalH, 18, 0);

    const pausedTitle = new Text({
      text: 'Paused',
      style: {
        ...UI_FONT,
        fill: 0x5b21b6,
        fontSize: 30,
        fontWeight: '800',
        letterSpacing: 1,
        dropShadow: {
          alpha: 0.25,
          blur: 6,
          color: 0xc4b5fd,
          distance: 1,
          angle: Math.PI / 2,
        },
      },
    });
    pausedTitle.anchor.set(0.5, 0);
    pausedTitle.position.set(modalW / 2, 28);
    pausedTitle.zIndex = 10;
    modal.addChild(pausedTitle);

    const resumeBtn = makePixiButton('Resume game', modalW - 48, 44, () => this._resumePause(), {
      fontSize: 16,
      bold: true,
      bg: 0x7c3aed,
      border: 0x5b21b6,
      borderHi: 0x22d3ee,
    });
    resumeBtn.position.set(24, 88);
    resumeBtn.zIndex = 10;
    modal.addChild(resumeBtn);

    const restartBtn = makePixiButton('Restart game', modalW - 48, 44, () => this._restartFromPause(), {
      fontSize: 16,
      bold: true,
      bg: 0xdb2777,
      border: 0x9d174d,
      borderHi: 0xf472b6,
    });
    restartBtn.position.set(24, 146);
    restartBtn.zIndex = 10;
    modal.addChild(restartBtn);

    const hint = new Text({
      text: 'Tip: after a win or loss, press R for a new game.',
      style: {
        ...UI_FONT,
        fill: 0x475569,
        fontSize: 12,
        align: 'center',
        wordWrap: true,
        wordWrapWidth: modalW - 40,
        dropShadow: {
          alpha: 0.2,
          blur: 1,
          color: 0xe2e8f0,
          distance: 1,
          angle: Math.PI / 2,
        },
      },
    });
    hint.anchor.set(0.5, 0);
    hint.position.set(modalW / 2, 204);
    hint.zIndex = 10;
    modal.addChild(hint);

    root.addChild(modal);
    ui.addChild(root);
    this._pauseOverlayRoot = root;
  }

  _syncPauseButtonState() {
    const b = this._pauseBtn;
    if (!b) return;
    const canPause = this._playState === 'playing' && !this._paused;
    b.eventMode = canPause ? 'static' : 'none';
    b.cursor = canPause ? 'pointer' : 'default';
    b.alpha = canPause ? 1 : 0.4;
  }

  _openPause() {
    if (this._playState !== 'playing' || this._paused || !this._pauseOverlayRoot) return;
    this._paused = true;
    this._pauseOverlayRoot.visible = true;
    gsap.globalTimeline.pause();
    this._syncPauseButtonState();
  }

  _resumePause() {
    if (!this._paused) return;
    this._paused = false;
    if (this._pauseOverlayRoot) this._pauseOverlayRoot.visible = false;
    gsap.globalTimeline.resume();
    this._syncPauseButtonState();
  }

  _restartFromPause() {
    if (!this._pauseOverlayRoot) return;
    this._paused = false;
    this._pauseOverlayRoot.visible = false;
    gsap.globalTimeline.resume();
    this._restartGame();
  }

  _bindDrag() {
    for (const u of this._dragUnsubs) u();
    this._dragUnsubs = [];
    const hub = this._inputHub;
    if (!hub) return;
    const down = (ev: PointerEventLike) => {
      const d = ev.detail ?? {};
      this._dragStart = { x: Number(d.x), y: Number(d.y) };
    };
    const up = (ev: PointerEventLike) => {
      if (!this._dragStart || !this.enabled || this._paused || this._animating || this._playState !== 'playing') {
        this._dragStart = null;
        return;
      }
      const d = ev.detail ?? {};
      const x = Number(d.x);
      const y = Number(d.y);
      const dx = x - this._dragStart.x;
      const dy = y - this._dragStart.y;
      this._dragStart = null;
      const dist = Math.hypot(dx, dy);
      if (dist < 28) return;
      const dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
      this._queueMove(dir);
    };
    hub.addEventListener('drag:start', down);
    hub.addEventListener('drag:end', up);
    this._dragUnsubs.push(() => hub.removeEventListener('drag:start', down));
    this._dragUnsubs.push(() => hub.removeEventListener('drag:end', up));
  }

  /**
   * Call after assets + entities from config are loaded.
   * @param {import('../ECS/World.js').World} world ECS world.
   * @param {import('../Core/AssetRegistry.js').AssetRegistry} registry Asset registry.
   * @param {import('pixi.js').Container} stage World stage container.
   * @param {import('../Entities/EntityBuilder.js').EntityBuilder} entityBuilder Entity spawner.
   * @param {Record<string, unknown>} fullConfig Full game config.
   * @returns {void} Nothing.
   */
  bootstrap(
    world: World,
    registry: AssetRegistry,
    stage: Container,
    entityBuilder: EntityBuilder,
    fullConfig: Record<string, unknown>
  ) {
    if (!this.enabled) return;
    this._world = world;
    this._registry = registry;
    this._stage = stage;
    this._reflowResponsiveLayout(this._layoutW, this._layoutH);
    this._syncBoardFrame();
    this._syncGridCellEntityViews();
    this._entityBuilder = entityBuilder;
    this._spawnOpts = {
      objectTypes: fullConfig.objectTypes ?? [],
      layers: fullConfig.layers ?? [],
    };
    this._score = 0;
    this._playState = 'playing';
    this._paused = false;
    if (this._pauseOverlayRoot) this._pauseOverlayRoot.visible = false;
    gsap.globalTimeline.resume();
    this._hideEndOverlay();
    this._resetGrid();
    this._spawnTwoTwos();
    this._syncEntityTransformsToGrid();
    this._syncAllLabels();
    this._updateHud();
    this._syncPauseButtonState();
  }

  _resetGrid() {
    this._values = Array.from({ length: 4 }, () => [0, 0, 0, 0]);
    this._entityAt = Array.from({ length: 4 }, () => [null, null, null, null]);
  }

  _step() {
    const s = this.cellSize + this.gap;
    return s;
  }

  /** Corner radius for each empty cell slot (matches tile label rounding style). */
  _cellSlotCornerRadius() {
    return Math.min(12, Math.floor(this.cellSize * 0.2));
  }

  /** Group + resize the 16 grid-cell sprite rectangles from config. */
  _syncGridCellEntityViews() {
    const stage = this._stage;
    const world = this._world;
    if (!stage || !world) return;

    if (!this._gridCellEntityGroup) {
      const root = new Container();
      root.zIndex = 3;
      root.sortableChildren = true;
      stage.addChild(root);
      this._gridCellEntityGroup = root;
    }

    const ids = world.findEntityIdsByTag('gridCell');
    let idx = 0;
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        const id = ids[idx++];
        if (id == null) continue;
        const { x, y } = this.cellCenter(col, row);
        const tr = world.getComponent(id, COMPONENT_TRANSFORM);
        if (tr) {
          tr.x = x;
          tr.y = y;
          tr.scaleX = this.cellSize;
          tr.scaleY = this.cellSize;
        }
        const behaviors = world.getComponent(id, COMPONENT_BEHAVIORS);
        if (Array.isArray(behaviors)) {
          const sine = behaviors.find((b) => b?.constructor?.type === 'sine');
          if (sine && typeof sine.setEnabled === 'function') {
            sine.setEnabled(false);
          }
        }
        const view = world.getComponent(id, COMPONENT_DISPLAY)?.view;
        if (view) {
          if (view.parent !== this._gridCellEntityGroup) this._gridCellEntityGroup.addChild(view);
          view.visible = true;
        }
      }
    }
  }

  /** Slate tray + metallic rim behind cells; z-index below grid sprites. */
  _syncBoardFrame() {
    const stage = this._stage;
    if (!stage) return;
    if (this._boardFrameRoot) {
      this._boardFrameRoot.parent?.removeChild(this._boardFrameRoot);
      this._boardFrameRoot.destroy({ children: true });
      this._boardFrameRoot = null;
    }
    const bw = 4 * this.cellSize + 3 * this.gap;
    const bh = bw;
    const cornerR = Math.min(18, Math.floor(Math.min(bw, bh) * 0.06));
    const root = new Container();
    root.zIndex = 2;
    root.sortableChildren = true;
    root.position.set(this.boardCenterX, this.boardCenterY);
    const g = new Graphics();
    drawMetallicGridBacking(g, bw, bh, cornerR);
    root.addChild(g);
    stage.addChild(root);
    this._boardFrameRoot = root;
  }

  /**
   * @param {number} col 0..3
   * @param {number} row 0..3
   */
  cellCenter(col: number, row: number): { x: number; y: number } {
    const s = this._step();
    const ox = this.boardCenterX;
    const oy = this.boardCenterY;
    const x = Math.round(ox + (col - 1.5) * s);
    const y = Math.round(oy + (row - 1.5) * s);
    return { x, y };
  }

  /** Keep existing spawned tiles aligned to current responsive grid. */
  _syncEntityTransformsToGrid() {
    const world = this._world;
    if (!world) return;
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const id = this._entityAt[r]?.[c];
        if (id == null) continue;
        const tr = world.getComponent(id, COMPONENT_TRANSFORM);
        if (!tr) continue;
        const { x, y } = this.cellCenter(c, r);
        tr.x = x;
        tr.y = y;
      }
    }
  }

  _queueMove(dir: 'up' | 'down' | 'left' | 'right') {
    if (this._paused || this._animating || this._playState !== 'playing') return;
    this._moveScheduled = true;
    this._pendingDir = /** @type {'up'|'down'|'left'|'right'} */ (dir);
  }

  _spawnTwoTwos() {
    const positions = this._twoRandomDistinctCells();
    for (const { row, col } of positions as Array<{ row: number; col: number }>) {
      this._spawnTileAt(row, col, 2);
    }
  }

  _twoRandomDistinctCells() {
    const opts = [];
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (this._values[r][c] === 0) opts.push({ row: r, col: c });
      }
    }
    const out = [];
    for (let k = 0; k < 2 && opts.length; k++) {
      const i = Math.floor(Math.random() * opts.length);
      out.push(opts[i]!);
      opts.splice(i, 1);
    }
    return out;
  }

  _spawnTileAt(row: number, col: number, value: number) {
    const world = this._world;
    const eb = this._entityBuilder;
    const reg = this._registry;
    const stage = this._stage;
    if (!world || !eb || !reg || !stage) return;
    const { x, y } = this.cellCenter(col, row);
    const id = eb.spawnFromInstance(world, reg, stage, this._spawnOpts, {
      type: 'tile2048',
      transform: { x, y, rotation: 0, scaleX: 1, scaleY: 1 },
      instanceVariables: { value },
      layer: 'Main',
      zIndex: 50,
      tags: ['game2048Tile'],
    });
    const view = new Container();
    view.sortableChildren = true;
    getDisplayMountParent(world, id, stage).addChild(view);
    world.setComponent(id, COMPONENT_DISPLAY, { view });

    this._values[row][col] = value;
    this._entityAt[row][col] = id;
    this._attachLabel(id, value);
  }

  /**
   * Attaches/upserts visual label for a tile entity.
   *
   * @param {number} entityId Tile entity id.
   * @param {number} value Tile value.
   * @returns {void} Nothing.
   */
  _attachLabel(entityId: number, value: number) {
    const world = this._world;
    if (!world) return;
    const disp = world.getComponent(entityId, COMPONENT_DISPLAY);
    const view = disp?.view;
    if (!view) return;

    const dim = this.cellSize;
    const radius = this._cellSlotCornerRadius();
    const colors = vibrantTileColors(value);
    const fs = tileFontSize(value);

    let entry = this._labels.get(entityId);
    if (!entry) {
      const root = new Container();
      const bg = new Graphics();
      const text = new Text({
        text: '',
        style: {
          fontSize: fs,
          fontWeight: '700',
          fontFamily: 'Segoe UI, system-ui, sans-serif',
          fill: '#ffffff',
        },
      });
      text.anchor.set(0.5);
      root.sortableChildren = true;
      bg.zIndex = 0;
      text.zIndex = 1;
      root.addChild(bg);
      root.addChild(text);

      const hs = dim / 2;
      const tileMask = new Graphics();
      tileMask.roundRect(-hs, -hs, dim, dim, radius);
      tileMask.fill({ color: 0xffffff });

      const viewUnderlay = new Graphics();

      view.addChild(tileMask);
      view.addChild(viewUnderlay);
      view.addChild(root);
      view.mask = tileMask;

      entry = { root, bg, text, tileMask, viewUnderlay };
      this._labels.set(entityId, entry);
    }

    const { bg, text, viewUnderlay } = entry;
    const hs = dim / 2;
    viewUnderlay.clear();
    viewUnderlay.roundRect(-hs, -hs, dim, dim, radius);
    viewUnderlay.fill({ color: GRID_PURPLE_INNER });

    bg.clear();
    bg.roundRect(-dim / 2, -dim / 2, dim, dim, radius);
    bg.fill({ color: colors.bg });
    bg.stroke({ width: 1.5, color: colors.stroke, alpha: 1 });

    text.text = String(value);
    text.style.fontSize = fs;
    text.style.fill = tileTextColor(colors.bg);
    text.style.fontWeight = '800';
    text.style.stroke = { width: 0 };
    text.style.dropShadow = false;
    text.tint = 0xffffff;
  }

  /**
   * Removes tile label visuals for an entity.
   *
   * @param {number} entityId Tile entity id.
   * @returns {void} Nothing.
   */
  _removeLabel(entityId: number) {
    const entry = this._labels.get(entityId);
    if (!entry) return;
    const view = entry.root.parent;
    if (view) {
      view.mask = null;
      if (entry.tileMask) {
        view.removeChild(entry.tileMask);
        entry.tileMask.destroy();
      }
      if (entry.viewUnderlay) {
        view.removeChild(entry.viewUnderlay);
        entry.viewUnderlay.destroy();
      }
      view.removeChild(entry.root);
    } else {
      entry.root.parent?.removeChild(entry.root);
    }
    entry.root.destroy({ children: true });
    this._labels.delete(entityId);
  }

  _syncAllLabels() {
    if (!Array.isArray(this._entityAt) || !Array.isArray(this._values) || this._entityAt.length < 4 || this._values.length < 4) {
      return;
    }
    for (let r = 0; r < 4; r++) {
      if (!Array.isArray(this._entityAt[r]) || !Array.isArray(this._values[r])) continue;
      for (let c = 0; c < 4; c++) {
        const id = this._entityAt[r][c];
        const v = this._values[r][c];
        if (id != null && v > 0) this._attachLabel(id, v);
      }
    }
  }

  _updateHud() {
    if (this._scoreValueText) this._scoreValueText.text = String(this._score);
  }

  /**
   * Slides one row left while preserving entity ids and merge bookkeeping.
   *
   * @param {number[]} rowV Row values.
   * @param {(number | null)[]} rowE Row entity ids.
   * @returns {{ outV: number[], outE: (number | null)[], kill: number[], mergeScore: number }} Slide result.
   */
  _slideRowLeft(rowV: number[], rowE: Array<number | null>) {
    const items: Array<{ v: number; e: number | null }> = [];
    for (let c = 0; c < 4; c++) {
      if (rowV[c] !== 0) items.push({ v: rowV[c]!, e: rowE[c] ?? null });
    }
    const outV = [0, 0, 0, 0];
    const outE: Array<number | null> = [null, null, null, null];
    /** @type {number[]} */
    const kill = [];
    let mergeScore = 0;
    let w = 0;
    let i = 0;
    while (i < items.length) {
      if (i < items.length - 1 && items[i]!.v === items[i + 1]!.v) {
        const merged = items[i]!.v * 2;
        outV[w] = merged;
        mergeScore += merged;
        outE[w] = items[i]!.e;
        if (items[i + 1]!.e != null) kill.push(/** @type {number} */ (items[i + 1]!.e));
        w += 1;
        i += 2;
      } else {
        outV[w] = items[i]!.v;
        outE[w] = items[i]!.e;
        w += 1;
        i += 1;
      }
    }
    return { outV, outE, kill, mergeScore };
  }

  /**
   * Pure value-grid move (for “any move left?” checks).
   * @param {number[][]} values Current value grid.
   * @param {'left'|'right'|'up'|'down'} dir Move direction.
   * @returns {{ nv: number[][], mergeScore: number }} Next value grid and merge score.
   */
  _applyValuesMove(values: number[][], dir: MoveDir) {
    /** @type {number[][]} */
    const nv = Array.from({ length: 4 }, () => [0, 0, 0, 0]);
    let mergeScore = 0;
    if (dir === 'left') {
      for (let r = 0; r < 4; r++) {
        const { outV, mergeScore: ms } = slideRowLeftValues(values[r]!);
        nv[r] = outV;
        mergeScore += ms;
      }
    } else if (dir === 'right') {
      for (let r = 0; r < 4; r++) {
        const rv = [...values[r]!].reverse();
        const { outV, mergeScore: ms } = slideRowLeftValues(rv);
        nv[r] = outV.reverse();
        mergeScore += ms;
      }
    } else if (dir === 'up') {
      for (let c = 0; c < 4; c++) {
        const colV = [values[0]![c]!, values[1]![c]!, values[2]![c]!, values[3]![c]!];
        const { outV, mergeScore: ms } = slideRowLeftValues(colV);
        mergeScore += ms;
        for (let r = 0; r < 4; r++) nv[r]![c] = outV[r]!;
      }
    } else if (dir === 'down') {
      for (let c = 0; c < 4; c++) {
        const colV = [values[0]![c]!, values[1]![c]!, values[2]![c]!, values[3]![c]!].reverse();
        const { outV, mergeScore: ms } = slideRowLeftValues(colV);
        const ov = outV.reverse();
        for (let r = 0; r < 4; r++) nv[r]![c] = ov[r]!;
        mergeScore += ms;
      }
    }
    return { nv, mergeScore };
  }

  /**
   * Checks whether at least one valid move exists from a value grid.
   *
   * @param {number[][]} values Value grid snapshot.
   * @returns {boolean} True when any move changes the grid.
   */
  _canMoveFrom(values: number[][]) {
    const dirs: Array<'left' | 'right' | 'up' | 'down'> = ['left', 'right', 'up', 'down'];
    for (const dir of dirs) {
      const { nv } = this._applyValuesMove(values, dir);
      if (this._gridSignatureOf(nv) !== this._gridSignatureOf(values)) return true;
    }
    return false;
  }

  /**
   * Checks if any tile has reached the configured win value.
   *
   * @returns {boolean} True when win threshold is reached.
   */
  _hasReachedWin() {
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (this._values[r][c] >= this.winValue) return true;
      }
    }
    return false;
  }

  /**
   * Produces a compact string signature for a value grid.
   *
   * @param {number[][]} values Value grid.
   * @returns {string} Deterministic grid signature.
   */
  _gridSignatureOf(values: number[][]) {
    return values.map((row) => row.join(',')).join('|');
  }

  /**
   * Removes and destroys the current end overlay if present.
   *
   * @returns {void} Nothing.
   */
  _hideEndOverlay() {
    const o = this._endOverlay;
    if (!o) return;
    o.parent?.removeChild(o);
    o.destroy({ children: true });
    this._endOverlay = null;
  }

  /**
   * Shows win/lose overlay on the UI layer.
   *
   * @param {'win' | 'lose'} kind Overlay kind.
   * @returns {void} Nothing.
   */
  _showEndOverlay(kind: 'win' | 'lose') {
    const ui = this._uiRoot;
    if (!ui) return;
    this._hideEndOverlay();
    const w = this._layoutW;
    const h = this._layoutH;
    const root = new Container();
    root.zIndex = 200;
    root.sortableChildren = true;
    root.eventMode = 'static';
    root.cursor = 'pointer';

    const dim = new Graphics();
    dim.rect(0, 0, w, h);
    dim.fill({ color: 0x334155, alpha: 0.5 });
    dim.eventMode = 'static';
    dim.zIndex = 0;

    const cardW = Math.min(440, w - 48);
    const cardH = 200;
    const card = new Container();
    card.position.set((w - cardW) / 2, (h - cardH) / 2);
    card.zIndex = 1;
    card.sortableChildren = true;
    addGamePanelLayers(card, cardW, cardH, 20, 0);

    const headline =
      kind === 'win'
        ? 'You reached the goal!'
        : 'Game over';
    const line2 =
      kind === 'win'
        ? `You reached ${this.winValue} — goal complete`
        : 'No moves left — try again';

    const title = new Text({
      text: headline,
      style: {
        ...UI_FONT,
        fill: kind === 'win' ? 0xd97706 : 0xdb2777,
        fontSize: 28,
        fontWeight: '800',
        letterSpacing: 0.5,
        dropShadow: {
          alpha: 0.3,
          blur: 6,
          color: 0x94a3b8,
          distance: 1,
          angle: Math.PI / 2,
        },
      },
    });
    title.anchor.set(0.5, 0);
    title.position.set(cardW / 2, 28);
    title.zIndex = 10;

    const sub = new Text({
      text: line2,
      style: {
        ...UI_FONT,
        fill: 0x475569,
        fontSize: 16,
        fontWeight: '600',
        align: 'center',
        wordWrap: true,
        wordWrapWidth: cardW - 40,
        dropShadow: {
          alpha: 0.2,
          blur: 2,
          color: 0xe2e8f0,
          distance: 1,
          angle: Math.PI / 2,
        },
      },
    });
    sub.anchor.set(0.5, 0);
    sub.position.set(cardW / 2, 82);
    sub.zIndex = 10;

    const hint = new Text({
      text: 'Tap / click to play again',
      style: {
        ...UI_FONT,
        fill: 0x0e7490,
        fontSize: 14,
        fontWeight: '600',
        dropShadow: {
          alpha: 0.25,
          blur: 2,
          color: 0x94a3b8,
          distance: 1,
          angle: Math.PI / 2,
        },
      },
    });
    hint.anchor.set(0.5, 0);
    hint.position.set(cardW / 2, 148);
    hint.zIndex = 10;

    card.addChild(title, sub, hint);
    root.addChild(dim, card);
    root.on('pointertap', () => this._restartGame());
    ui.addChild(root);
    this._endOverlay = root;
    this._syncPauseButtonState();
  }

  _restartGame() {
    const world = this._world;
    if (!world || !this.enabled) return;
    gsap.globalTimeline.resume();
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const id = this._entityAt[r][c];
        if (id == null) continue;
        const tr = world.getComponent(id, COMPONENT_TRANSFORM);
        if (tr) gsap.killTweensOf(tr);
      }
    }
    this._paused = false;
    if (this._pauseOverlayRoot) this._pauseOverlayRoot.visible = false;
    this._hideEndOverlay();
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const id = this._entityAt[r][c];
        if (id != null) {
          this._removeLabel(id);
          world.destroyEntity(id);
        }
      }
    }
    this._score = 0;
    this._playState = 'playing';
    this._resetGrid();
    this._spawnTwoTwos();
    this._syncAllLabels();
    this._updateHud();
    this._syncPauseButtonState();
  }

  /**
   * Applies one move to values/entities in the specified direction.
   *
   * @param {'left'|'right'|'up'|'down'} dir Move direction.
   * @returns {void} Nothing.
   */
  _applyMove(dir: MoveDir) {
    const world = this._world;
    if (!world || this._playState !== 'playing' || this._paused) return;

    const before = this._gridSignature();
    /** @type {number[][]} */
    const nv = Array.from({ length: 4 }, () => [0, 0, 0, 0]);
    const ne: Array<Array<number | null>> = Array.from({ length: 4 }, () => [null, null, null, null]);
    /** @type {number[]} */
    const toKill = [];
    let moveMergeScore = 0;

    if (dir === 'left') {
      for (let r = 0; r < 4; r++) {
        const { outV, outE, kill, mergeScore } = this._slideRowLeft(this._values[r], this._entityAt[r]);
        nv[r] = outV;
        ne[r] = outE;
        moveMergeScore += mergeScore;
        toKill.push(...kill);
      }
    } else if (dir === 'right') {
      for (let r = 0; r < 4; r++) {
        const rv = [...this._values[r]].reverse();
        const re = [...this._entityAt[r]].reverse();
        const { outV, outE, kill, mergeScore } = this._slideRowLeft(rv, re);
        nv[r] = outV.reverse();
        ne[r] = outE.reverse();
        moveMergeScore += mergeScore;
        toKill.push(...kill);
      }
    } else if (dir === 'up') {
      for (let c = 0; c < 4; c++) {
        const colV = [this._values[0][c], this._values[1][c], this._values[2][c], this._values[3][c]];
        const colE = [this._entityAt[0][c], this._entityAt[1][c], this._entityAt[2][c], this._entityAt[3][c]];
        const { outV, outE, kill, mergeScore } = this._slideRowLeft(colV, colE);
        moveMergeScore += mergeScore;
        for (let r = 0; r < 4; r++) {
          nv[r]![c] = outV[r]!;
          ne[r]![c] = outE[r]!;
        }
        toKill.push(...kill);
      }
    } else if (dir === 'down') {
      for (let c = 0; c < 4; c++) {
        const colV = [this._values[0][c], this._values[1][c], this._values[2][c], this._values[3][c]].reverse();
        const colE = [this._entityAt[0][c], this._entityAt[1][c], this._entityAt[2][c], this._entityAt[3][c]].reverse();
        const { outV, outE, kill, mergeScore } = this._slideRowLeft(colV, colE);
        moveMergeScore += mergeScore;
        const ov = outV.reverse();
        const oe = outE.reverse();
        for (let r = 0; r < 4; r++) {
          nv[r]![c] = ov[r]!;
          ne[r]![c] = oe[r]!;
        }
        toKill.push(...kill);
      }
    }

    const after = nv.map((row) => row.join(',')).join('|');
    if (after === before) return false;

    this._score += moveMergeScore;

    this._values = nv;
    this._entityAt = ne;

    for (const eid of toKill) {
      if (eid != null) {
        this._removeLabel(eid);
        world.destroyEntity(eid);
      }
    }

    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const eid = this._entityAt[r][c];
        const v = this._values[r][c];
        if (eid != null) {
          const iv = world.getComponent(eid, COMPONENT_INSTANCE_VARIABLES);
          if (iv?.set) iv.set('value', v);
          this._attachLabel(eid, v);
        }
      }
    }

    const tweens = [];
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const eid = this._entityAt[r][c];
        if (eid == null) continue;
        const tr = world.getComponent(eid, COMPONENT_TRANSFORM);
        if (!tr) continue;
        const { x, y } = this.cellCenter(c, r);
        if (tr.x !== x || tr.y !== y) {
          tweens.push(
            new Promise((resolve) => {
              gsap.to(tr, {
                x,
                y,
                duration: this.slideDuration,
                ease: this.slideEase,
                // Keep tile visuals pixel-snapped during motion to avoid perceived corner-radius morphing.
                onUpdate: () => {
                  tr.x = Math.round(tr.x);
                  tr.y = Math.round(tr.y);
                },
                onComplete: resolve,
              });
            }),
          );
        }
      }
    }

    const afterMove = () => {
      this._spawnRandomTile();
      this._syncAllLabels();
      this._updateHud();
      this._animating = false;

      if (this._playState !== 'playing') return;

      if (this._hasReachedWin()) {
        this._playState = 'won';
        this._showEndOverlay('win');
        return;
      }
      if (!this._canMoveFrom(this._values)) {
        this._playState = 'lost';
        this._showEndOverlay('lose');
      }
    };

    if (tweens.length) {
      this._animating = true;
      Promise.all(tweens).then(afterMove);
    } else {
      afterMove();
    }

    return true;
  }

  _gridSignature() {
    return this._gridSignatureOf(this._values);
  }

  _spawnRandomTile() {
    const empty = [];
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (this._values[r][c] === 0) empty.push({ r, c });
      }
    }
    if (!empty.length) return;
    const pick = empty[Math.floor(Math.random() * empty.length)];
    const v = Math.random() < 0.9 ? 2 : 4;
    this._spawnTileAt(pick!.r, pick!.c, v);
  }

  /**
   * Processes input and executes queued moves each frame.
   *
   * @param {number} _dt Delta time in seconds.
   * @param {import('../ECS/World.js').World} world ECS world.
   * @returns {void} Nothing.
   */
  update(_dt: number, world: World) {
    if (!this.enabled || !this._inputCoordinator) return;

    const kb = this._inputCoordinator.keyboard;
    const rDown = kb?.isDown('KeyR') ?? false;
    if (rDown && !this._prevKeyR && (this._playState === 'won' || this._playState === 'lost')) {
      this._restartGame();
    }
    this._prevKeyR = rDown;

    if (this._paused) return;

    if (this._animating || this._playState !== 'playing') return;

    const dirs: MoveDir[] = ['up', 'down', 'left', 'right'];
    for (const d of dirs) {
      const down = this._inputCoordinator.isActionDown(d);
      if (down && !this._prevKey[d]) {
        this._queueMove(d);
      }
      this._prevKey[d] = down;
    }

    if (this._moveScheduled && this._pendingDir) {
      const dir = this._pendingDir;
      this._moveScheduled = false;
      this._pendingDir = null;
      this._applyMove(dir);
    }
  }
}
