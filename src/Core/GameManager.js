import { BehaviorBootstrap } from '../Behaviors/index.js'
import { BehaviorRegistry } from '../Behaviors/BehaviorRegistry.js'
import { World } from '../ECS/World.js'
import { EntityBuilder } from '../Entities/EntityBuilder.js'
import { DisplaySyncSystem } from '../Systems/DisplaySyncSystem.js'
import { BehaviorSystem } from '../Systems/BehaviorSystem.js'
import { PhysicsSystem } from '../Systems/PhysicsSystem.js'
import { createGameSystemsForConfig } from '../games/registerGameSystems.js'
import { AppHost } from './AppHost.js'
import { AssetLoader } from './AssetLoader.js'
import { AssetRegistry } from './AssetRegistry.js'
import { BehaviorEventHub } from './BehaviorEventHub.js'
import { ConfigLoader } from './ConfigLoader.js'
import { ConfigResolver } from './ConfigResolver.js'
import { InputCoordinator, mergeInputRequirements } from './InputCoordinator.js'
import { InputEventHub } from './InputEventHub.js'
import { KeyboardInput } from './KeyboardInput.js'
import { PointerInput } from './PointerInput.js'
import { LoadingScreen } from './LoadingScreen.js'
import { createSceneLayers } from './SceneLayers.js'
import { SystemRegistry } from './SystemRegistry.js'

/**
 * Orchestrates loading overlay → config → assets → ECS → game loop.
 */
export class GameManager {
  /**
   * @param {HTMLElement} container
   */
  constructor (container) {
    this.container = container
    this.host = new AppHost(container)
    this.world = new World()
    this.systems = new SystemRegistry()
    this.behaviorRegistry = new BehaviorRegistry()
    this.assetLoader = new AssetLoader()
    this.input = new KeyboardInput()
    this.pointer = new PointerInput()
    this.inputHub = new InputEventHub()
    this.inputCoordinator = new InputCoordinator(
      this.inputHub,
      this.input,
      this.pointer
    )
    /** @type {BehaviorEventHub | null} */
    this.behaviorEvents = null

    BehaviorBootstrap.registerAll(this.behaviorRegistry)

    this.entityBuilder = new EntityBuilder(this.behaviorRegistry)

    this.displaySync = new DisplaySyncSystem()
    this.behaviorSystem = new BehaviorSystem(this.behaviorRegistry)
    const physics = new PhysicsSystem()
    this.gameSystems = []

    this.systems.register('behavior', this.behaviorSystem)
    this.systems.register('displaySync', this.displaySync)
    this.systems.register('physics', physics)
  }

