import { Container } from 'pixi.js';

/**
 * Stage graph: `world` is translated by the camera; `screenUi` stays fixed (no parallax).
 * @returns {{ worldLayer: Container, uiLayer: Container }}
 */
export function createSceneLayers() {
  const worldLayer = new Container();
  worldLayer.label = 'world';
  worldLayer.sortableChildren = true;
  worldLayer.zIndex = 0;

  const uiLayer = new Container();
  uiLayer.label = 'screenUi';
  uiLayer.sortableChildren = true;
  uiLayer.zIndex = 10;
  // Allow interactive HUD (buttons, pause menu) on children with eventMode 'static'.
  uiLayer.eventMode = 'passive';

  return { worldLayer, uiLayer };
}
