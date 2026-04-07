import { BehaviorBootstrap } from '../Behaviors/index.js'
import { BehaviorRegistry } from '../Behaviors/BehaviorRegistry.js'
import { World } from '../ECS/World.js'
import { EntityBuilder } from '../Entities/EntityBuilder.js'
import { BehaviorSystem } from '../Systems/BehaviorSystem.js'
import { DisplaySyncSystem } from '../Systems/DisplaySyncSystem.js'
import { PhysicsSystem } from '../Systems/PhysicsSystem.js'
import { registerGameSystemFactories } from '../games/registerGameSystems.js'
import { SystemFactoryRegistry } from '../bootstrap/SystemFactoryRegistry.js'
import { BootstrapContributionRegistry } from '../bootstrap/BootstrapContributionRegistry.js'
import { AppHost } from './AppHost.js'
import { AssetLoader } from './AssetLoader.js'
import { AssetRegistry } from './AssetRegistry.js'
import { BehaviorEventHub } from './BehaviorEventHub.js'
import { ConfigLoader } from './ConfigLoader.js'
import { ConfigResolver } from './ConfigResolver.js'
import { InputCoordinator, mergeInputRequirements } from './InputCoordinator.js'
import { InputEventHub } from './InputEventHub.js'
import { KeyboardInput } from './KeyboardInput.js'
import { LoadingScreen } from './LoadingScreen.js'
import { PointerInput } from './PointerInput.js'
import { createSceneLayers } from './SceneLayers.js'
import { SystemRegistry } from './SystemRegistry.js'
import type { GameConfig } from './GameConfig.js'

type GameSystemEntry = { name: string; system: BaseSystemLike }
type BaseSystemLike = {
  enabled: boolean
  configure?: (options: Record<string, unknown>) => void
}
type GameSystemLike = GameSystemEntry['system'] & {
  setRuntime?: (w: number, h: number, coordinator: InputCoordinator, hub: InputEventHub) => void
  setScreenUi?: (uiLayer: unknown, w: number, h: number) => void
  setFreezeCallback?: (cb: (frozen: boolean) => void) => void
  bootstrap?: (
    world: World,
    registry: AssetRegistry,
    worldLayer: unknown,
    entityBuilder: EntityBuilder,
    config: GameConfig
  ) => void
}

/**
 * Orchestrates app bootstrap, config loading, systems, input, and main loop.
 */
export class GameManager {
  container: HTMLElement
  host: AppHost
  world: World
  systems: SystemRegistry
  behaviorRegistry: BehaviorRegistry
  assetLoader: AssetLoader
  input: KeyboardInput
  pointer: PointerInput
  inputHub: InputEventHub
  inputCoordinator: InputCoordinator
  behaviorEvents: BehaviorEventHub | null
  entityBuilder: EntityBuilder
  displaySync: DisplaySyncSystem
  behaviorSystem: BehaviorSystem
  gameSystems: GameSystemEntry[]
  bootstrapContributions: BootstrapContributionRegistry

  /**
   * @param {HTMLElement} container Host element for the Pixi canvas.
   */
  constructor (container: HTMLElement) {
    this.container = container
    this.host = new AppHost(container)
    this.world = new World()
    this.systems = new SystemRegistry()
    this.behaviorRegistry = new BehaviorRegistry()
    this.assetLoader = new AssetLoader()
    this.input = new KeyboardInput()
    this.pointer = new PointerInput()
    this.inputHub = new InputEventHub()
    this.inputCoordinator = new InputCoordinator(this.inputHub, this.input, this.pointer)
    this.behaviorEvents = null
    BehaviorBootstrap.registerAll(this.behaviorRegistry)
    this.entityBuilder = new EntityBuilder(this.behaviorRegistry)
    this.displaySync = new DisplaySyncSystem()
    this.behaviorSystem = new BehaviorSystem(this.behaviorRegistry)
    this.gameSystems = []
    this.bootstrapContributions = new BootstrapContributionRegistry()
  }

