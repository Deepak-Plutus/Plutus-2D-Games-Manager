import { Container } from 'pixi.js'

export function createSceneLayers (): { worldLayer: Container; uiLayer: Container } {
  const worldLayer = new Container()
  worldLayer.label = 'world'
  worldLayer.sortableChildren = true
  worldLayer.zIndex = 0

  const uiLayer = new Container()
  uiLayer.label = 'screenUi'
  uiLayer.sortableChildren = true
  uiLayer.zIndex = 10
  uiLayer.eventMode = 'passive'

  return { worldLayer, uiLayer }
}