  async start () {
    await this.host.init()

    const app = this.host.app
    if (!app) throw new Error('Pixi Application failed to initialize')

    this.input.attach()

    const { worldLayer, uiLayer } = createSceneLayers()
    app.stage.addChild(worldLayer)
    app.stage.addChild(uiLayer)

    const loading = new LoadingScreen(this.host.width, this.host.height)
    loading.setProgress(0, 'Loading...')
    app.stage.addChild(loading)

    const configUrl = ConfigResolver.resolveUrlFromQuery()

    let text
    try {
      loading.setProgress(2, 'Loading config...')
      text = await ConfigLoader.fetch(configUrl)
      loading.setProgress(12, 'Parsing config...')
    } catch (e) {
      loading.showError(e instanceof Error ? e.message : String(e))
      return
    }

    let config
    try {
      config = ConfigLoader.parse(text)
    } catch (e) {
      loading.showError(e instanceof Error ? e.message : String(e))
      return
    }
    this.gameSystems = createGameSystemsForConfig(
      /** @type {Record<string, unknown>} */ (config)
    )
    for (const { name, system } of this.gameSystems) {
      this.systems.register(name, system)
    }

    const bc =
      typeof (
        /** @type {Record<string, unknown>} */ (config).broadcastChannel
      ) === 'string'
        ? String(
            /** @type {Record<string, unknown>} */ (config).broadcastChannel
          )
        : null
    this.behaviorEvents = new BehaviorEventHub(bc)

    const appBlock = /** @type {Record<string, unknown>} */ (config.app ?? {})
    loading.setProgress(18, 'Applying app settings...')
    this.host.applyAppConfig(appBlock)
    loading.resize(this.host.width, this.host.height)
    const isFullscreenConfig =
      appBlock.fullscreen === true ||
      (typeof appBlock.width === 'string' &&
        typeof appBlock.height === 'string' &&
        String(appBlock.width).trim().toLowerCase() === 'fullscreen' &&
        String(appBlock.height).trim().toLowerCase() === 'fullscreen')
    /** @type {(() => void) | null} */
    let detachLoadingResize = null
    if (isFullscreenConfig && typeof window !== 'undefined') {
      const onLoadingResize = () => {
        this.host.applyAppConfig(appBlock)
        loading.resize(this.host.width, this.host.height)
      }
      window.addEventListener('resize', onLoadingResize, { passive: true })
      detachLoadingResize = () => window.removeEventListener('resize', onLoadingResize)
    }

    this.pointer.attach(app.canvas, this.host.width, this.host.height)
    app.canvas.style.touchAction = 'none'
    app.canvas.style.webkitUserSelect = 'none'
    app.canvas.style.userSelect = 'none'
    app.canvas.style.webkitTouchCallout = 'none'
    app.canvas.addEventListener('contextmenu', e => e.preventDefault())
    const preventGesture = e => e.preventDefault()
    app.canvas.addEventListener('gesturestart', preventGesture)
    app.canvas.addEventListener('gesturechange', preventGesture)
    app.canvas.addEventListener('gestureend', preventGesture)
    app.canvas.addEventListener(
      'touchstart',
      e => {
        if (e.touches.length > 1) e.preventDefault()
      },
      { passive: false }
    )

    this.systems.applyConfig(
      /** @type {Record<string, Record<string, unknown>>} */ (
        config.systems ?? {}
      )
    )
    for (const { name, system } of this.gameSystems) {
      const merged = {
        .../** @type {Record<string, unknown>} */ (
          /** @type {Record<string, unknown>} */ ((config).systems ?? {})[
            name
          ] ?? {}
        ),
        .../** @type {Record<string, unknown>} */ (
          /** @type {Record<string, unknown>} */ (config)[name] ?? {}
        )
      }
      if (
        Object.keys(merged).length &&
        typeof system.configure === 'function'
      ) {
        system.configure(merged)
      }
    }

    const inputBlock = /** @type {Record<string, unknown>} */ (
      /** @type {Record<string, unknown>} */ (config).input ?? {}
    )
    const inputReq = mergeInputRequirements(
      this.systems.getMergedInputRequirements(true),
      inputBlock
    )
    this.inputCoordinator.configure(
      app.canvas,
      this.host.width,
      this.host.height,
      inputBlock,
      inputReq
    )

    this.behaviorSystem.setRuntime(
      this.host.width,
      this.host.height,
      this.input,
      this.pointer,
      this.behaviorEvents,
      worldLayer,
      this.inputHub,
      this.inputCoordinator
    )

    this.world.setDisplayOrphanRoot(worldLayer)
    this.displaySync.setStage(worldLayer)
    for (const { system } of this.gameSystems) {
      if (typeof system.setRuntime === 'function') {
        system.setRuntime(
          this.host.width,
          this.host.height,
          this.inputCoordinator,
          this.inputHub
        )
      }
      if (typeof system.setScreenUi === 'function') {
        system.setScreenUi(uiLayer, this.host.width, this.host.height)
      }
      if (typeof system.setFreezeCallback === 'function') {
        system.setFreezeCallback(frozen => {
          this.behaviorSystem.enabled = !frozen
        })
      }
    }

    const registry = new AssetRegistry()
    try {
      await this.assetLoader.loadAll(
        config.assets ?? [],
        registry,
        (t, label) => {
          const pct = 20 + Math.round(t * 80)
          loading.setProgress(pct, label ?? 'Loading assets...')
        }
      )
    } catch (e) {
      if (detachLoadingResize) detachLoadingResize()
      loading.showError(e instanceof Error ? e.message : String(e))
      return
    }

    loading.setProgress(100, 'Starting...')

    this.systems.startLifecycle()

    this.entityBuilder.spawnFromConfig(
      this.world,
      /** @type {unknown[]} */ (config.entities ?? []),
      registry,
      worldLayer,
      {
        objectTypes: /** @type {unknown[]} */ (
          /** @type {Record<string, unknown>} */ (config).objectTypes ?? []
        ),
        layers: /** @type {unknown[]} */ (
          /** @type {Record<string, unknown>} */ (config).layers ?? []
        )
      }
    )

    for (const { system } of this.gameSystems) {
      if (system.enabled && typeof system.bootstrap === 'function') {
        system.bootstrap(
          this.world,
          registry,
          worldLayer,
          this.entityBuilder,
          config
        )
      }
    }

    if (detachLoadingResize) detachLoadingResize()
    loading.hide()
    if (isFullscreenConfig && typeof window !== 'undefined') {
      window.addEventListener(
        'resize',
        () => {
          this.host.applyAppConfig(appBlock)
          this.pointer.setLayoutSize(this.host.width, this.host.height)
          this.inputCoordinator.configure(
            app.canvas,
            this.host.width,
            this.host.height,
            inputBlock,
            inputReq
          )
          this.behaviorSystem.setRuntime(
            this.host.width,
            this.host.height,
            this.input,
            this.pointer,
            this.behaviorEvents,
            worldLayer,
            this.inputHub,
            this.inputCoordinator
          )
          for (const { system } of this.gameSystems) {
            if (typeof system.setRuntime === 'function') {
              system.setRuntime(
                this.host.width,
                this.host.height,
                this.inputCoordinator,
                this.inputHub
              )
            }
            if (typeof system.setScreenUi === 'function') {
              system.setScreenUi(uiLayer, this.host.width, this.host.height)
            }
          }
        },
        { passive: true }
      )
    }

    app.ticker.add(() => {
      const dt = app.ticker.deltaMS / 1000
      this.inputCoordinator.update(dt)
      this.systems.update(dt, this.world)
    })
  }
}