  /**
   * Boots the game runtime from URL config.
   *
   * @returns {Promise<void>} Resolves when startup completes.
   */
  async start (): Promise<void> {
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

    let text: string
    try {
      loading.setProgress(2, 'Loading config...')
      text = await ConfigLoader.fetch(configUrl)
      loading.setProgress(12, 'Parsing config...')
    } catch (e) {
      loading.showError(e instanceof Error ? e.message : String(e))
      return
    }

    let config: GameConfig
    try {
      config = ConfigLoader.parse(text)
    } catch (e) {
      loading.showError(e instanceof Error ? e.message : String(e))
      return
    }
    const physics = new PhysicsSystem()
    const factoryRegistry = new SystemFactoryRegistry()
    factoryRegistry.register({
      name: 'behavior',
      create: () => this.behaviorSystem,
      phase: 'pre'
    })
    factoryRegistry.register({
      name: 'displaySync',
      create: () => this.displaySync,
      phase: 'post',
      after: ['behavior', 'physics']
    })
    factoryRegistry.register({
      name: 'physics',
      create: () => physics,
      phase: 'gameplay',
      after: ['behavior']
    })
    registerGameSystemFactories(factoryRegistry)

    const resolvedSystems = factoryRegistry.resolveForConfig(config, config.systemsOrder ?? [])
    for (const { name, system } of resolvedSystems) this.systems.register(name, system as never)
    this.gameSystems = resolvedSystems.filter(
      ({ name }) => name !== 'behavior' && name !== 'displaySync' && name !== 'physics'
    )

    const bc = typeof config.broadcastChannel === 'string' ? String(config.broadcastChannel) : null
    this.behaviorEvents = new BehaviorEventHub(bc)

    const appBlock = (config.app ?? {}) as Record<string, unknown>
    loading.setProgress(18, 'Applying app settings...')
    this.host.applyAppConfig(appBlock)
    loading.resize(this.host.width, this.host.height)
    const isFullscreenConfig =
      appBlock.fullscreen === true ||
      (typeof appBlock.width === 'string' &&
        typeof appBlock.height === 'string' &&
        String(appBlock.width).trim().toLowerCase() === 'fullscreen' &&
        String(appBlock.height).trim().toLowerCase() === 'fullscreen')

    let detachLoadingResize: (() => void) | null = null
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
    ;(app.canvas.style as CSSStyleDeclaration & { webkitTouchCallout?: string }).webkitTouchCallout = 'none'
    app.canvas.addEventListener('contextmenu', e => e.preventDefault())
    const preventGesture = (e: Event) => e.preventDefault()
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

    this.systems.applyConfig((config.systems ?? {}) as Record<string, Record<string, unknown>>)
    for (const { name, system } of this.gameSystems) {
      const merged = {
        ...((config.systems as Record<string, unknown> | undefined)?.[name] as Record<string, unknown> ?? {}),
        ...((config[name] as Record<string, unknown> | undefined) ?? {})
      }
      if (Object.keys(merged).length && typeof system.configure === 'function') {
        system.configure(merged)
      }
    }

    const inputBlock = (config.input ?? {}) as Record<string, unknown>
    const inputReq = mergeInputRequirements(this.systems.getMergedInputRequirements(true), inputBlock)
    this.inputCoordinator.configure(app.canvas, this.host.width, this.host.height, inputBlock, inputReq)

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
      const gs = system as GameSystemLike
      gs.setRuntime?.(this.host.width, this.host.height, this.inputCoordinator, this.inputHub)
      gs.setScreenUi?.(uiLayer, this.host.width, this.host.height)
      gs.setFreezeCallback?.(frozen => {
        this.behaviorSystem.enabled = !frozen
      })
    }

    const registry = new AssetRegistry()
    try {
      await this.assetLoader.loadAll(config.assets as unknown[] ?? [], registry, (t, label) => {
        const pct = 20 + Math.round(t * 80)
        loading.setProgress(pct, label ?? 'Loading assets...')
      })
    } catch (e) {
      if (detachLoadingResize) detachLoadingResize()
      loading.showError(e instanceof Error ? e.message : String(e))
      return
    }

    loading.setProgress(100, 'Starting...')
    this.bootstrapContributions.run('beforeEntities', {
      config,
      world: this.world,
      entityBuilder: this.entityBuilder,
      registry,
      worldLayer,
      uiLayer,
      inputCoordinator: this.inputCoordinator,
      inputHub: this.inputHub
    })
    this.systems.startLifecycle()
    this.entityBuilder.spawnFromConfig(this.world, config.entities as unknown[] ?? [], registry, worldLayer, {
      objectTypes: (config.objectTypes as unknown[] | undefined) ?? [],
      layers: (config.layers as unknown[] | undefined) ?? []
    })
    this.bootstrapContributions.run('afterEntities', {
      config,
      world: this.world,
      entityBuilder: this.entityBuilder,
      registry,
      worldLayer,
      uiLayer,
      inputCoordinator: this.inputCoordinator,
      inputHub: this.inputHub
    })
    for (const { system } of this.gameSystems) {
      const gs = system as GameSystemLike
      if (gs.enabled && typeof gs.bootstrap === 'function') {
        gs.bootstrap(this.world, registry, worldLayer, this.entityBuilder, config)
      }
    }

    this.bootstrapContributions.run('afterSystemsReady', {
      config,
      world: this.world,
      entityBuilder: this.entityBuilder,
      registry,
      worldLayer,
      uiLayer,
      inputCoordinator: this.inputCoordinator,
      inputHub: this.inputHub
    })

    if (detachLoadingResize) detachLoadingResize()
    loading.hide()
    if (isFullscreenConfig && typeof window !== 'undefined') {
      window.addEventListener(
        'resize',
        () => {
          this.host.applyAppConfig(appBlock)
          this.pointer.setLayoutSize(this.host.width, this.host.height)
          this.inputCoordinator.configure(app.canvas, this.host.width, this.host.height, inputBlock, inputReq)
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
            const gs = system as GameSystemLike
            gs.setRuntime?.(this.host.width, this.host.height, this.inputCoordinator, this.inputHub)
            gs.setScreenUi?.(uiLayer, this.host.width, this.host.height)
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
