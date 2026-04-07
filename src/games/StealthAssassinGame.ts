import { Container, Graphics, Rectangle, Sprite, Text, Texture } from 'pixi.js'
import { BaseSystem } from '../Systems/BaseSystem.js'
import { aabbOverlap, buildColliderList } from '../Core/CollisionService.js'
import {
  COMPONENT_CAMERA,
  COMPONENT_DISPLAY,
  COMPONENT_INSTANCE_VARIABLES,
  COMPONENT_META,
  COMPONENT_TRANSFORM
} from '../Components/index.js'

interface TransformLike {
  x: number
  y: number
  rotation: number
  scaleX: number
  scaleY: number
}

interface PointLike {
  x: number
  y: number
}

interface ColliderLike {
  entityId: number
  kind: string
  left: number
  right: number
  top: number
  bottom: number
}

interface WorldLike {
  getComponent: (entityId: number, key: string) => any
  setComponent: (entityId: number, key: string, value: unknown) => void
  destroyEntity: (entityId: number) => void
  findEntityIdByMetaName: (metaName: string) => number | null
  findEntityIdsByTag: (tag: string) => number[]
  findEntityIdsByObjectType: (objectType: string) => number[]
  entities: Map<number, unknown>
}

interface PointerPayload {
  detail?: {
    x?: number
    y?: number
    button?: number
    pointerId?: string | number
    pointerType?: string
  }
}

interface GuardStateLike {
  [key: string]: unknown
  mode?: string
  heading?: number
  guardPath?: PointLike[]
  guardPathIndex?: number
  investigatePhase?: string
  lastMoveX?: number
  lastMoveY?: number
}

interface LayoutRect {
  x: number
  y: number
  w?: number
  h?: number
  s?: number
}

interface ProceduralLayoutLike {
  worldW: number
  worldH: number
  roomSize: number
  walls: Array<Required<Pick<LayoutRect, 'x' | 'y' | 'w' | 'h'>>>
  doors: Array<Required<Pick<LayoutRect, 'x' | 'y' | 'w' | 'h'>>>
  finalExitDoor: Required<Pick<LayoutRect, 'x' | 'y' | 'w' | 'h'>> | null
  outsideGoal: PointLike | null
  cornerFillers: Array<Required<Pick<LayoutRect, 'x' | 'y' | 's'>>>
  containers: Array<Required<Pick<LayoutRect, 'x' | 'y' | 's'>>>
  player: PointLike
  guards: PointLike[]
}

interface WeaponOptionsLike {
  weaponTexture?: Texture | null
  weaponIndex?: number
  weaponCount?: number
}

/** UI text for this game: Bungee is loaded by this system at runtime. */
const BUNGEE_FONT = '"Bungee", cursive'
const STEALTH_CAMERA_ZOOM_DESKTOP = 0.82
const STEALTH_CAMERA_ZOOM_MOBILE = 0.7
const STEALTH_CAMERA_LEFT_BIAS_RATIO = 0.22

export class StealthAssassinGame extends BaseSystem {
  static inputRequirements = {
    keyboard: false,
    pointer: true,
    wheel: false,
    gamepad: false
  };
  [key: string]: any

  constructor () {
    super()
    this.playerMetaName = 'player'
    this.playerMoveSpeed = 190
    this.playerRadius = 14
    this.playerWallSafeDistance = 2
    this.playerEdgePreventionDistance = 85
    this.playerFacingAngleOffset = -Math.PI / 2
    this.playerInitialRotation = Math.PI
    this.playerTurnSmoothSpeed = 14
    this.enemyFacingAngleOffset = -Math.PI / 2
    this.enemyTurnSmoothSpeed = 10
    this.guardRadius = 15
    this.guardWallSafeDistance = 2
    this.doorSpawnChance = 0.22
    this.doorSpan = 68
    this.doorOpenDuration = 1.2
    this.cellSize = 28
    this.defaultVisionRange = 260
    this.defaultFovDeg = 70
    this.defaultPatrolSpeed = 64
    this.guardChaseSpeed = 88
    this.guardFireInterval = 0.45
    this.bulletSpeed = 620
    this.searchDurationMin = 3.0
    this.searchDurationMax = 4.0
    this.searchRotateSpeed = 3.1
    this.searchMoveSpeed = 34
    this.investigateMoveSpeed = 120
    this.patrolWaitDuration = 2.0
    this.patrolWaitScanSpeed = 2.0
    this.patrolTurnSpeed = 2.3
    this.detectHoldSec = 0.5
    this.shootRangeRatio = 0.5
    this.playerMaxHp = 100
    this.bulletDamage = 10
    this.pathCurveTension = 10
    this.killInvestigateRadius = 400
    this.killInvestigateDuration = 10
    this._viewW = 800
    this._viewH = 600
    this._inputCoordinator = null
    this._uiRoot = null
    this._hudRoot = null
    this._hudHealthValue = null
    this._hudTargetsValue = null
    this._hudKillsValue = null
    this._touchControlsEnabled = false
    this._touchPointerId = null
    this._touchJoyCenter = null
    this._touchMoveVec = { x: 0, y: 0 }
    this._touchMoveSmoothVec = { x: 0, y: 0 }
    this._touchJoyRadius = 90
    this._touchIdleSec = 0
    this._touchHintRoot = null
    this._touchHintCurve = null
    this._touchHintArrow = null
    this._touchHintText = null
    this._touchHintAnimT = 0
    this._bungeeReady = false
    this._overlay = null
    this._toastRoot = null
    this._toastTimer = 0
    this._tileGridGraphics = null
    this._pathGraphics = null
    this._pendingClick = null
    this._playerPath = []
    this._playerPathIndex = 0
    this._desiredGoal = null
    this._targetEnemyId = null
    this._lastTrackedEnemyPos = null
    this._targetRing = null
    this._retargetTick = 0
    this._isDirectMove = false
    this._lastPlayerPos = { x: 0, y: 0 }
    this._playerSkinApplied = false
    this._playerSkinMount = null
    this._playerInitialRotationApplied = false
    this._enemySkinAppliedIds = new Set()
    this._enemySkinMountById = new Map()
    this._weaponsTexture = null
    this._guardConeById = new Map()
    this._guardConeDistanceHistory = new Map()
    this._guardInvestigateRingById = new Map()
    this._patrolState = new Map()
    this._bulletEntityIds = new Set()
    this._worldFxRoot = null
    this._kills = 0
    this._playerHp = this.playerMaxHp
    this._gameOver = false
    this._won = false
    this._unsubPointer = null
    this._world = null
    this._registry = null
    this._stage = null
    this._entityBuilder = null
    this._spawnOpts = null
    this._proceduralMapReady = false
    this._doorIds = new Set()
    this._doorOpenUntilById = new Map()
    this._finalExitDoorId = null
    this._exitDoorUnlocked = false
    this._outsideGoal = null
    this._simTime = 0
    this._playerStuckTimer = 0
    this._playerLastMotionPos = null
  }

  configure (options: Record<string, unknown> = {}) {
    if (options.playerMetaName != null)
      this.playerMetaName = String(options.playerMetaName)
    if (options.playerMoveSpeed != null)
      this.playerMoveSpeed =
        Number(options.playerMoveSpeed) || this.playerMoveSpeed
    if (options.playerRadius != null)
      this.playerRadius = Number(options.playerRadius) || this.playerRadius
    if (options.playerWallSafeDistance != null)
      this.playerWallSafeDistance = Math.max(
        0,
        Number(options.playerWallSafeDistance) || this.playerWallSafeDistance
      )
    if (options.playerEdgePreventionDistance != null) {
      this.playerEdgePreventionDistance = Math.max(
        0,
        Number(options.playerEdgePreventionDistance) ||
          this.playerEdgePreventionDistance
      )
    }
    if (options.playerFacingAngleOffset != null)
      this.playerFacingAngleOffset = Number(options.playerFacingAngleOffset)
    if (options.playerInitialRotation != null)
      this.playerInitialRotation = Number(options.playerInitialRotation)
    if (options.playerTurnSmoothSpeed != null)
      this.playerTurnSmoothSpeed = Math.max(
        0.1,
        Number(options.playerTurnSmoothSpeed) || this.playerTurnSmoothSpeed
      )
    if (options.enemyFacingAngleOffset != null)
      this.enemyFacingAngleOffset = Number(options.enemyFacingAngleOffset)
    if (options.enemyTurnSmoothSpeed != null)
      this.enemyTurnSmoothSpeed = Math.max(
        0.1,
        Number(options.enemyTurnSmoothSpeed) || this.enemyTurnSmoothSpeed
      )
    if (options.cellSize != null)
      this.cellSize = Math.max(16, Number(options.cellSize) || this.cellSize)
    if (options.guardWallSafeDistance != null)
      this.guardWallSafeDistance = Math.max(
        0,
        Number(options.guardWallSafeDistance) || this.guardWallSafeDistance
      )
    if (options.doorSpawnChance != null)
      this.doorSpawnChance = Math.max(
        0,
        Math.min(1, Number(options.doorSpawnChance) || this.doorSpawnChance)
      )
    if (options.doorSpan != null)
      this.doorSpan = Math.max(28, Number(options.doorSpan) || this.doorSpan)
    if (options.doorOpenDuration != null)
      this.doorOpenDuration = Math.max(
        0.2,
        Number(options.doorOpenDuration) || this.doorOpenDuration
      )
    if (options.guardChaseSpeed != null)
      this.guardChaseSpeed =
        Number(options.guardChaseSpeed) || this.guardChaseSpeed
    if (options.guardFireInterval != null)
      this.guardFireInterval =
        Number(options.guardFireInterval) || this.guardFireInterval
    if (options.bulletSpeed != null)
      this.bulletSpeed = Number(options.bulletSpeed) || this.bulletSpeed
    if (options.searchDuration != null) {
      const v = Number(options.searchDuration)
      if (Number.isFinite(v) && v > 0) {
        this.searchDurationMin = v
        this.searchDurationMax = v
      }
    }
    if (options.searchDurationMin != null)
      this.searchDurationMin = Math.max(
        0.2,
        Number(options.searchDurationMin) || this.searchDurationMin
      )
    if (options.searchDurationMax != null)
      this.searchDurationMax = Math.max(
        this.searchDurationMin,
        Number(options.searchDurationMax) || this.searchDurationMax
      )
    if (options.searchRotateSpeed != null)
      this.searchRotateSpeed = Math.max(
        0.2,
        Number(options.searchRotateSpeed) || this.searchRotateSpeed
      )
    if (options.searchMoveSpeed != null)
      this.searchMoveSpeed = Math.max(
        0,
        Number(options.searchMoveSpeed) || this.searchMoveSpeed
      )
    if (options.investigateMoveSpeed != null)
      this.investigateMoveSpeed = Math.max(
        0,
        Number(options.investigateMoveSpeed) || this.investigateMoveSpeed
      )
    if (options.patrolWaitDuration != null)
      this.patrolWaitDuration = Math.max(
        0,
        Number(options.patrolWaitDuration) || this.patrolWaitDuration
      )
    if (options.patrolWaitScanSpeed != null)
      this.patrolWaitScanSpeed = Math.max(
        0.1,
        Number(options.patrolWaitScanSpeed) || this.patrolWaitScanSpeed
      )
    if (options.patrolTurnSpeed != null)
      this.patrolTurnSpeed = Math.max(
        0.1,
        Number(options.patrolTurnSpeed) || this.patrolTurnSpeed
      )
    if (options.detectHoldSec != null)
      this.detectHoldSec = Math.max(
        0,
        Number(options.detectHoldSec) || this.detectHoldSec
      )
    if (options.shootRangeRatio != null)
      this.shootRangeRatio = Math.max(
        0.05,
        Math.min(1, Number(options.shootRangeRatio) || this.shootRangeRatio)
      )
    if (options.playerMaxHp != null)
      this.playerMaxHp = Math.max(
        1,
        Number(options.playerMaxHp) || this.playerMaxHp
      )
    if (options.bulletDamage != null)
      this.bulletDamage = Math.max(
        1,
        Number(options.bulletDamage) || this.bulletDamage
      )
    if (options.pathCurveTension != null)
      this.pathCurveTension = Math.max(
        4,
        Number(options.pathCurveTension) || this.pathCurveTension
      )
    if (options.killInvestigateRadius != null)
      this.killInvestigateRadius = Math.max(
        0,
        Number(options.killInvestigateRadius) || this.killInvestigateRadius
      )
    if (options.killInvestigateDuration != null)
      this.killInvestigateDuration = Math.max(
        0.5,
        Number(options.killInvestigateDuration) || this.killInvestigateDuration
      )
  }

  setRuntime (w: number, h: number, inputCoordinator: unknown) {
    this._viewW = Number(w) || this._viewW
    this._viewH = Number(h) || this._viewH
    this._inputCoordinator = inputCoordinator
  }

  _isMobileLayout () {
    const shortSide = Math.min(this._viewW, this._viewH)
    return shortSide <= 820 || this._viewW <= 980
  }

  _hasTouchInput () {
    if (typeof navigator === 'undefined') return false
    return Number(navigator.maxTouchPoints ?? 0) > 0
  }

  _ensureBungeeFontLoaded () {
    if (typeof document === 'undefined') return
    if (document.querySelector('link[data-font="bungee-stealth-assassin"]')) return

    const preconnectApi = document.createElement('link')
    preconnectApi.rel = 'preconnect'
    preconnectApi.href = 'https://fonts.googleapis.com'
    preconnectApi.setAttribute('data-font', 'bungee-stealth-assassin')
    document.head.appendChild(preconnectApi)

    const preconnectGstatic = document.createElement('link')
    preconnectGstatic.rel = 'preconnect'
    preconnectGstatic.href = 'https://fonts.gstatic.com'
    preconnectGstatic.crossOrigin = 'anonymous'
    preconnectGstatic.setAttribute('data-font', 'bungee-stealth-assassin')
    document.head.appendChild(preconnectGstatic)

    const css = document.createElement('link')
    css.rel = 'stylesheet'
    css.href = 'https://fonts.googleapis.com/css2?family=Bungee&display=swap'
    css.setAttribute('data-font', 'bungee-stealth-assassin')
    document.head.appendChild(css)
  }

  _watchBungeeFontReady () {
    if (typeof document === 'undefined') return
    const fonts = document.fonts
    if (!fonts?.load) return
    const face = '12px "Bungee"'
    const tryResolve = (remaining = 12) => {
      const ready = fonts.check(face)
      if (ready) {
        this._onBungeeReady()
        return
      }
      fonts
        .load('700 28px "Bungee"')
        .finally(() => {
          if (fonts.check(face)) {
            this._onBungeeReady()
            return
          }
          if (remaining > 0) setTimeout(() => tryResolve(remaining - 1), 220)
        })
        .catch(() => {})
    }
    tryResolve()
  }

  _onBungeeReady () {
    if (this._bungeeReady) return
    this._bungeeReady = true
    this._refreshBungeeTexts()
    // Force HUD re-layout with final glyph metrics.
    if (!this._uiRoot) return
    if (this._hudRoot?.parent) this._hudRoot.parent.removeChild(this._hudRoot)
    this._hudRoot = null
    this._hudHealthValue = null
    this._hudTargetsValue = null
    this._hudKillsValue = null
  }

  _refreshBungeeTexts () {
    if (!this._uiRoot) return
    const walk = (node: any) => {
      if (!node) return
      if (node instanceof Text) {
        if (node.style) node.style.fontFamily = BUNGEE_FONT
        node.text = String(node.text ?? '')
      }
      const kids = node.children
      if (!Array.isArray(kids)) return
      for (const child of kids) walk(child)
    }
    walk(this._uiRoot)
  }

  _installInteractionGuards () {
    if (typeof document === 'undefined' || typeof window === 'undefined') return
    if ((window as any).__stealthInteractionGuardsInstalled) return
    ;(window as any).__stealthInteractionGuardsInstalled = true

    document.addEventListener('contextmenu', (ev: any) => ev.preventDefault())

    window.addEventListener(
      'wheel',
      (ev: any) => {
        if (ev.ctrlKey || ev.metaKey) ev.preventDefault()
      },
      { passive: false }
    )

    const blockGesture = (ev: any) => ev.preventDefault()
    document.addEventListener('gesturestart', blockGesture, { passive: false })
    document.addEventListener('gesturechange', blockGesture, { passive: false })
    document.addEventListener('gestureend', blockGesture, { passive: false })

    document.addEventListener(
      'touchmove',
      ev => {
        if (ev.touches?.length > 1) ev.preventDefault()
      },
      { passive: false }
    )
  }

  bootstrap (world: WorldLike, registry: unknown, stage: Container, entityBuilder: unknown, fullConfig: Record<string, unknown>) {
    if (!this.enabled) return
    this._ensureBungeeFontLoaded()
    this._installInteractionGuards()
    this._world = world
    this._registry = registry
    this._stage = stage
    this._entityBuilder = entityBuilder
    this._spawnOpts = {
      objectTypes: fullConfig?.objectTypes ?? [],
      layers: fullConfig?.layers ?? []
    }
    this._rebuildProceduralMap(world)
  }

  setScreenUi (uiRoot: Container | null, w: number, h: number) {
    this._uiRoot = uiRoot
    this._viewW = Number(w) || this._viewW
    this._viewH = Number(h) || this._viewH
    this._touchControlsEnabled = this._isMobileLayout() && this._hasTouchInput()
    this._touchPointerId = null
    this._touchJoyCenter = null
    this._touchMoveVec = { x: 0, y: 0 }
    this._touchMoveSmoothVec = { x: 0, y: 0 }
    this._touchJoyRadius = Math.max(74, Math.min(110, Math.min(this._viewW, this._viewH) * 0.16))
    this._touchIdleSec = 0
    this._touchHintAnimT = 0
    if (this._touchHintRoot?.parent) this._touchHintRoot.parent.removeChild(this._touchHintRoot)
    this._touchHintRoot = null
    this._touchHintCurve = null
    this._touchHintArrow = null
    this._touchHintText = null
    if (this._hudRoot?.parent) this._hudRoot.parent.removeChild(this._hudRoot)
    this._hudRoot = null
    this._hudHealthValue = null
    this._hudTargetsValue = null
    this._hudKillsValue = null
    this._overlay = null
    if (this._toastRoot?.parent) this._toastRoot.parent.removeChild(this._toastRoot)
    this._toastRoot = null
    this._toastTimer = 0
    if (this._tileGridGraphics?.parent)
      this._tileGridGraphics.parent.removeChild(this._tileGridGraphics)
    this._tileGridGraphics = null
    this._kills = 0
    this._playerHp = this.playerMaxHp
    this._gameOver = false
    this._won = false
    this._playerPath = []
    this._playerPathIndex = 0
    this._pendingClick = null
    this._desiredGoal = null
    this._targetEnemyId = null
    this._lastTrackedEnemyPos = null
    this._retargetTick = 0
    this._isDirectMove = false
    this._playerSkinApplied = false
    if (this._playerSkinMount?.parent)
      this._playerSkinMount.parent.removeChild(this._playerSkinMount)
    this._playerSkinMount = null
    this._playerInitialRotationApplied = false
    this._enemySkinAppliedIds.clear()
    for (const skin of this._enemySkinMountById.values()) {
      if (skin?.parent) skin.parent.removeChild(skin)
    }
    this._enemySkinMountById.clear()
    this._doorIds.clear()
    this._doorOpenUntilById.clear()
    this._finalExitDoorId = null
    this._exitDoorUnlocked = false
    this._outsideGoal = null
    this._simTime = 0
    this._clearBullets(this._world)
    if (this._targetRing?.parent)
      this._targetRing.parent.removeChild(this._targetRing)
    this._targetRing = null
    this._guardConeById.clear()
    this._guardConeDistanceHistory.clear()
    for (const ring of this._guardInvestigateRingById.values()) {
      if (ring?.parent) ring.parent.removeChild(ring)
    }
    this._guardInvestigateRingById.clear()
    this._patrolState.clear()
    this._playerStuckTimer = 0
    this._playerLastMotionPos = null
    this._bindPointerClick()
  }

  update (dt: number, world: WorldLike) {
    if (!this.enabled || this._gameOver || this._won) return
    this._simTime += Math.max(0, dt)
    this._updateToast(dt)
    if (!this._proceduralMapReady) {
      this._rebuildProceduralMap(world)
      if (!this._proceduralMapReady) return
    }
    if (this._uiRoot && !this._hudRoot) this._buildHud()

    const playerId = world.findEntityIdByMetaName(this.playerMetaName)
    if (playerId == null) return
    const playerTr = world.getComponent(playerId, COMPONENT_TRANSFORM)
    if (!playerTr) return
    if (!this._playerLastMotionPos) {
      this._playerLastMotionPos = { x: playerTr.x, y: playerTr.y }
    }
    if (!this._playerInitialRotationApplied) {
      playerTr.rotation = this.playerInitialRotation
      this._playerInitialRotationApplied = true
    }
    this._lastPlayerPos = { x: playerTr.x, y: playerTr.y }
    const playerDisp = world.getComponent(playerId, COMPONENT_DISPLAY)
    this._applyPlayerSkinFrame(playerDisp?.view ?? null)
    if (this._playerSkinMount && playerDisp?.view) {
      this._syncSkinMount(playerDisp.view, this._playerSkinMount)
    }
    if (playerDisp?.view?.parent) {
      if (!this._pathGraphics) {
        this._pathGraphics = new Graphics()
        this._pathGraphics.zIndex = 150
        playerDisp.view.parent.addChild(this._pathGraphics)
      }
      if (!this._worldFxRoot) {
        this._worldFxRoot = new Container()
        this._worldFxRoot.zIndex = 160
        playerDisp.view.parent.addChild(this._worldFxRoot)
      }
      if (!this._targetRing) {
        this._targetRing = new Graphics()
        this._targetRing.zIndex = 170
        playerDisp.view.parent.addChild(this._targetRing)
      }
    }

    let colliders = buildColliderList(world as any)
    const navRadius = this._playerNavRadius()
    this._resolvePendingClick(world, playerTr, colliders)
    this._updateTargetEnemyTracking(world, playerTr, colliders, dt, navRadius)
    const touchActive = this._touchControlsEnabled && this._touchPointerId != null
    const touchDriving = this._applyVirtualTouchJoystick(
      dt,
      playerTr,
      colliders,
      navRadius
    )
    if (!touchActive && !touchDriving) {
      this._movePlayerAlongPath(dt, playerTr, colliders, navRadius)
    }
    this._updateTouchHintOverlay(dt)
    this._resolvePlayerWallPenetration(playerTr, colliders, navRadius)
    this._recoverPlayerIfStuck(dt, playerTr, colliders, navRadius)
    // Anchor path rendering to the post-move player position.
    this._lastPlayerPos = { x: playerTr.x, y: playerTr.y }
    colliders = buildColliderList(world as any)
    const playerBox = this._playerAabb(playerTr)

    this._updateGuardsAi(world, dt, colliders, playerTr)
    this._updateBullets(world, colliders, playerTr)
    colliders = buildColliderList(world as any)

    let aliveTargets = 0
    for (const c of colliders) {
      if (c.entityId === playerId) continue
      if (!this._hasTag(world, c.entityId, 'guard')) continue
      aliveTargets += 1
      const gTr = world.getComponent(c.entityId, COMPONENT_TRANSFORM)
      const gDisp = world.getComponent(c.entityId, COMPONENT_DISPLAY)
      const iv = world.getComponent(c.entityId, COMPONENT_INSTANCE_VARIABLES)
      if (!gTr) continue
      this._applyEnemySkinFrame(c.entityId, gDisp?.view ?? null)
      const enemySkin = this._enemySkinMountById.get(c.entityId)
      if (enemySkin && gDisp?.view) this._syncSkinMount(gDisp.view, enemySkin)
      const vision = Number(iv?.get('visionRange') ?? this.defaultVisionRange)
      const fov = Number(iv?.get('fovDeg') ?? this.defaultFovDeg)
      this._drawGuardCone(world, c.entityId, gTr, vision, fov, colliders)
    }
    this._clearInvestigateRings()

    this._tryAutoTakedown(world, playerTr, colliders)

    aliveTargets = world.findEntityIdsByTag('guard').length
    if (this._finalExitDoorId != null) {
      const shouldUnlock = aliveTargets === 0
      if (shouldUnlock !== this._exitDoorUnlocked) {
        this._exitDoorUnlocked = shouldUnlock
        const doorDisp = world.getComponent(this._finalExitDoorId, COMPONENT_DISPLAY)
        if (doorDisp?.view) doorDisp.view.tint = shouldUnlock ? 0x22c55e : 0xdc2626
      }
      for (const doorId of this._doorIds) {
        const disp = world.getComponent(doorId, COMPONENT_DISPLAY)
        if (disp?.view) disp.view.tint = 0x6b4423
      }
    }
    if (this._hudHealthValue)
      this._hudHealthValue.text = String(
        Math.max(0, Math.ceil(this._playerHp))
      )
    if (this._hudTargetsValue) this._hudTargetsValue.text = String(aliveTargets)
    if (this._hudKillsValue) this._hudKillsValue.text = String(this._kills)
    this._drawPath()
    this._drawTargetRing(world)

    if (aliveTargets === 0) {
      for (const c of colliders) {
        if (!this._hasTag(world, c.entityId, 'exit')) continue
        if (aabbOverlap(playerBox as any, c as any)) {
          this._showResult('MISSION COMPLETE', 0x86efac)
          this._won = true
          return
        }
      }
    }
  }

  _buildHud () {
    if (!this._uiRoot) return
    const root = new Container()
    root.zIndex = 200

    const isMobile = this._isMobileLayout()
    const margin = isMobile ? 10 : 14
    const topY = isMobile ? 8 : 12
    const healthW = isMobile ? Math.min(150, this._viewW * 0.4) : 168
    const healthH = isMobile ? 72 : 78
    const smallW = isMobile ? Math.min(132, this._viewW * 0.34) : 148
    const smallH = isMobile ? 58 : 64
    const smallGap = isMobile ? 8 : 10

    // Left: Health
    const healthPanel = new Container()
    healthPanel.position.set(margin, topY)
    const healthBg = new Graphics()
    healthBg.roundRect(0, 0, healthW, healthH, isMobile ? 12 : 14)
    healthBg.fill({ color: 0x134e4a, alpha: 0.94 })
    healthBg.stroke({ width: 3, color: 0x2dd4bf, alpha: 1 })
    const healthAccent = new Graphics()
    healthAccent.roundRect(10, 7, healthW - 20, 5, 2)
    healthAccent.fill({ color: 0x5eead4, alpha: 1 })
    healthPanel.addChild(healthBg)
    healthPanel.addChild(healthAccent)
    const healthLabel = new Text({
      text: 'Health',
      style: {
        fill: 0x99f6e4,
        fontSize: isMobile ? 11 : 13,
        fontFamily: BUNGEE_FONT,
        align: 'center',
        padding: 6
      }
    })
    healthLabel.anchor.set(0.5, 0)
    healthLabel.position.set(healthW * 0.5, isMobile ? 13 : 18)
    const healthValue = new Text({
      text: String(Math.max(0, Math.ceil(this._playerHp))),
      style: {
        fill: 0xffffff,
        fontSize: isMobile ? 22 : 28,
        fontFamily: BUNGEE_FONT,
        align: 'center',
        padding: 6
      }
    })
    healthValue.anchor.set(0.5, 0)
    healthValue.position.set(healthW * 0.5, isMobile ? 30 : 40)
    healthPanel.addChild(healthLabel)
    healthPanel.addChild(healthValue)

    // Right: Targets (top) & Kills (below), separate panels
    const rightW = smallW
    const rightH = smallH
    const rightGap = smallGap
    const rightX = this._viewW - rightW - margin

    const targetsPanel = new Container()
    targetsPanel.position.set(rightX, topY)
    const targetsBg = new Graphics()
    targetsBg.roundRect(0, 0, rightW, rightH, isMobile ? 12 : 14)
    targetsBg.fill({ color: 0x3730a3, alpha: 0.94 })
    targetsBg.stroke({ width: 3, color: 0xc4b5fd, alpha: 1 })
    const targetsAccent = new Graphics()
    targetsAccent.roundRect(10, 7, rightW - 20, 5, 2)
    targetsAccent.fill({ color: 0xa78bfa, alpha: 1 })
    targetsPanel.addChild(targetsBg)
    targetsPanel.addChild(targetsAccent)
    const targetsLabel = new Text({
      text: 'Targets',
      style: {
        fill: 0xe9d5ff,
        fontSize: isMobile ? 10 : 12,
        fontFamily: BUNGEE_FONT,
        align: 'center',
        padding: 4
      }
    })
    targetsLabel.anchor.set(0.5, 0)
    targetsLabel.position.set(rightW * 0.5, isMobile ? 10 : 12)
    const targetsValue = new Text({
      text: '0',
      style: {
        fill: 0xfef08a,
        fontSize: isMobile ? 20 : 26,
        fontFamily: BUNGEE_FONT,
        align: 'center',
        padding: 5
      }
    })
    targetsValue.anchor.set(0.5, 0)
    targetsValue.position.set(rightW * 0.5, isMobile ? 24 : 30)
    targetsPanel.addChild(targetsLabel)
    targetsPanel.addChild(targetsValue)

    const killsPanel = new Container()
    killsPanel.position.set(rightX, topY + rightH + rightGap)
    const killsBg = new Graphics()
    killsBg.roundRect(0, 0, rightW, rightH, isMobile ? 12 : 14)
    killsBg.fill({ color: 0x831843, alpha: 0.94 })
    killsBg.stroke({ width: 3, color: 0xf472b6, alpha: 1 })
    const killsAccent = new Graphics()
    killsAccent.roundRect(10, 7, rightW - 20, 5, 2)
    killsAccent.fill({ color: 0xfb7185, alpha: 1 })
    killsPanel.addChild(killsBg)
    killsPanel.addChild(killsAccent)
    const killsLabel = new Text({
      text: 'Kills',
      style: {
        fill: 0xfce7f3,
        fontSize: isMobile ? 10 : 12,
        fontFamily: BUNGEE_FONT,
        align: 'center',
        padding: 4
      }
    })
    killsLabel.anchor.set(0.5, 0)
    killsLabel.position.set(rightW * 0.5, isMobile ? 10 : 12)
    const killsValue = new Text({
      text: String(this._kills),
      style: {
        fill: 0xfca5a5,
        fontSize: isMobile ? 20 : 26,
        fontFamily: BUNGEE_FONT,
        align: 'center',
        padding: 5
      }
    })
    killsValue.anchor.set(0.5, 0)
    killsValue.position.set(rightW * 0.5, isMobile ? 24 : 30)
    killsPanel.addChild(killsLabel)
    killsPanel.addChild(killsValue)

    root.addChild(healthPanel)
    root.addChild(targetsPanel)
    root.addChild(killsPanel)
    this._uiRoot.addChild(root)

    this._hudRoot = root
    this._hudHealthValue = healthValue
    this._hudTargetsValue = targetsValue
    this._hudKillsValue = killsValue
  }

  _applyPlayerSkinFrame (view: Sprite | null) {
    if (this._playerSkinApplied) return
    if (!(view instanceof Sprite)) return
    const baseTex = view.texture
    const src = baseTex?.source
    const srcW = Number(src?.width ?? 0)
    const srcH = Number(src?.height ?? 0)
    if (!(srcW > 0 && srcH > 0)) return
    const container = createCompositeCharacterContainer(baseTex, 0, 0, 80)
    if (!container) return
    if (!view.parent) return
    container.zIndex = view.zIndex
    view.parent.addChild(container)
    view.texture = Texture.EMPTY
    view.width = 80
    view.height = 80
  
    view.visible = false
    this._playerSkinMount = container
    this._syncSkinMount(view, container)
    this._playerSkinApplied = true
  }

  _applyEnemySkinFrame (entityId: number, view: Sprite | null) {
    if (this._enemySkinAppliedIds.has(entityId)) return
    if (!(view instanceof Sprite)) return
    const baseTex = view.texture
    const src = baseTex?.source
    const srcW = Number(src?.width ?? 0)
    const srcH = Number(src?.height ?? 0)
    if (!(srcW > 0 && srcH > 0)) return
    // row 4, column 3 (1-based) from 4x4 sheet => col=2, row=3 (0-based).
    const container = createCompositeCharacterContainer(baseTex, 2, 3, 80, {
      weaponTexture: this._getWeaponsTexture(),
      weaponIndex: 3, // 4th weapon from 5-horizontal strip
      weaponCount: 5
    })
    if (!container) return
    // Align enemy art with cone origin offset (+10 on cone X).
    container.x = 6
    if (!view.parent) return
    container.zIndex = view.zIndex
    view.parent.addChild(container)
    view.texture = Texture.EMPTY
    view.visible = false
    this._enemySkinMountById.set(entityId, container)
    this._syncSkinMount(view, container)
    this._enemySkinAppliedIds.add(entityId)
  }

  _syncSkinMount (sourceView: Sprite | null, skinMount: Container | null) {
    if (!sourceView || !skinMount) return
    if (sourceView.parent && skinMount.parent !== sourceView.parent) {
      sourceView.parent.addChild(skinMount)
    }
    skinMount.position.set(sourceView.x, sourceView.y)
    skinMount.rotation = sourceView.rotation
    // Keep the mount's original uniform fit size from creation.
    skinMount.visible = sourceView.visible
    skinMount.alpha = sourceView.alpha
  }

  _getWeaponsTexture () {
    if (this._weaponsTexture) return this._weaponsTexture
    this._weaponsTexture = Texture.from('/Weapons.png')
    return this._weaponsTexture
  }

  _bindPointerClick () {
    if (this._unsubPointer || !this._inputCoordinator?.hub) return
    const hub = this._inputCoordinator.hub
    const onDown = (ev: PointerPayload) => {
      const d = /** @type {CustomEvent} */ (ev).detail ?? {}
      if (Number(d.button ?? 0) !== 0) return
      if (this._touchControlsEnabled && (d.pointerType == null || d.pointerType === 'touch')) {
        this._touchPointerId = d.pointerId ?? 'touch-0'
        this._touchJoyCenter = { x: Number(d.x ?? 0), y: Number(d.y ?? 0) }
        this._touchMoveVec = { x: 0, y: 0 }
        this._touchMoveSmoothVec = { x: 0, y: 0 }
        this._playerPath = []
        this._playerPathIndex = 0
        this._isDirectMove = false
        this._desiredGoal = null
        this._touchIdleSec = 0
        return
      }
      this._pendingClick = { x: Number(d.x ?? 0), y: Number(d.y ?? 0) }
    }
    const onMove = (ev: PointerPayload) => {
      if (!this._touchControlsEnabled || !this._touchJoyCenter) return
      const d = /** @type {CustomEvent} */ (ev).detail ?? {}
      const pid = d.pointerId ?? 'touch-0'
      if (this._touchPointerId != null && pid !== this._touchPointerId) return
      const dx = Number(d.x ?? 0) - this._touchJoyCenter.x
      const dy = Number(d.y ?? 0) - this._touchJoyCenter.y
      const mag = Math.hypot(dx, dy)
      const clamped = Math.min(this._touchJoyRadius, mag)
      const deadZone = 0.08
      const normalized = clamped / this._touchJoyRadius
      const active =
        normalized <= deadZone ? 0 : (normalized - deadZone) / Math.max(1e-6, 1 - deadZone)
      const curved = active * active * (3 - 2 * active)
      if (mag <= 1e-6) {
        this._touchMoveVec = { x: 0, y: 0 }
      } else {
        this._touchMoveVec = {
          x: (dx / mag) * curved,
          y: (dy / mag) * curved
        }
      }
    }
    const onUp = (ev: PointerPayload) => {
      if (!this._touchControlsEnabled) return
      const d = /** @type {CustomEvent} */ (ev).detail ?? {}
      const pid = d.pointerId ?? 'touch-0'
      if (this._touchPointerId != null && pid !== this._touchPointerId) return
      this._touchPointerId = null
      this._touchJoyCenter = null
      this._touchMoveVec = { x: 0, y: 0 }
      this._touchMoveSmoothVec = { x: 0, y: 0 }
      this._touchIdleSec = 0
    }
    hub.addEventListener('pointer:down', onDown)
    hub.addEventListener('pointer:move', onMove)
    hub.addEventListener('pointer:up', onUp)
    hub.addEventListener('pointer:cancel', onUp)
    this._unsubPointer = () => {
      this._inputCoordinator?.hub?.removeEventListener('pointer:down', onDown)
      this._inputCoordinator?.hub?.removeEventListener('pointer:move', onMove)
      this._inputCoordinator?.hub?.removeEventListener('pointer:up', onUp)
      this._inputCoordinator?.hub?.removeEventListener('pointer:cancel', onUp)
    }
  }

  _applyVirtualTouchJoystick (dt: number, playerTr: TransformLike, colliders: ColliderLike[], navRadius: number) {
    if (!this._touchControlsEnabled) return false
    const smoothFollow = 1 - Math.exp(-20 * dt)
    this._touchMoveSmoothVec.x +=
      (this._touchMoveVec.x - this._touchMoveSmoothVec.x) * smoothFollow
    this._touchMoveSmoothVec.y +=
      (this._touchMoveVec.y - this._touchMoveSmoothVec.y) * smoothFollow
    const vx = this._touchMoveSmoothVec.x
    const vy = this._touchMoveSmoothVec.y
    const mag = Math.hypot(vx, vy)
    if (mag < 0.045) return false
    this._playerPath = []
    this._playerPathIndex = 0
    this._isDirectMove = false
    this._desiredGoal = null
    const ux = vx / mag
    const uy = vy / mag
    const speed = this.playerMoveSpeed * Math.min(1, Math.max(0, mag))
    const step = speed * dt
    const nx = playerTr.x + ux * step
    const ny = playerTr.y + uy * step
    if (this._canOccupyCircle(nx, ny, navRadius, colliders, -1)) {
      playerTr.x = nx
      playerTr.y = ny
    } else {
      const nxOnly = playerTr.x + ux * step
      if (this._canOccupyCircle(nxOnly, playerTr.y, navRadius, colliders, -1))
        playerTr.x = nxOnly
      const nyOnly = playerTr.y + uy * step
      if (this._canOccupyCircle(playerTr.x, nyOnly, navRadius, colliders, -1))
        playerTr.y = nyOnly
    }
    const targetRotation = Math.atan2(uy, ux) + this.playerFacingAngleOffset
    playerTr.rotation = smoothAngleStep(
      playerTr.rotation,
      targetRotation,
      this.playerTurnSmoothSpeed * dt
    )
    playerTr.scaleX = ux >= 0 ? 1 : -1
    return true
  }

  _ensureTouchHintOverlay () {
    if (!this._uiRoot || this._touchHintRoot) return
    const root = new Container()
    root.zIndex = 255
    root.eventMode = 'none'
    root.alpha = 0
    const curve = new Graphics()
    const arrow = new Graphics()
    const text = new Text({
      text: 'Touch and drag anywhere to move',
      style: {
        fill: 0x0f172a,
        fontSize: this._isMobileLayout() ? 14 : 15,
        fontFamily: BUNGEE_FONT,
        align: 'center',
        padding: 4
      }
    })
    text.anchor.set(0.5, 0)
    root.addChild(curve)
    root.addChild(arrow)
    root.addChild(text)
    this._uiRoot.addChild(root)
    this._touchHintRoot = root
    this._touchHintCurve = curve
    this._touchHintArrow = arrow
    this._touchHintText = text
  }

  _updateTouchHintOverlay (dt: number) {
    if (!this._touchControlsEnabled || !this._uiRoot) {
      if (this._touchHintRoot?.parent) this._touchHintRoot.parent.removeChild(this._touchHintRoot)
      this._touchHintRoot = null
      this._touchHintCurve = null
      this._touchHintArrow = null
      this._touchHintText = null
      return
    }
    this._ensureTouchHintOverlay()
    if (!this._touchHintRoot || !this._touchHintCurve || !this._touchHintArrow || !this._touchHintText)
      return

    const interacting =
      this._touchPointerId != null ||
      Math.hypot(this._touchMoveVec.x, this._touchMoveVec.y) > 0.04 ||
      Math.hypot(this._touchMoveSmoothVec.x, this._touchMoveSmoothVec.y) > 0.04
    if (interacting) this._touchIdleSec = 0
    else this._touchIdleSec += dt

    const show = this._touchIdleSec > 0.6
    const targetAlpha = show ? 0.86 : 0
    const fade = 1 - Math.exp(-6 * dt)
    this._touchHintRoot.alpha += (targetAlpha - this._touchHintRoot.alpha) * fade
    this._touchHintAnimT += dt * 1.8

    const cx = this._viewW * 0.5
    const cy = this._viewH - Math.max(92, this._viewH * 0.16)
    const a = Math.max(44, Math.min(72, this._viewW * 0.11))
    const b = Math.max(22, Math.min(36, this._viewH * 0.05))
    const phase = this._touchHintAnimT
    const eps = 0.045
    const pAt = (t: number) => ({
      x: cx + a * Math.sin(t),
      y: cy + b * Math.sin(t) * Math.cos(t)
    })

    const g = this._touchHintCurve
    g.clear()
    const segments = 120
    for (let i = 0; i <= segments; i++) {
      const t = (i / segments) * Math.PI * 2
      const p = pAt(t)
      if (i === 0) g.moveTo(p.x, p.y)
      else g.lineTo(p.x, p.y)
    }
    g.stroke({ width: 3, color: 0x1f2937, alpha: 0.75 })

    const p = pAt(phase)
    const p2 = pAt(phase + eps)
    const ang = Math.atan2(p2.y - p.y, p2.x - p.x)
    const ar = this._touchHintArrow
    ar.clear()
    ar.moveTo(10, 0)
    ar.lineTo(-7, -5)
    ar.lineTo(-3, 0)
    ar.lineTo(-7, 5)
    ar.closePath()
    ar.fill({ color: 0x111827, alpha: 0.92 })
    ar.position.set(p.x, p.y)
    ar.rotation = ang

    this._touchHintText.position.set(cx, cy + b + 10)
  }

  _showResult (title: string, color: number) {
    if (!this._uiRoot || this._overlay) return
    const root = new Container()
    root.zIndex = 300
    const bg = new Graphics()
    bg.rect(0, 0, this._viewW, this._viewH)
    bg.fill({ color: 0x0f172a, alpha: 0.78 })

    const panelW = 392
    const panelH = 210
    const px = (this._viewW - panelW) * 0.5
    const py = (this._viewH - panelH) * 0.5
    const panel = new Container()
    panel.position.set(px, py)

    const shadow = new Graphics()
    shadow.roundRect(10, 14, panelW, panelH, 20)
    shadow.fill({ color: 0x4c1d95, alpha: 0.45 })

    const frame = new Graphics()
    frame.roundRect(0, 0, panelW, panelH, 18)
    frame.fill({ color: 0x312e81, alpha: 0.98 })
    frame.stroke({ width: 4, color: 0xfacc15, alpha: 1 })

    const innerStroke = new Graphics()
    innerStroke.roundRect(8, 8, panelW - 16, panelH - 16, 14)
    innerStroke.stroke({ width: 2, color: 0x22d3ee, alpha: 0.95 })

    const stripe = new Graphics()
    stripe.roundRect(18, 18, panelW - 36, 10, 4)
    stripe.fill({ color: 0xec4899, alpha: 1 })

    const titleText = new Text({
      text: title,
      style: {
        fill: color,
        fontSize: 32,
        align: 'center',
        fontFamily: BUNGEE_FONT,
        letterSpacing: 1,
        dropShadow: {
          alpha: 0.85,
          angle: Math.PI / 2,
          blur: 2,
          color: 0x000000,
          distance: 2
        }
      }
    })
    titleText.anchor.set(0.5, 0)
    titleText.position.set(panelW * 0.5, 52)

    const hint = new Text({
      text: 'Tap or click anywhere to restart',
      style: {
        fill: 0xf1f5f9,
        fontSize: 14,
        align: 'center',
        fontFamily: BUNGEE_FONT,
        letterSpacing: 0.5
      }
    })
    hint.anchor.set(0.5, 0)
    hint.position.set(panelW * 0.5, 128)

    const flare = new Graphics()
    flare.roundRect(32, panelH - 36, panelW - 64, 6, 3)
    flare.fill({ color: 0xa3e635, alpha: 0.9 })

    panel.addChild(shadow)
    panel.addChild(frame)
    panel.addChild(innerStroke)
    panel.addChild(stripe)
    panel.addChild(titleText)
    panel.addChild(hint)
    panel.addChild(flare)

    root.addChild(bg)
    root.addChild(panel)
    root.eventMode = 'static'
    root.hitArea = new Rectangle(0, 0, this._viewW, this._viewH)
    root.on('pointertap', () => {
      if (typeof window !== 'undefined') window.location.reload()
    })
    this._uiRoot.addChild(root)
    this._overlay = root
  }

  _hasTag (world: WorldLike, id: number, tag: string) {
    const m = world.getComponent(id, COMPONENT_META)
    const tags = m?.tags
    return Array.isArray(tags) && tags.includes(tag)
  }

  _updateGuardsAi (world: WorldLike, dt: number, colliders: ColliderLike[], playerTr: TransformLike) {
    const guards = world.findEntityIdsByTag('guard')
    for (const id of guards) {
      const tr = world.getComponent(id, COMPONENT_TRANSFORM)
      const iv = world.getComponent(id, COMPONENT_INSTANCE_VARIABLES)
      if (!tr || !iv) continue
      // Guard sprites should render with unit scale; old map values can be huge from earlier circle setup.
      if (Math.abs(tr.scaleY) > 1.5) tr.scaleY = 1
      if (Math.abs(tr.scaleX) > 1.5) tr.scaleX = Math.sign(tr.scaleX) || 1
      let state = this._patrolState.get(id)
      if (!state) {
        const minX = Number(iv.get('patrolMinX') ?? tr.x - 80)
        const maxX = Number(iv.get('patrolMaxX') ?? tr.x + 80)
        const minY = Number(iv.get('patrolMinY') ?? tr.y - 80)
        const maxY = Number(iv.get('patrolMaxY') ?? tr.y + 80)
        const patrolType = String(iv.get('patrolType') ?? 'move')
        state = {
          mode: 'patrol',
          targetX: maxX,
          targetY: maxY,
          minX,
          maxX,
          minY,
          maxY,
          baseY: tr.y,
          patrolHomeX: tr.x,
          patrolHomeY: tr.y,
          patrolType,
          patrolRotateSpeed: Number(iv.get('patrolRotateSpeed') ?? 0.85),
          heading:
            patrolType === 'moveY'
              ? maxY >= tr.y ? Math.PI / 2 : -Math.PI / 2
              : tr.scaleX >= 0
                ? 0
                : Math.PI,
          fireCooldown: this.guardFireInterval * (0.2 + Math.random() * 0.6),
          searchTimer: 0,
          searchDuration: this.searchDurationMin,
          seenTimer: 0,
          scanBase: 0,
          returnX: maxX,
          returnY: tr.y,
          lastMoveX: tr.scaleX >= 0 ? 1 : -1,
          lastMoveY: 0,
          randomDirTimer: 0,
          patrolSubState: 'move',
          patrolWaitTimer: 0,
          patrolScanBase: tr.scaleX >= 0 ? 0 : Math.PI,
          patrolScanA: tr.scaleX >= 0 ? -0.4 : Math.PI - 0.4,
          patrolScanB: tr.scaleX >= 0 ? 0.4 : Math.PI + 0.4,
          patrolTurnTarget: tr.scaleX >= 0 ? 0 : Math.PI,
          guardPath: [],
          guardPathIndex: 0,
          investigateCenterX: tr.x,
          investigateCenterY: tr.y,
          investigatePhase: 'pause',
          investigatePhaseTimer: 0,
          investigateScanBase: tr.scaleX >= 0 ? 0 : Math.PI,
          stuckTimer: 0
        }
        this._patrolState.set(id, state)
      }
      const prevX = tr.x
      const prevY = tr.y
      this._markNearbyDoorsOpenForGuard(tr.x, tr.y, this.guardRadius, colliders)
      const vision = Number(iv.get('visionRange') ?? this.defaultVisionRange)
      const fov = Number(iv.get('fovDeg') ?? this.defaultFovDeg)
      const sees = this._canGuardSeePlayer(
        id,
        tr,
        playerTr,
        vision,
        fov,
        colliders,
        world,
        state.heading
      )
      const distToPlayer = Math.hypot(playerTr.x - tr.x, playerTr.y - tr.y)
      const shootRange = vision * this.shootRangeRatio

      if (sees) {
        state.seenTimer = this.detectHoldSec
        if (state.mode !== 'chase' && state.mode !== 'shoot') {
          state.returnX = state.targetX
          state.returnY = tr.y
        }
        // Immediate response:
        // - inside 50% cone range => shoot
        // - outside that 50% range (but still seen) => chase
        state.mode = distToPlayer <= shootRange ? 'shoot' : 'chase'
      } else {
        state.seenTimer = 0
      }

      if (!sees && (state.mode === 'chase' || state.mode === 'shoot')) {
        state.mode = 'search'
        state.searchDuration =
          this.searchDurationMin +
          Math.random() *
            Math.max(0, this.searchDurationMax - this.searchDurationMin)
        state.searchTimer = state.searchDuration
        state.scanBase = state.heading
      }

      if (state.mode === 'shoot') {
        const dx = playerTr.x - tr.x
        const dy = playerTr.y - tr.y
        state.heading = Math.atan2(dy, dx)
        tr.scaleX = dx >= 0 ? 1 : -1
        if (distToPlayer > shootRange) {
          state.mode = 'chase'
        } else {
          state.fireCooldown -= dt
          if (state.fireCooldown <= 0) {
            this._spawnBullet(world, tr.x, tr.y, playerTr.x, playerTr.y)
            state.fireCooldown = this.guardFireInterval
          }
        }
      } else if (state.mode === 'chase') {
        this._guardChasePlayer(tr, state, dt, colliders, playerTr, id)
        const newDist = Math.hypot(playerTr.x - tr.x, playerTr.y - tr.y)
        if (
          sees &&
          newDist <= shootRange
        ) {
          state.mode = 'shoot'
        }
      } else if (state.mode === 'search') {
        state.searchTimer -= dt
        const t = Math.max(0, state.searchDuration - state.searchTimer)
        state.heading =
          state.scanBase + Math.sin(t * this.searchRotateSpeed) * 0.85
        tr.scaleX = Math.cos(state.heading) >= 0 ? 1 : -1
        if (this.searchMoveSpeed > 0) {
          const lm = Math.hypot(state.lastMoveX || 0, state.lastMoveY || 0) || 1
          const ux = (state.lastMoveX || 0) / lm
          const uy = (state.lastMoveY || 0) / lm
          const nx = tr.x + ux * this.searchMoveSpeed * dt
          const ny = tr.y + uy * this.searchMoveSpeed * dt
          if (this._canOccupyCircle(nx, ny, this.guardRadius, colliders, id)) {
            tr.x = nx
            tr.y = ny
          }
        }
        if (state.searchTimer <= 0) state.mode = 'return'
      } else if (state.mode === 'return') {
        const dx = state.returnX - tr.x
        const dy = state.returnY - tr.y
        const d = Math.hypot(dx, dy)
        if (d <= 4) {
          tr.x = state.returnX
          tr.y = state.returnY
          state.mode = 'patrol'
        } else {
          const speed = Number(iv.get('patrolSpeed') ?? this.defaultPatrolSpeed)
          const ux = dx / Math.max(d, 1e-6)
          const uy = dy / Math.max(d, 1e-6)
          const nx = tr.x + ux * speed * dt
          const ny = tr.y + uy * speed * dt
          if (this._canOccupyCircle(nx, ny, this.guardRadius, colliders, id)) {
            tr.x = nx
            tr.y = ny
            state.heading = Math.atan2(uy, ux)
            tr.scaleX = ux >= 0 ? 1 : -1
            state.lastMoveX = ux
            state.lastMoveY = uy
          } else {
            state.mode = 'patrol'
          }
        }
      } else if (state.mode === 'investigateMove') {
        const tx = Number(state.investigateTargetX ?? tr.x)
        const ty = Number(state.investigateTargetY ?? tr.y)
        if (!Array.isArray(state.guardPath) || !state.guardPath.length) {
          state.guardPath = this._planGuardPath(
            { x: tr.x, y: tr.y },
            { x: tx, y: ty },
            colliders,
            id
          )
          state.guardPathIndex = 0
        }
        const reached = this._moveGuardAlongPath(
          tr,
          state,
          this.investigateMoveSpeed,
          dt,
          colliders,
          id
        )
        if (reached || Math.hypot(tx - tr.x, ty - tr.y) <= 14) {
          state.mode = 'investigateSearch'
          state.investigatePhase = 'pause'
          state.investigatePhaseTimer = 0.9
          state.investigateScanBase = state.heading
          state.guardPath = []
          state.guardPathIndex = 0
        }
      } else if (state.mode === 'investigateSearch') {
        state.searchTimer -= dt
        if (state.searchTimer <= 0) {
          state.mode = 'return'
          state.returnX = state.patrolHomeX
          state.returnY = state.patrolHomeY
        } else if (state.investigatePhase === 'pause') {
          state.investigatePhaseTimer -= dt
          const t = Math.max(0, 0.9 - state.investigatePhaseTimer)
          state.heading =
            state.investigateScanBase + Math.sin(t * this.searchRotateSpeed * 0.8) * 0.65
          if (state.investigatePhaseTimer <= 0) {
            const a = Math.random() * Math.PI * 2
            const d = 40 + Math.random() * 120
            const tx = Number(state.investigateCenterX ?? tr.x) + Math.cos(a) * d
            const ty = Number(state.investigateCenterY ?? tr.y) + Math.sin(a) * d
            state.guardPath = this._planGuardPath(
              { x: tr.x, y: tr.y },
              { x: tx, y: ty },
              colliders,
              id
            )
            state.guardPathIndex = 0
            state.investigatePhase = state.guardPath.length ? 'walk' : 'pause'
            state.investigatePhaseTimer = state.guardPath.length
              ? 1.5 + Math.random() * 1.2
              : 0.45
            state.investigateScanBase = state.heading
          }
        } else {
          const reached = this._moveGuardAlongPath(
            tr,
            state,
            this.searchMoveSpeed * 0.8,
            dt,
            colliders,
            id
          )
          state.investigatePhaseTimer -= dt
          if (reached || state.investigatePhaseTimer <= 0) {
            state.investigatePhase = 'pause'
            state.investigatePhaseTimer = 0.6 + Math.random() * 0.6
            state.investigateScanBase = state.heading
            state.guardPath = []
            state.guardPathIndex = 0
          }
        }
      } else {
        // patrol
        if (state.patrolType === 'rotate') {
          state.heading += state.patrolRotateSpeed * dt
          tr.scaleX = Math.cos(state.heading) >= 0 ? 1 : -1
          state.lastMoveX = Math.cos(state.heading)
          state.lastMoveY = Math.sin(state.heading)
        } else if (state.patrolType === 'moveY') {
          if (state.patrolSubState === 'scanA') {
            state.patrolWaitTimer -= dt
            state.heading = smoothAngleStep(
              state.heading,
              state.patrolScanA,
              this.patrolTurnSpeed * dt
            )
            if (state.patrolWaitTimer <= 0) {
              state.patrolSubState = 'scanB'
              state.patrolWaitTimer = this.patrolWaitDuration * 0.4
            }
          } else if (state.patrolSubState === 'scanB') {
            state.patrolWaitTimer -= dt
            state.heading = smoothAngleStep(
              state.heading,
              state.patrolScanB,
              this.patrolTurnSpeed * dt
            )
            if (state.patrolWaitTimer <= 0) {
              state.patrolSubState = 'turn'
            }
          } else if (state.patrolSubState === 'turn') {
            const diff = normalizeAngle(state.patrolTurnTarget - state.heading)
            const step = this.patrolTurnSpeed * dt
            if (Math.abs(diff) <= step) {
              state.heading = state.patrolTurnTarget
              state.patrolSubState = 'move'
            } else {
              state.heading = normalizeAngle(state.heading + Math.sign(diff) * step)
            }
          } else {
            if (Math.abs(tr.y - state.targetY) < 8) {
              const prevTargetY = state.targetY
              state.targetY = state.targetY === state.maxY ? state.minY : state.maxY
              const dirPrev = Math.sign(prevTargetY - tr.y) || state.lastMoveY || 1
              const moveHeading = dirPrev >= 0 ? Math.PI / 2 : -Math.PI / 2
              state.patrolScanBase = moveHeading
              state.patrolScanA = normalizeAngle(moveHeading - 0.45)
              state.patrolScanB = normalizeAngle(moveHeading + 0.45)
              state.patrolTurnTarget = normalizeAngle(moveHeading + Math.PI)
              state.patrolWaitTimer = this.patrolWaitDuration * 0.4
              state.patrolSubState = 'scanA'
            } else {
              const speed = Number(iv.get('patrolSpeed') ?? this.defaultPatrolSpeed)
              const dir = Math.sign(state.targetY - tr.y) || 1
              const ny = tr.y + dir * speed * dt
              if (this._canOccupyCircle(tr.x, ny, this.guardRadius, colliders, id)) {
                tr.y = ny
                const desiredHeading = dir >= 0 ? Math.PI / 2 : -Math.PI / 2
                state.heading = smoothAngleStep(
                  state.heading,
                  desiredHeading,
                  this.patrolTurnSpeed * dt
                )
                state.lastMoveX = 0
                state.lastMoveY = dir
              } else {
                const dirCurrent = Math.sign(state.targetY - tr.y) || state.lastMoveY || 1
                state.targetY = state.targetY === state.maxY ? state.minY : state.maxY
                const moveHeading = dirCurrent >= 0 ? Math.PI / 2 : -Math.PI / 2
                state.patrolScanBase = moveHeading
                state.patrolScanA = normalizeAngle(moveHeading - 0.45)
                state.patrolScanB = normalizeAngle(moveHeading + 0.45)
                state.patrolTurnTarget = normalizeAngle(moveHeading + Math.PI)
                state.patrolWaitTimer = this.patrolWaitDuration * 0.4
                state.patrolSubState = 'scanA'
              }
            }
          }
        } else {
          if (state.patrolSubState === 'scanA') {
            state.patrolWaitTimer -= dt
            state.heading = smoothAngleStep(
              state.heading,
              state.patrolScanA,
              this.patrolTurnSpeed * dt
            )
            if (state.patrolWaitTimer <= 0) {
              state.patrolSubState = 'scanB'
              state.patrolWaitTimer = this.patrolWaitDuration * 0.4
            }
          } else if (state.patrolSubState === 'scanB') {
            state.patrolWaitTimer -= dt
            state.heading = smoothAngleStep(
              state.heading,
              state.patrolScanB,
              this.patrolTurnSpeed * dt
            )
            if (state.patrolWaitTimer <= 0) {
              state.patrolSubState = 'turn'
            }
          } else if (state.patrolSubState === 'turn') {
            const diff = normalizeAngle(state.patrolTurnTarget - state.heading)
            const step = this.patrolTurnSpeed * dt
            if (Math.abs(diff) <= step) {
              state.heading = state.patrolTurnTarget
              state.patrolSubState = 'move'
            } else {
              state.heading = normalizeAngle(state.heading + Math.sign(diff) * step)
            }
          } else {
            if (Math.abs(tr.x - state.targetX) < 8) {
              const prevTargetX = state.targetX
              state.targetX = state.targetX === state.maxX ? state.minX : state.maxX
              const dirPrev = Math.sign(prevTargetX - tr.x) || state.lastMoveX || 1
              const moveHeading = dirPrev >= 0 ? 0 : Math.PI
              state.patrolScanBase = moveHeading
              state.patrolScanA = normalizeAngle(moveHeading - 0.45)
              state.patrolScanB = normalizeAngle(moveHeading + 0.45)
              state.patrolTurnTarget = normalizeAngle(moveHeading + Math.PI)
              state.patrolWaitTimer = this.patrolWaitDuration * 0.4
              state.patrolSubState = 'scanA'
            } else {
              const speed = Number(iv.get('patrolSpeed') ?? this.defaultPatrolSpeed)
              const dir = Math.sign(state.targetX - tr.x) || 1
              const nx = tr.x + dir * speed * dt
              if (this._canOccupyCircle(nx, tr.y, this.guardRadius, colliders, id)) {
                tr.x = nx
                const desiredHeading = dir >= 0 ? 0 : Math.PI
                state.heading = smoothAngleStep(
                  state.heading,
                  desiredHeading,
                  this.patrolTurnSpeed * dt
                )
                state.lastMoveX = dir
                state.lastMoveY = 0
              } else {
                const dirCurrent = Math.sign(state.targetX - tr.x) || state.lastMoveX || 1
                state.targetX = state.targetX === state.maxX ? state.minX : state.maxX
                const moveHeading = dirCurrent >= 0 ? 0 : Math.PI
                state.patrolScanBase = moveHeading
                state.patrolScanA = normalizeAngle(moveHeading - 0.45)
                state.patrolScanB = normalizeAngle(moveHeading + 0.45)
                state.patrolTurnTarget = normalizeAngle(moveHeading + Math.PI)
                state.patrolWaitTimer = this.patrolWaitDuration * 0.4
                state.patrolSubState = 'scanA'
              }
            }
          }
        }
      }

      const inPatrolMode = state.mode === 'patrol'
      const inPatrolLookPhase =
        inPatrolMode &&
        state.patrolType !== 'rotate' &&
        state.patrolSubState !== 'move'
      const inInvestigateLookPhase =
        state.mode === 'investigateSearch' &&
        state.investigatePhase === 'pause'
      this._markNearbyDoorsOpenForGuard(tr.x, tr.y, this.guardRadius, colliders)
      if (!inPatrolLookPhase && !inInvestigateLookPhase) {
        this._resolveCircleWallPenetration(tr, colliders, this.guardRadius, id)
      }
      const movedDist = Math.hypot(tr.x - prevX, tr.y - prevY)
      // Keep anti-stuck logic out of look/scan phases where guards should rotate in place.
      const trackStuck =
        state.mode === 'chase' ||
        state.mode === 'search' ||
        state.mode === 'return' ||
        state.mode === 'investigateMove' ||
        (state.mode === 'investigateSearch' && state.investigatePhase !== 'pause')
      if (trackStuck && movedDist < 0.35) {
        state.stuckTimer = (state.stuckTimer || 0) + dt
      } else {
        state.stuckTimer = 0
      }
      if ((state.stuckTimer || 0) > 0.45) {
        this._tryNudgeOutOfCorners(tr, this.guardRadius, colliders, id)
        if (
          state.mode === 'investigateMove' ||
          state.mode === 'investigateSearch' ||
          state.mode === 'return'
        ) {
          state.guardPath = []
          state.guardPathIndex = 0
        }
        state.stuckTimer = 0
      }

      // Avoid quadrant snap (0<->180 flip): guards use rotation-only facing, no X mirroring.
      tr.scaleX = Math.abs(tr.scaleX) || 1
      tr.rotation = smoothAngleStep(
        tr.rotation,
        state.heading + this.enemyFacingAngleOffset,
        this.enemyTurnSmoothSpeed * dt
      )
    }
  }

  _guardChasePlayer (tr: TransformLike, state: GuardStateLike, dt: number, colliders: ColliderLike[], playerTr: TransformLike, guardId: number) {
    const speed = this.guardChaseSpeed
    const dx = playerTr.x - tr.x
    const dy = playerTr.y - tr.y
    const d = Math.hypot(dx, dy) || 1
    const ux = dx / d
    const uy = dy / d
    state.heading = Math.atan2(uy, ux)
    tr.scaleX = ux >= 0 ? 1 : -1
    const nx = tr.x + ux * speed * dt
    const ny = tr.y + uy * speed * dt
    if (this._canOccupyCircle(nx, ny, this.guardRadius, colliders, guardId)) {
      tr.x = nx
      tr.y = ny
      state.lastMoveX = ux
      state.lastMoveY = uy
      return
    }
    // Try axis projections when full vector is blocked.
    const nxOnly = tr.x + ux * speed * dt
    if (
      this._canOccupyCircle(nxOnly, tr.y, this.guardRadius, colliders, guardId)
    ) {
      tr.x = nxOnly
      state.lastMoveX = ux
      state.lastMoveY = 0
    }
    const nyOnly = tr.y + uy * speed * dt
    if (
      this._canOccupyCircle(tr.x, nyOnly, this.guardRadius, colliders, guardId)
    ) {
      tr.y = nyOnly
      state.lastMoveX = 0
      state.lastMoveY = uy
    }
  }

  _canGuardSeePlayer (
    guardId: number,
    gTr: TransformLike,
    pTr: TransformLike,
    visionRange: number,
    fovDeg: number,
    colliders: ColliderLike[],
    world: WorldLike,
    headingAngle = null
  ) {
    const dx = pTr.x - gTr.x
    const dy = pTr.y - gTr.y
    const dist = Math.hypot(dx, dy)
    if (dist > visionRange || dist < 1) return false
    const look =
      headingAngle == null ? (gTr.scaleX >= 0 ? 0 : Math.PI) : headingAngle
    const toPlayer = Math.atan2(dy, dx)
    const angDeg = (Math.abs(normalizeAngle(toPlayer - look)) * 180) / Math.PI
    if (angDeg > fovDeg * 0.5) return false
    return !rayBlockedSolids(
      gTr.x,
      gTr.y,
      pTr.x,
      pTr.y,
      12,
      colliders,
      guardId,
      world
    )
  }

  _tryAutoTakedown (world: WorldLike, pTr: TransformLike, colliders: ColliderLike[]) {
    const guards = world.findEntityIdsByTag('guard')
    const contactKillRange = this.playerRadius + this.guardRadius + 2
    const frontalKillRange = Math.max(
      this.playerRadius * 1.8,
      this.playerRadius + this.guardRadius * 0.6
    )
    for (const id of guards) {
      const tr = world.getComponent(id, COMPONENT_TRANSFORM)
      if (!tr) continue
      const dx = tr.x - pTr.x
      const dy = tr.y - pTr.y
      const d = Math.hypot(dx, dy)
      if (d > contactKillRange) continue
      if (d > frontalKillRange) {
        const facingX = pTr.scaleX >= 0 ? 1 : -1
        const dirX = dx / Math.max(1e-6, d)
        const dot = Math.max(-1, Math.min(1, facingX * dirX))
        const ang = (Math.acos(dot) * 180) / Math.PI
        if (ang > 100 * 0.5) continue
      }
      if (rayBlockedSolids(pTr.x, pTr.y, tr.x, tr.y, 10, colliders, -1, world))
        continue
      const deadX = tr.x
      const deadY = tr.y
      world.destroyEntity(id)
      this._kills += 1
      const skin = this._enemySkinMountById.get(id)
      if (skin?.parent) skin.parent.removeChild(skin)
      this._enemySkinMountById.delete(id)
      const g = this._guardConeById.get(id)
      if (g?.parent) g.parent.removeChild(g)
      this._guardConeById.delete(id)
      this._guardConeDistanceHistory.delete(id)
      const ring = this._guardInvestigateRingById.get(id)
      if (ring?.parent) ring.parent.removeChild(ring)
      this._guardInvestigateRingById.delete(id)
      if (this._targetEnemyId === id) this._targetEnemyId = null
      this._patrolState.delete(id)
      this._alertNearbyGuardsOnKill(world, id, deadX, deadY)
      break
    }
  }

  _alertNearbyGuardsOnKill (world: WorldLike, deadGuardId: number, x: number, y: number) {
    const guards = world.findEntityIdsByTag('guard')
    for (const gid of guards) {
      if (gid === deadGuardId) continue
      const tr = world.getComponent(gid, COMPONENT_TRANSFORM)
      if (!tr) continue
      if (Math.hypot(tr.x - x, tr.y - y) > this.killInvestigateRadius) continue
      const s = this._patrolState.get(gid)
      if (!s) continue
      s.mode = 'investigateMove'
      s.searchTimer = this.killInvestigateDuration
      // Keep current facing; investigate movement will rotate smoothly before advancing.
      s.investigateTargetX = x
      s.investigateTargetY = y
      s.investigateCenterX = x
      s.investigateCenterY = y
      s.investigatePhase = 'pause'
      s.investigatePhaseTimer = 0.8
      s.investigateScanBase = s.heading
      s.guardPath = []
      s.guardPathIndex = 0
      s.returnX = s.patrolHomeX
      s.returnY = s.patrolHomeY
    }
  }

  _planGuardPath (start: { x: number; y: number }, goal: { x: number; y: number }, colliders: ColliderLike[], guardId: number) {
    const raw = this._findPathWithFallback(
      start,
      goal,
      colliders,
      this.guardRadius,
      this.cellSize,
      guardId
    )
    return this._simplifyPathWithVisibility(
      start,
      raw ?? [],
      colliders,
      this.guardRadius,
      guardId
    )
  }

  _moveGuardAlongPath (tr: TransformLike, state: GuardStateLike, speed: number, dt: number, colliders: ColliderLike[], id: number) {
    if (!Array.isArray(state.guardPath) || !state.guardPath.length) return true
    const pathIndex = state.guardPathIndex ?? 0
    const target = state.guardPath[pathIndex]
    if (!target) return true
    const dx = target.x - tr.x
    const dy = target.y - tr.y
    const d = Math.hypot(dx, dy)
    const step = speed * dt
    if (d <= step) {
      if (this._canOccupyCircle(target.x, target.y, this.guardRadius, colliders, id)) {
        tr.x = target.x
        tr.y = target.y
        state.guardPathIndex = pathIndex + 1
        return (state.guardPathIndex ?? 0) >= state.guardPath.length
      }
      return true
    }
    const ux = dx / Math.max(d, 1e-6)
    const uy = dy / Math.max(d, 1e-6)
    const desiredHeading = Math.atan2(uy, ux)
    const isInvestigatePathing =
      state.mode === 'investigateMove' ||
      (state.mode === 'investigateSearch' && state.investigatePhase === 'walk')
    const turnStep = (isInvestigatePathing ? this.enemyTurnSmoothSpeed : this.patrolTurnSpeed) * dt
    state.heading = smoothAngleStep(state.heading ?? desiredHeading, desiredHeading, turnStep)
    const turnRemaining = Math.abs(normalizeAngle(desiredHeading - state.heading))
    // During investigate movement, fully rotate first, then move.
    if (isInvestigatePathing && turnRemaining > 0.18) {
      state.lastMoveX = 0
      state.lastMoveY = 0
      return false
    }
    const nx = tr.x + ux * step
    const ny = tr.y + uy * step
    if (this._canOccupyCircle(nx, ny, this.guardRadius, colliders, id)) {
      tr.x = nx
      tr.y = ny
      state.lastMoveX = ux
      state.lastMoveY = uy
      return false
    }
    const nxOnly = tr.x + ux * step
    if (this._canOccupyCircle(nxOnly, tr.y, this.guardRadius, colliders, id)) tr.x = nxOnly
    const nyOnly = tr.y + uy * step
    if (this._canOccupyCircle(tr.x, nyOnly, this.guardRadius, colliders, id)) tr.y = nyOnly
    return false
  }

  _drawInvestigateRings (world: WorldLike) {
    const guards = world.findEntityIdsByTag('guard')
    const active = new Set(guards)
    for (const id of guards) {
      const tr = world.getComponent(id, COMPONENT_TRANSFORM)
      const disp = world.getComponent(id, COMPONENT_DISPLAY)
      if (!tr || !disp?.view?.parent) continue
      let g = this._guardInvestigateRingById.get(id)
      if (!g) {
        g = new Graphics()
        g.zIndex = 110
        disp.view.parent.addChild(g)
        this._guardInvestigateRingById.set(id, g)
      }
      g.clear()
      const segments = 42
      const dashStep = (Math.PI * 2) / segments
      for (let i = 0; i < segments; i++) {
        if (i % 2 === 1) continue
        const a0 = i * dashStep
        const a1 = a0 + dashStep * 0.75
        g.arc(tr.x, tr.y, this.killInvestigateRadius, a0, a1)
      }
      g.stroke({ width: 1.5, color: 0xfca5a5, alpha: 0.42 })
    }
    for (const [id, g] of this._guardInvestigateRingById.entries()) {
      if (active.has(id)) continue
      if (g?.parent) g.parent.removeChild(g)
      this._guardInvestigateRingById.delete(id)
    }
  }

  _clearInvestigateRings () {
    for (const ring of this._guardInvestigateRingById.values()) {
      if (ring?.parent) ring.parent.removeChild(ring)
    }
    this._guardInvestigateRingById.clear()
  }

  _resolvePendingClick (world: WorldLike, playerTr: TransformLike, colliders: ColliderLike[]) {
    if (!this._pendingClick) return
    const click = this._pendingClick
    this._pendingClick = null
    const worldTarget = this._screenToWorld(world, click.x, click.y)
    if (this._outsideGoal) {
      const dGoal = Math.hypot(
        worldTarget.x - this._outsideGoal.x,
        worldTarget.y - this._outsideGoal.y
      )
      if (dGoal <= this._outsideGoal.r && world.findEntityIdsByTag('guard').length > 0) {
        this._showToast('Kill all enemies before crossing', 0x991b1b)
        return
      }
    }
    const navRadius = this._playerNavRadius()
    const enemyHit = this._pickEnemyAt(world, worldTarget.x, worldTarget.y)
    if (enemyHit != null) {
      this._targetEnemyId = enemyHit
      this._lastTrackedEnemyPos = null
      const tr = world.getComponent(enemyHit, COMPONENT_TRANSFORM)
      if (tr) this._desiredGoal = { x: tr.x, y: tr.y }
    } else {
      if (
        !this._canOccupyCircle(
          worldTarget.x,
          worldTarget.y,
          navRadius,
          colliders,
          -1
        )
      ) {
        this._showToast('Unreachable location', 0x7f1d1d)
        return
      }
      this._targetEnemyId = null
      this._lastTrackedEnemyPos = null
      this._desiredGoal = worldTarget
    }
    this._assignSmartRoute(
      { x: playerTr.x, y: playerTr.y },
      this._desiredGoal,
      colliders,
      navRadius
    )
  }

  _showToast (message: string, bgColor = 0x7f1d1d) {
    if (!this._uiRoot) return
    if (this._toastRoot?.parent) this._toastRoot.parent.removeChild(this._toastRoot)
    const root = new Container()
    root.zIndex = 260
    const text = new Text({
      text: String(message),
      style: {
        fill: 0xffffff,
        fontSize: 14,
        fontFamily: BUNGEE_FONT
      }
    })
    const padX = 12
    const padY = 8
    const bg = new Graphics()
    bg.roundRect(0, 0, text.width + padX * 2, text.height + padY * 2, 8)
    bg.fill({ color: bgColor, alpha: 0.95 })
    text.position.set(padX, padY)
    root.addChild(bg)
    root.addChild(text)
    root.position.set(
      Math.max(12, Math.round((this._viewW - (text.width + padX * 2)) * 0.5)),
      44
    )
    this._uiRoot.addChild(root)
    this._toastRoot = root
    this._toastTimer = 1.1
  }

  _updateToast (dt: number) {
    if (!this._toastRoot) return
    this._toastTimer -= dt
    if (this._toastTimer <= 0) {
      if (this._toastRoot.parent) this._toastRoot.parent.removeChild(this._toastRoot)
      this._toastRoot = null
      this._toastTimer = 0
      return
    }
    if (this._toastTimer < 0.35) {
      this._toastRoot.alpha = Math.max(0, this._toastTimer / 0.35)
    } else {
      this._toastRoot.alpha = 1
    }
  }

  _updateTargetEnemyTracking (world: WorldLike, playerTr: TransformLike, colliders: ColliderLike[], dt: number, navRadius: number) {
    void dt
    if (this._targetEnemyId == null) return
    if (!world.entities.has(this._targetEnemyId)) {
      this._targetEnemyId = null
      this._lastTrackedEnemyPos = null
      return
    }
    const targetTr = world.getComponent(
      this._targetEnemyId,
      COMPONENT_TRANSFORM
    )
    if (!targetTr) {
      this._targetEnemyId = null
      this._lastTrackedEnemyPos = null
      return
    }
    this._desiredGoal = { x: targetTr.x, y: targetTr.y }
    const movedSinceLastTrack =
      !this._lastTrackedEnemyPos ||
      Math.hypot(
        targetTr.x - this._lastTrackedEnemyPos.x,
        targetTr.y - this._lastTrackedEnemyPos.y
      ) >= 8
    if (!movedSinceLastTrack) return
    this._lastTrackedEnemyPos = { x: targetTr.x, y: targetTr.y }
    this._assignSmartRoute(
      { x: playerTr.x, y: playerTr.y },
      this._desiredGoal,
      colliders,
      navRadius
    )
  }

  _movePlayerAlongPath (dt: number, playerTr: TransformLike, colliders: ColliderLike[], navRadius: number) {
    if (!this._playerPath.length) {
      if (this._desiredGoal) {
        const settleDist = Math.max(2, navRadius * 0.22)
        if (
          Math.hypot(
            this._desiredGoal.x - playerTr.x,
            this._desiredGoal.y - playerTr.y
          ) <= settleDist
        ) {
          // Fully settle at destination to avoid post-arrival jitter.
          if (this._targetEnemyId == null) this._desiredGoal = null
          this._isDirectMove = false
        }
      }
      return
    }
    if (this._isDirectMove && this._desiredGoal) {
      const nearWall = this._distanceToNearestSolid(
        playerTr.x,
        playerTr.y,
        colliders
      )
      if (nearWall < this.playerEdgePreventionDistance) {
        const replanned = this._findPathWithFallback(
          { x: playerTr.x, y: playerTr.y },
          this._desiredGoal,
          colliders,
          navRadius,
          this.cellSize
        )
        this._playerPath = this._simplifyPathWithVisibility(
          { x: playerTr.x, y: playerTr.y },
          replanned ?? [],
          colliders,
          navRadius
        )
        this._playerPathIndex = 0
        this._isDirectMove = false
      }
    }
    const target = this._playerPath[this._playerPathIndex]
    if (!target) return
    const dx = target.x - playerTr.x
    const dy = target.y - playerTr.y
    const d = Math.hypot(dx, dy)
    const step = this.playerMoveSpeed * dt
    if (d > 0.001) {
      const targetRotation = Math.atan2(dy, dx) + this.playerFacingAngleOffset
      playerTr.rotation = smoothAngleStep(
        playerTr.rotation,
        targetRotation,
        this.playerTurnSmoothSpeed * dt
      )
    }
    if (d <= step) {
      if (this._canOccupyCircle(target.x, target.y, navRadius, colliders, -1)) {
        playerTr.x = target.x
        playerTr.y = target.y
        this._playerPathIndex += 1
        if (this._playerPathIndex >= this._playerPath.length) {
          this._playerPath = []
          this._playerPathIndex = 0
          this._isDirectMove = false
          if (this._targetEnemyId == null) this._desiredGoal = null
        }
      } else {
        this._playerPath = []
        this._playerPathIndex = 0
      }
      return
    }
    const nx = playerTr.x + (dx / d) * step
    const ny = playerTr.y + (dy / d) * step
    if (this._canOccupyCircle(nx, ny, navRadius, colliders, -1)) {
      playerTr.x = nx
      playerTr.y = ny
      playerTr.scaleX = dx >= 0 ? 1 : -1
    } else {
      // Slide along wall edges when corner contact blocks direct movement.
      let slid = false
      const nxOnly = playerTr.x + (dx / d) * step
      if (this._canOccupyCircle(nxOnly, playerTr.y, navRadius, colliders, -1)) {
        playerTr.x = nxOnly
        playerTr.scaleX = dx >= 0 ? 1 : -1
        slid = true
      }
      const nyOnly = playerTr.y + (dy / d) * step
      if (this._canOccupyCircle(playerTr.x, nyOnly, navRadius, colliders, -1)) {
        playerTr.y = nyOnly
        slid = true
      }
      if (slid) return
      // Dynamic reroute when a moving obstacle or tight wall blocks current segment.
      if (this._desiredGoal) {
        this._assignSmartRoute(
          { x: playerTr.x, y: playerTr.y },
          this._desiredGoal,
          colliders,
          navRadius
        )
      } else {
        this._playerPath = []
        this._playerPathIndex = 0
        this._isDirectMove = false
      }
    }
  }

  _assignSmartRoute (start: PointLike, goal: PointLike, colliders: ColliderLike[], navRadius: number) {
    if (this._hasClearCorridor(start, goal, navRadius, colliders)) {
      this._playerPath = [goal]
      this._playerPathIndex = 0
      this._isDirectMove = true
      return
    }
    const raw = this._findPathWithFallback(
      start,
      goal,
      colliders,
      navRadius,
      this.cellSize
    )
    const path = this._simplifyPathWithVisibility(
      start,
      raw ?? [],
      colliders,
      navRadius
    )
    this._playerPath = path
    this._playerPathIndex = 0
    this._isDirectMove = false
  }

  _drawPath () {
    if (!this._pathGraphics) return
    const g = this._pathGraphics
    g.clear()
    if (
      !this._playerPath.length ||
      this._playerPathIndex >= this._playerPath.length
    )
      return
    const route = [
      { x: this._lastPlayerPos?.x ?? 0, y: this._lastPlayerPos?.y ?? 0 },
      ...this._playerPath.slice(this._playerPathIndex)
    ]
    if (route.length < 2) return
    g.moveTo(route[0].x, route[0].y)
    if (route.length === 2) {
      g.lineTo(route[1].x, route[1].y)
    } else {
      // Rounded-corner polyline matching movement route, without sharp joints.
      const cornerRadius = Math.max(6, Math.min(18, this.cellSize * 0.35))
      for (let i = 1; i < route.length - 1; i++) {
        const p0 = route[i - 1]
        const p1 = route[i]
        const p2 = route[i + 1]
        const vInX = p1.x - p0.x
        const vInY = p1.y - p0.y
        const vOutX = p2.x - p1.x
        const vOutY = p2.y - p1.y
        const lenIn = Math.hypot(vInX, vInY) || 1
        const lenOut = Math.hypot(vOutX, vOutY) || 1
        const r = Math.min(cornerRadius, lenIn * 0.45, lenOut * 0.45)
        const inNx = vInX / lenIn
        const inNy = vInY / lenIn
        const outNx = vOutX / lenOut
        const outNy = vOutY / lenOut
        const cornerStart = { x: p1.x - inNx * r, y: p1.y - inNy * r }
        const cornerEnd = { x: p1.x + outNx * r, y: p1.y + outNy * r }
        g.lineTo(cornerStart.x, cornerStart.y)
        g.quadraticCurveTo(p1.x, p1.y, cornerEnd.x, cornerEnd.y)
      }
      const last = route[route.length - 1]
      g.lineTo(last.x, last.y)
    }
    g.stroke({ width: 10, color: 0xfacc15, alpha: 1 })
    const end = route[route.length - 1]
    const prev = route[Math.max(route.length - 2, 0)]
    const vx = end.x - prev.x
    const vy = end.y - prev.y
    const len = Math.hypot(vx, vy) || 1
    const ux = vx / len
    const uy = vy / len
    const ax = end.x + ux * 8
    const ay = end.y + uy * 8
    const arrowLen = 24
    const arrowHalf = 12
    g.moveTo(ax, ay)
    g.lineTo(
      ax - ux * arrowLen - uy * arrowHalf,
      ay - uy * arrowLen + ux * arrowHalf
    )
    g.moveTo(ax, ay)
    g.lineTo(
      ax - ux * arrowLen + uy * arrowHalf,
      ay - uy * arrowLen - ux * arrowHalf
    )
    g.stroke({ width: 6, color: 0xfacc15, alpha: 1 })
  }

  _drawTargetRing (world: WorldLike) {
    if (!this._targetRing) return
    const g = this._targetRing
    g.clear()
    if (this._targetEnemyId == null || !world.entities.has(this._targetEnemyId))
      return
    const tr = world.getComponent(this._targetEnemyId, COMPONENT_TRANSFORM)
    if (!tr) return
    const outerR = this.guardRadius + 12
    const innerR = Math.max(8, outerR * 0.52)
    const tickOuter = outerR + 12
    const tickInner = outerR - 4
    const x = tr.x
    const y = tr.y
    const color = 0xef4444
    const alpha = 0.97

    // outer and inner rings
    g.circle(x, y, outerR)
    g.stroke({ width: 3, color, alpha })
    g.circle(x, y, innerR)
    g.stroke({ width: 3, color, alpha })

    // top, right, bottom, left target ticks
    g.moveTo(x, y - tickOuter)
    g.lineTo(x, y - tickInner)
    g.moveTo(x + tickInner, y)
    g.lineTo(x + tickOuter, y)
    g.moveTo(x, y + tickInner)
    g.lineTo(x, y + tickOuter)
    g.moveTo(x - tickOuter, y)
    g.lineTo(x - tickInner, y)
    g.stroke({ width: 3, color, alpha })
  }

  _drawGuardCone (world: WorldLike, id: number, tr: TransformLike, visionRange: number, fovDeg: number, colliders: ColliderLike[]) {
    const disp = world.getComponent(id, COMPONENT_DISPLAY)
    if (!disp?.view?.parent) return
    let g = this._guardConeById.get(id)
    if (!g) {
      g = new Graphics()
      g.zIndex = 120
      disp.view.parent.addChild(g)
      this._guardConeById.set(id, g)
    }
    g.clear()
    const state = this._patrolState.get(id)
    const heading = state?.heading ?? (tr.scaleX >= 0 ? 0 : Math.PI)
    // Keep cone anchor in front of enemy regardless of rotation.
    const forwardX = Math.cos(heading)
    const forwardY = Math.sin(heading)
    const coneOriginX = tr.x + forwardX * 10
    const coneOriginY = tr.y + forwardY * 10
    const half = (fovDeg * Math.PI) / 360
    const a0 = heading - half
    const a1 = heading + half
    const rays = Math.max(40, Math.round(fovDeg / 2))
    const prevHits = this._guardConeDistanceHistory.get(id) ?? []
    const rawHits = new Array(rays + 1).fill(visionRange)
    const nextHits = []
    const temporalSmooth = 0.28
    const spatialBlend = 0.5
    for (let i = 0; i <= rays; i++) {
      const t = i / Math.max(1, rays)
      const a = a0 + (a1 - a0) * t
      const ux = Math.cos(a)
      const uy = Math.sin(a)
      rawHits[i] = castDistanceToSolid(
        coneOriginX,
        coneOriginY,
        ux,
        uy,
        visionRange,
        colliders,
        id
      )
    }

    // Spatially smooth neighboring rays to prevent corner-vertex flicker.
    const spatialHits = rawHits.map((v, i) => {
      const l = rawHits[Math.max(0, i - 1)]
      const r = rawHits[Math.min(rays, i + 1)]
      const avg = (l + v + r) / 3
      return v * (1 - spatialBlend) + avg * spatialBlend
    })

    g.moveTo(coneOriginX, coneOriginY)
    for (let i = 0; i <= rays; i++) {
      const t = i / Math.max(1, rays)
      const a = a0 + (a1 - a0) * t
      const ux = Math.cos(a)
      const uy = Math.sin(a)
      const filtered = spatialHits[i] ?? visionRange
      const prev = prevHits[i] ?? filtered
      const hitDist = prev + (filtered - prev) * temporalSmooth
      nextHits[i] = hitDist
      const px = coneOriginX + ux * hitDist
      const py = coneOriginY + uy * hitDist
      if (i === 0) g.lineTo(px, py)
      else g.lineTo(px, py)
    }
    this._guardConeDistanceHistory.set(id, nextHits)
    g.lineTo(coneOriginX, coneOriginY)
    g.closePath()
    g.fill({ color: 0xef4444, alpha: 0.2 })
    g.moveTo(coneOriginX, coneOriginY)
    for (let i = 0; i <= rays; i++) {
      const t = i / Math.max(1, rays)
      const a = a0 + (a1 - a0) * t
      const ux = Math.cos(a)
      const uy = Math.sin(a)
      const hitDist = nextHits[i] ?? visionRange
      g.lineTo(coneOriginX + ux * hitDist, coneOriginY + uy * hitDist)
    }
    g.lineTo(coneOriginX, coneOriginY)
    g.closePath()
    g.stroke({ width: 1.2, color: 0xdc2626, alpha: 0.65 })
  }

  _screenToWorld (world: WorldLike, sx: number, sy: number) {
    const camEnt = [...world.entities.values()].find(
      (e: any) => !!e?.components?.get?.(COMPONENT_CAMERA)
    ) as any
    const cam = camEnt?.components?.get?.(COMPONENT_CAMERA)
    if (!cam) return { x: sx, y: sy }
    let tx = this._viewW / 2
    let ty = this._viewH / 2
    let targetId = cam.followEntityId
    if (targetId == null && cam.followMetaName)
      targetId = world.findEntityIdByMetaName(cam.followMetaName)
    if (targetId != null) {
      const tr = world.getComponent(targetId, COMPONENT_TRANSFORM)
      if (tr) {
        tx = tr.x + Number(cam.offsetX ?? 0)
        ty = tr.y + Number(cam.offsetY ?? 0)
      }
    }
    if (cam.boundLeft != null) tx = Math.max(tx, Number(cam.boundLeft))
    if (cam.boundRight != null) tx = Math.min(tx, Number(cam.boundRight))
    if (cam.boundTop != null) ty = Math.max(ty, Number(cam.boundTop))
    if (cam.boundBottom != null) ty = Math.min(ty, Number(cam.boundBottom))
    const zoom = Math.max(0.2, Number(cam.zoom ?? 1) || 1)
    return {
      x: (sx - this._viewW / 2) / zoom + tx,
      y: (sy - this._viewH / 2) / zoom + ty
    }
  }

  _guardDoorApproachPad (radius: number) {
    return Math.max(
      40,
      radius + this.guardWallSafeDistance + this.playerWallSafeDistance + 14
    )
  }

  _guardShouldBypassClosedDoor (x: number, y: number, c: ColliderLike, radius: number, forPathPlanning: boolean) {
    if (forPathPlanning) return false
    const pad = this._guardDoorApproachPad(radius)
    return (
      x >= c.left - pad &&
      x <= c.right + pad &&
      y >= c.top - pad &&
      y <= c.bottom + pad
    )
  }

  _markNearbyDoorsOpenForGuard (x: number, y: number, radius: number, colliders: ColliderLike[]) {
    for (const c of colliders) {
      if (c.kind !== 'solid') continue
      if (!this._doorIds.has(c.entityId)) continue
      if (!this._guardShouldBypassClosedDoor(x, y, c, radius, false)) continue
      this._doorOpenUntilById.set(c.entityId, this._simTime + this.doorOpenDuration)
    }
  }

  _canOccupyCircle (x: number, y: number, radius: number, colliders: ColliderLike[], ignoreEntityId: number, forPathPlanning = false) {
    const a = {
      left: x - radius,
      right: x + radius,
      top: y - radius,
      bottom: y + radius
    }
    const isPlayer = ignoreEntityId === -1
    for (const c of colliders) {
      if (c.entityId === ignoreEntityId || c.kind !== 'solid') continue
      if (c.entityId === this._finalExitDoorId && this._exitDoorUnlocked) continue
      const isDoor = this._doorIds.has(c.entityId)
      // Guards plan routes through doorways; real movement still uses closed doors + open delay.
      if (isDoor && !isPlayer && forPathPlanning) continue
      if (isDoor && !isPlayer) {
        const openUntil = this._doorOpenUntilById.get(c.entityId) ?? 0
        if (openUntil > this._simTime) continue
        if (
          !isPlayer &&
          this._guardShouldBypassClosedDoor(x, y, c, radius, forPathPlanning)
        ) {
          this._doorOpenUntilById.set(
            c.entityId,
            this._simTime + this.doorOpenDuration
          )
          continue
        }
      }
      if (
        !(
          a.right <= c.left ||
          a.left >= c.right ||
          a.bottom <= c.top ||
          a.top >= c.bottom
        )
      ) {
        // Guards can open doors; player is always blocked by doors.
        if (isDoor && !isPlayer) {
          const cx = (c.left + c.right) * 0.5
          const cy = (c.top + c.bottom) * 0.5
          const interactDist = Math.max(
            24,
            radius + Math.max(28, this.doorSpan * 0.35)
          )
          if (Math.hypot(x - cx, y - cy) <= interactDist) {
            this._doorOpenUntilById.set(
              c.entityId,
              this._simTime + this.doorOpenDuration
            )
          }
        }
        return false
      }
    }
    const safeGap = isPlayer ? this.playerWallSafeDistance : this.guardWallSafeDistance
    if (safeGap > 0) {
      const nearest = this._distanceToNearestBlockingSolid(
        x,
        y,
        colliders,
        ignoreEntityId,
        forPathPlanning,
        radius
      )
      if (nearest < radius + safeGap) return false
    }
    return true
  }

  _distanceToNearestBlockingSolid (
    x: number,
    y: number,
    colliders: ColliderLike[],
    ignoreEntityId: number,
    forPathPlanning = false,
    radius: number | null = null
  ) {
    const isPlayer = ignoreEntityId === -1
    let best = Infinity
    for (const c of colliders) {
      if (c.entityId === ignoreEntityId || c.kind !== 'solid') continue
      if (c.entityId === this._finalExitDoorId && this._exitDoorUnlocked) continue
      const isDoor = this._doorIds.has(c.entityId)
      if (isDoor && !isPlayer && forPathPlanning) continue
      if (isDoor && !isPlayer) {
        const openUntil = this._doorOpenUntilById.get(c.entityId) ?? 0
        if (openUntil > this._simTime) continue
        if (
          !forPathPlanning &&
          radius != null &&
          this._guardShouldBypassClosedDoor(x, y, c, radius, false)
        ) {
          continue
        }
      }
      const cx = Math.max(c.left, Math.min(x, c.right))
      const cy = Math.max(c.top, Math.min(y, c.bottom))
      const d = Math.hypot(x - cx, y - cy)
      if (d < best) best = d
    }
    return Number.isFinite(best) ? best : Infinity
  }

  _pickEnemyAt (world: WorldLike, x: number, y: number) {
    const guards = world.findEntityIdsByTag('guard')
    for (const id of guards) {
      const tr = world.getComponent(id, COMPONENT_TRANSFORM)
      if (!tr) continue
      if (Math.hypot(tr.x - x, tr.y - y) <= this.guardRadius + 8) return id
    }
    return null
  }

  _playerNavRadius () {
    // Slightly smaller nav radius reduces sticky corner collisions on tight wall edges.
    return Math.max(6, this.playerRadius - 1.75)
  }

  _hasClearCorridor (start: PointLike, goal: PointLike, radius: number, colliders: ColliderLike[], moverEntityId = -1) {
    const pathPlanning = moverEntityId !== -1
    const dx = goal.x - start.x
    const dy = goal.y - start.y
    const dist = Math.hypot(dx, dy)
    if (dist < 1) return true
    const step = Math.max(8, radius * 0.6)
    const n = Math.max(1, Math.ceil(dist / step))
    for (let i = 1; i <= n; i++) {
      const t = i / n
      const x = start.x + dx * t
      const y = start.y + dy * t
      if (
        !this._canOccupyCircle(
          x,
          y,
          radius,
          colliders,
          moverEntityId,
          pathPlanning
        )
      )
        return false
    }
    return true
  }

  _simplifyPathWithVisibility (start: PointLike, path: PointLike[], colliders: ColliderLike[], radius: number, moverEntityId = -1) {
    if (!Array.isArray(path) || path.length <= 1)
      return Array.isArray(path) ? path : []
    const out = []
    let anchor = { x: start.x, y: start.y }
    let i = 0
    while (i < path.length) {
      let best = i
      for (let j = i; j < path.length; j++) {
        const candidate = path[j]!
        if (
          this._hasClearCorridor(anchor, candidate, radius, colliders, moverEntityId)
        ) {
          best = j
        } else {
          break
        }
      }
      out.push(path[best]!)
      anchor = path[best]!
      i = best + 1
    }
    return out
  }

  _spawnBullet (world: WorldLike, x0: number, y0: number, x1: number, y1: number) {
    if (!this._entityBuilder || !this._registry || !this._stage || !this._spawnOpts) return
    const dx = x1 - x0
    const dy = y1 - y0
    const d = Math.hypot(dx, dy) || 1
    const aimAngleDeg = (Math.atan2(dy, dx) * 180) / Math.PI
    const entityId = this._entityBuilder.spawnFromInstance(
      world,
      this._registry,
      this._stage,
      this._spawnOpts,
      {
        id: `enemyBullet_${Date.now()}_${Math.floor(Math.random() * 1e6)}`,
        plugin: 'Sprite',
        layer: 'Top',
        tags: ['enemyBullet'],
        transform: { x: x0, y: y0, rotation: 0, scaleX: 8, scaleY: 8 },
        sprite: { shape: 'circle', tint: 0xf87171, anchorX: 0.5, anchorY: 0.5 },
        instanceVariables: {
          startX: x0,
          startY: y0,
          targetX: x1,
          targetY: y1,
          aimAngleDeg,
          maxDistance: d,
          travelled: 0,
          prevX: x0,
          prevY: y0
        },
        behaviors: [
          {
            type: 'bullet',
            speed: this.bulletSpeed,
            angle: aimAngleDeg,
            gravity: 0,
            acceleration: 0,
            destroyOnSolid: true
          }
        ]
      }
    )
    this._bulletEntityIds.add(entityId)
  }

  _updateBullets (world: WorldLike, colliders: ColliderLike[], playerTr: TransformLike) {
    const bulletIds = world.findEntityIdsByTag('enemyBullet')
    for (const bulletId of bulletIds) {
      const bTr = world.getComponent(bulletId, COMPONENT_TRANSFORM)
      const bIv = world.getComponent(bulletId, COMPONENT_INSTANCE_VARIABLES)
      if (!bTr || !bIv) continue
      const prevX = Number(bIv.get('prevX') ?? bTr.x)
      const prevY = Number(bIv.get('prevY') ?? bTr.y)
      const segLen = Math.hypot(bTr.x - prevX, bTr.y - prevY)
      const travelled = Number(bIv.get('travelled') ?? 0) + segLen
      const maxDistance = Number(bIv.get('maxDistance') ?? Number.POSITIVE_INFINITY)

      const hitWall = rayBlockedSolids(
        prevX,
        prevY,
        bTr.x,
        bTr.y,
        6,
        colliders,
        bulletId,
        world
      )
      const hitPlayer = segmentIntersectsCircle(
        prevX,
        prevY,
        bTr.x,
        bTr.y,
        playerTr.x,
        playerTr.y,
        this.playerRadius + 6
      )
      const reachedTarget = travelled >= maxDistance

      if (hitPlayer) {
        this._playerHp = Math.max(0, this._playerHp - this.bulletDamage)
        world.destroyEntity(bulletId)
        if (this._playerHp <= 0) {
          this._showResult('MISSION FAILED', 0xfca5a5)
          this._gameOver = true
        }
        continue
      }
      if (hitWall || reachedTarget) {
        world.destroyEntity(bulletId)
        continue
      }
      bIv.set('travelled', travelled)
      bIv.set('prevX', bTr.x)
      bIv.set('prevY', bTr.y)
    }
  }

  _clearBullets (world = this._world) {
    if (!world) return
    const bulletIds = world.findEntityIdsByTag('enemyBullet')
    for (const bulletId of bulletIds) world.destroyEntity(bulletId)
    this._bulletEntityIds.clear()
  }

  _playerAabb (tr: TransformLike) {
    return {
      left: tr.x - this.playerRadius,
      right: tr.x + this.playerRadius,
      top: tr.y - this.playerRadius,
      bottom: tr.y + this.playerRadius
    }
  }

  _findPathWithFallback (start: PointLike, goal: PointLike, colliders: ColliderLike[], radius: number, cell: number, moverEntityId = -1) {
    const pathPlanning = moverEntityId !== -1
    const primary = this._findPath(
      start,
      goal,
      colliders,
      radius,
      cell,
      moverEntityId
    )
    if (primary?.length) return primary

    // If exact goal is blocked or unreachable, pick nearest reachable alternative.
    const bounds = this._solidBounds(colliders)
    const toCell = (p: PointLike) => ({
      cx: Math.round((p.x - bounds.minX) / cell),
      cy: Math.round((p.y - bounds.minY) / cell)
    })
    const toWorld = (cx: number, cy: number) => ({
      x: bounds.minX + cx * cell,
      y: bounds.minY + cy * cell
    })
    const g = toCell(goal)
    const maxRing = 14
    for (let ring = 1; ring <= maxRing; ring++) {
      /** @type {{x:number,y:number,d:number}[]} */
      const candidates = []
      for (let x = g.cx - ring; x <= g.cx + ring; x++) {
        candidates.push({ x, y: g.cy - ring, d: 0 })
        candidates.push({ x, y: g.cy + ring, d: 0 })
      }
      for (let y = g.cy - ring + 1; y <= g.cy + ring - 1; y++) {
        candidates.push({ x: g.cx - ring, y, d: 0 })
        candidates.push({ x: g.cx + ring, y, d: 0 })
      }
      for (const c of candidates) {
        const wp = toWorld(c.x, c.y)
        if (
          !this._canOccupyCircle(
            wp.x,
            wp.y,
            radius,
            colliders,
            moverEntityId,
            pathPlanning
          )
        )
          continue
        c.d = Math.hypot(wp.x - goal.x, wp.y - goal.y)
      }
      candidates.sort((a, b) => a.d - b.d)
      for (const c of candidates) {
        const wp = toWorld(c.x, c.y)
        if (
          !this._canOccupyCircle(
            wp.x,
            wp.y,
            radius,
            colliders,
            moverEntityId,
            pathPlanning
          )
        )
          continue
        const p = this._findPath(
          start,
          wp,
          colliders,
          radius,
          cell,
          moverEntityId
        )
        if (p?.length) return p
      }
    }
    return null
  }

  _findPath (start: PointLike, goal: PointLike, colliders: ColliderLike[], radius: number, cell: number, moverEntityId = -1) {
    const pathPlanning = moverEntityId !== -1
    const bounds = this._solidBounds(colliders)
    const toCell = (p: PointLike) => ({
      cx: Math.round((p.x - bounds.minX) / cell),
      cy: Math.round((p.y - bounds.minY) / cell)
    })
    const toWorld = (cx: number, cy: number) => ({
      x: bounds.minX + cx * cell,
      y: bounds.minY + cy * cell
    })
    const s = toCell(start)
    const g = toCell(goal)
    const key = (cx: number, cy: number) => `${cx},${cy}`
    const open = [s]
    const closed = new Set()
    const came = new Map()
    const gScore = new Map([[key(s.cx, s.cy), 0]])
    const fScore = new Map([
      [key(s.cx, s.cy), Math.hypot(g.cx - s.cx, g.cy - s.cy)]
    ])
    // 4-way grid navigation only (no diagonals) for cleaner row/column routes.
    const cardinal: Array<[number, number]> = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1]
    ]
    let loops = 0
    while (open.length && loops < 9000) {
      loops += 1
      let bestIdx = 0
      let bestF = Infinity
      for (let i = 0; i < open.length; i++) {
        const k = key(open[i]!.cx, open[i]!.cy)
        const f = fScore.get(k) ?? Infinity
        if (f < bestF) {
          bestF = f
          bestIdx = i
        }
      }
      const current = open.splice(bestIdx, 1)[0]!
      const currentKey = key(current.cx, current.cy)
      if (closed.has(currentKey)) continue
      closed.add(currentKey)
      if (current.cx === g.cx && current.cy === g.cy) {
        const out = []
        let ck = currentKey
        while (ck) {
          const [sx, sy] = ck.split(',').map(Number)
          out.push(toWorld(sx ?? 0, sy ?? 0))
          ck = came.get(ck)
        }
        out.reverse()
        out[out.length - 1] = goal
        return out
      }
      const cKey = currentKey
      const cg = gScore.get(cKey) ?? Infinity
      const neighbors = this._orderedCardinalNeighbors(
        current.cx,
        current.cy,
        g.cx,
        g.cy,
        cardinal
      )
      for (const [dx, dy] of neighbors) {
        const nx = current.cx + dx
        const ny = current.cy + dy
        const nk = key(nx, ny)
        if (closed.has(nk)) continue
        const wp = toWorld(nx, ny)
        if (
          !this._canOccupyCircle(
            wp.x,
            wp.y,
            radius,
            colliders,
            moverEntityId,
            pathPlanning
          )
        )
          continue
        const step = Math.hypot(dx, dy)
        const ng = cg + step
        if (ng >= (gScore.get(nk) ?? Infinity)) continue
        came.set(nk, cKey)
        gScore.set(nk, ng)
        fScore.set(nk, ng + Math.hypot(g.cx - nx, g.cy - ny))
        if (!open.some(n => n.cx === nx && n.cy === ny))
          open.push({ cx: nx, cy: ny })
      }
    }
    return null
  }

  _solidBounds (colliders: ColliderLike[]) {
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    for (const c of colliders) {
      if (c.kind !== 'solid') continue
      minX = Math.min(minX, c.left)
      minY = Math.min(minY, c.top)
      maxX = Math.max(maxX, c.right)
      maxY = Math.max(maxY, c.bottom)
    }
    if (!Number.isFinite(minX))
      return { minX: 0, minY: 0, maxX: this._viewW, maxY: this._viewH }
    return { minX, minY, maxX, maxY }
  }

  _orderedCardinalNeighbors (cx: number, cy: number, gx: number, gy: number, cardinal: Array<[number, number]>) {
    const sx = Math.sign(gx - cx)
    const sy = Math.sign(gy - cy)
    const xFirst = Math.abs(gx - cx) >= Math.abs(gy - cy)
    const primary = xFirst
      ? [
          [sx || 1, 0],
          [0, sy || 1],
          [-(sx || 1), 0],
          [0, -(sy || 1)]
        ]
      : [
          [0, sy || 1],
          [sx || 1, 0],
          [0, -(sy || 1)],
          [-(sx || 1), 0]
        ]
    const out: Array<[number, number]> = []
    for (const [dx, dy] of primary) {
      if (
        cardinal.some((n) => n[0] === dx && n[1] === dy) &&
        !out.some((n) => n[0] === dx && n[1] === dy)
      ) {
        out.push([Number(dx), Number(dy)])
      }
    }
    for (const [dx, dy] of cardinal) {
      if (!out.some((n) => n[0] === dx && n[1] === dy)) out.push([dx, dy])
    }
    return out
  }

  _distanceToNearestSolid (x: number, y: number, colliders: ColliderLike[]) {
    let best = Infinity
    for (const c of colliders) {
      if (c.kind !== 'solid') continue
      const cx = Math.max(c.left, Math.min(x, c.right))
      const cy = Math.max(c.top, Math.min(y, c.bottom))
      const d = Math.hypot(x - cx, y - cy)
      if (d < best) best = d
    }
    return Number.isFinite(best) ? best : Infinity
  }

  _resolvePlayerWallPenetration (playerTr: TransformLike, colliders: ColliderLike[], radius: number) {
    this._resolveCircleWallPenetration(playerTr, colliders, radius, -1)
  }

  _recoverPlayerIfStuck (dt: number, playerTr: TransformLike, colliders: ColliderLike[], navRadius: number) {
    const last = this._playerLastMotionPos
    if (!last) {
      this._playerLastMotionPos = { x: playerTr.x, y: playerTr.y }
      this._playerStuckTimer = 0
      return
    }
    const movedDist = Math.hypot(playerTr.x - last.x, playerTr.y - last.y)
    const hasMoveIntent =
      this._playerPathIndex < this._playerPath.length ||
      (this._targetEnemyId != null && this._desiredGoal != null)
    if (hasMoveIntent && movedDist < 0.35) this._playerStuckTimer += dt
    else this._playerStuckTimer = 0
    if (this._playerStuckTimer > 0.35) {
      this._resolveCircleWallPenetration(playerTr, colliders, navRadius, -1)
      const respawned = this._respawnPlayerNearStuck(playerTr, navRadius, colliders)
      if (!respawned) this._tryNudgeOutOfCorners(playerTr, navRadius, colliders, -1)
      if (this._desiredGoal) {
        this._assignSmartRoute(
          { x: playerTr.x, y: playerTr.y },
          this._desiredGoal,
          colliders,
          navRadius
        )
      }
      this._playerStuckTimer = 0
    }
    this._playerLastMotionPos.x = playerTr.x
    this._playerLastMotionPos.y = playerTr.y
  }

  _respawnPlayerNearStuck (playerTr: TransformLike, navRadius: number, colliders: ColliderLike[]) {
    const step = 10
    let preferred: [number, number] | null = null
    let bestOverlap = 0
    for (const c of colliders) {
      if (c.kind !== 'solid') continue
      const l = playerTr.x - navRadius
      const r = playerTr.x + navRadius
      const t = playerTr.y - navRadius
      const b = playerTr.y + navRadius
      const overlapX = Math.min(r, c.right) - Math.max(l, c.left)
      const overlapY = Math.min(b, c.bottom) - Math.max(t, c.top)
      if (overlapX <= 0 || overlapY <= 0) continue
      const minOv = Math.min(overlapX, overlapY)
      if (minOv <= bestOverlap) continue
      bestOverlap = minOv
      if (overlapX < overlapY) {
        preferred = playerTr.x < (c.left + c.right) * 0.5 ? [-1, 0] : [1, 0]
      } else {
        preferred = playerTr.y < (c.top + c.bottom) * 0.5 ? [0, -1] : [0, 1]
      }
    }

    const dirs = [
      preferred,
      [1, 0],
      [-1, 0],
      [0, -1],
      [0, 1]
    ].filter((v): v is [number, number] => Array.isArray(v))
    const uniqueDirs: Array<[number, number]> = []
    for (const d of dirs) {
      if (!uniqueDirs.some(v => v[0] === d[0] && v[1] === d[1])) uniqueDirs.push(d)
    }
    for (const [dx, dy] of uniqueDirs) {
      const nx = playerTr.x + dx * step
      const ny = playerTr.y + dy * step
      if (!this._canOccupyCircle(nx, ny, navRadius, colliders, -1)) continue
      playerTr.x = nx
      playerTr.y = ny
      return true
    }
    return false
  }

  _tryNudgeOutOfCorners (tr: TransformLike, radius: number, colliders: ColliderLike[], ignoreEntityId: number) {
    const dirs = 16
    for (let ring = 1; ring <= 4; ring++) {
      const dist = ring * Math.max(2, radius * 0.35)
      for (let i = 0; i < dirs; i++) {
        const a = (i / dirs) * Math.PI * 2
        const nx = tr.x + Math.cos(a) * dist
        const ny = tr.y + Math.sin(a) * dist
        if (!this._canOccupyCircle(nx, ny, radius, colliders, ignoreEntityId)) continue
        tr.x = nx
        tr.y = ny
        return true
      }
    }
    return false
  }

  _resolveCircleWallPenetration (tr: TransformLike, colliders: ColliderLike[], radius: number, ignoreEntityId = -1) {
    const isPlayer = ignoreEntityId === -1
    const maxIters = 6
    const skin = 0.03
    const minPush = 0.02
    const maxPushPerIter = Math.max(2, radius * 0.5)
    for (let iter = 0; iter < maxIters; iter++) {
      let pushX = 0
      let pushY = 0
      let hadOverlap = false
      for (const c of colliders) {
        if (c.entityId === ignoreEntityId) continue
        if (c.kind !== 'solid') continue
        if (c.entityId === this._finalExitDoorId && this._exitDoorUnlocked) continue
        if (this._doorIds.has(c.entityId)) {
          if (!isPlayer) {
            const openUntil = this._doorOpenUntilById.get(c.entityId) ?? 0
            if (openUntil > this._simTime) continue
          }
        }
        const l = tr.x - radius
        const r = tr.x + radius
        const t = tr.y - radius
        const b = tr.y + radius
        const overlapX = Math.min(r, c.right) - Math.max(l, c.left)
        const overlapY = Math.min(b, c.bottom) - Math.max(t, c.top)
        if (overlapX <= 0 || overlapY <= 0) continue
        hadOverlap = true

        // Build a stable MTV contribution per overlap; summing avoids axis flip jitter.
        if (overlapX < overlapY) {
          const midX = (c.left + c.right) * 0.5
          const dir = tr.x <= midX ? -1 : 1
          pushX += dir * (overlapX + skin)
        } else {
          const midY = (c.top + c.bottom) * 0.5
          const dir = tr.y <= midY ? -1 : 1
          pushY += dir * (overlapY + skin)
        }
      }
      if (!hadOverlap) break

      const mag = Math.hypot(pushX, pushY)
      if (mag < minPush) break
      const clamped = Math.min(mag, maxPushPerIter)
      tr.x += (pushX / mag) * clamped
      tr.y += (pushY / mag) * clamped
    }
  }

  _rebuildProceduralMap (world: WorldLike) {
    if (!world || !this._entityBuilder || !this._registry || !this._stage || !this._spawnOpts)
      return
    this._proceduralMapReady = false
    this._doorIds.clear()
    this._doorOpenUntilById.clear()
    this._finalExitDoorId = null
    this._exitDoorUnlocked = false
    this._outsideGoal = null
    this._despawnStaticMapEntities(world)
    const layout = this._buildProceduralLayout()
    this._spawnProceduralLayout(world, layout)
    this._configureCameraBounds(world, layout)
    this._proceduralMapReady = true
  }

  _despawnStaticMapEntities (world: WorldLike) {
    const toDelete = new Set([
      ...world.findEntityIdsByObjectType('floorTile'),
      ...world.findEntityIdsByObjectType('wallBlock'),
      ...world.findEntityIdsByObjectType('doorBlock'),
      ...world.findEntityIdsByObjectType('guardAgent'),
      ...world.findEntityIdsByObjectType('playerAgent'),
      ...world.findEntityIdsByObjectType('exitZone')
    ])
    for (const id of toDelete) world.destroyEntity(id)
  }

  _spawnFromType (world: WorldLike, type: string, transform: Record<string, unknown>, extra: Record<string, unknown> = {}) {
    return this._entityBuilder.spawnFromInstance(
      world,
      this._registry,
      this._stage,
      this._spawnOpts,
      {
        type,
        transform,
        ...extra
      }
    )
  }

  _buildProceduralLayout () {
    const roomsW = 20
    const roomsH = 10
    // 0.6x0.6 room cell relative to original 1x1 size (200).
    const roomSize = 120
    const wallThickness = 20
    const worldW = roomsW * roomSize
    const worldH = roomsH * roomSize
    const half = roomSize * 0.5
    const playerCell = { x: 0, y: Math.floor(Math.random() * roomsH) }
    const exitCell = { x: roomsW - 1, y: Math.floor(Math.random() * roomsH) }
    const exitDoorY = exitCell.y * roomSize + half
    const openRight = Array.from({ length: roomsH }, () => Array(roomsW).fill(false))
    const openDown = Array.from({ length: roomsH }, () => Array(roomsW).fill(false))
    const visited = Array.from({ length: roomsH }, () => Array(roomsW).fill(false))
    const stack: Array<{ x: number; y: number }> = [{ x: 0, y: 0 }]
    visited[0]![0] = true
    while (stack.length) {
      const cur = stack[stack.length - 1]!
      const nbrs: Array<{ x: number; y: number; d: 'L' | 'R' | 'U' | 'D' }> = []
      if (cur.x > 0 && !visited[cur.y]![cur.x - 1]) nbrs.push({ x: cur.x - 1, y: cur.y, d: 'L' })
      if (cur.x < roomsW - 1 && !visited[cur.y]![cur.x + 1]) nbrs.push({ x: cur.x + 1, y: cur.y, d: 'R' })
      if (cur.y > 0 && !visited[cur.y - 1]![cur.x]) nbrs.push({ x: cur.x, y: cur.y - 1, d: 'U' })
      if (cur.y < roomsH - 1 && !visited[cur.y + 1]![cur.x]) nbrs.push({ x: cur.x, y: cur.y + 1, d: 'D' })
      if (!nbrs.length) {
        stack.pop()
        continue
      }
      const next = nbrs[Math.floor(Math.random() * nbrs.length)]!
      if (next.d === 'R') openRight[cur.y]![cur.x] = true
      else if (next.d === 'L') openRight[next.y]![next.x] = true
      else if (next.d === 'D') openDown[cur.y]![cur.x] = true
      else if (next.d === 'U') openDown[next.y]![next.x] = true
      visited[next.y]![next.x] = true
      stack.push({ x: next.x, y: next.y })
    }

    const walls: any[] = []
    const doors: any[] = []
    const cornerFillers: any[] = []
    const containers: any[] = []
    const addWall = (x: number, y: number, w: number, h: number) => walls.push({ x, y, w, h })
    const addWallWithOptionalDoor = (x: number, y: number, w: number, h: number, isVertical: boolean) => {
      const minEdge = 16
      const canHaveDoor =
        (isVertical ? h : w) > this.doorSpan + minEdge * 2
      if (!canHaveDoor || Math.random() > this.doorSpawnChance) {
        addWall(x, y, w, h)
        return
      }
      const doorSpan = Math.min(
        this.doorSpan,
        (isVertical ? h : w) - minEdge * 2
      )
      if (isVertical) {
        const side = Math.max(2, (h - doorSpan) * 0.5)
        addWall(x, y - (doorSpan + side) * 0.5, w, side)
        addWall(x, y + (doorSpan + side) * 0.5, w, side)
        doors.push({ x, y, w, h: doorSpan })
      } else {
        const side = Math.max(2, (w - doorSpan) * 0.5)
        addWall(x - (doorSpan + side) * 0.5, y, side, h)
        addWall(x + (doorSpan + side) * 0.5, y, side, h)
        doors.push({ x, y, w: doorSpan, h })
      }
    }
    addWall(worldW * 0.5, wallThickness * 0.5, worldW, wallThickness)
    addWall(worldW * 0.5, worldH - wallThickness * 0.5, worldW, wallThickness)
    addWall(wallThickness * 0.5, worldH * 0.5, wallThickness, worldH)
    // Right boundary has a dedicated final-exit door opening.
    const finalDoorSpan = Math.min(Math.max(this.doorSpan, 64), worldH - 40)
    const rightX = worldW - wallThickness * 0.5
    const upperH = Math.max(0, exitDoorY - finalDoorSpan * 0.5)
    const lowerStart = exitDoorY + finalDoorSpan * 0.5
    const lowerH = Math.max(0, worldH - lowerStart)
    if (upperH > 0) addWall(rightX, upperH * 0.5, wallThickness, upperH)
    if (lowerH > 0)
      addWall(rightX, lowerStart + lowerH * 0.5, wallThickness, lowerH)
    for (let y = 0; y < roomsH; y++) {
      for (let x = 0; x < roomsW; x++) {
        if (x < roomsW - 1 && !openRight[y]![x]) {
          addWallWithOptionalDoor(
            (x + 1) * roomSize,
            y * roomSize + half,
            wallThickness,
            roomSize,
            true
          )
        }
        if (y < roomsH - 1 && !openDown[y]![x]) {
          addWallWithOptionalDoor(
            x * roomSize + half,
            (y + 1) * roomSize,
            roomSize,
            wallThickness,
            false
          )
        }
      }
    }

    // Fill tiny inner-corner pinholes where interior wall segments meet.
    for (let gy = 1; gy < roomsH; gy++) {
      for (let gx = 1; gx < roomsW; gx++) {
        const hasVertical =
          !openRight[gy - 1]![gx - 1] || !openRight[gy]![gx - 1]
        const hasHorizontal =
          !openDown[gy - 1]![gx - 1] || !openDown[gy - 1]![gx]
        if (!hasVertical || !hasHorizontal) continue
        cornerFillers.push({
          x: gx * roomSize,
          y: gy * roomSize,
          s: wallThickness + 2
        })
      }
    }

    // Box containers disabled by request.

    const cellCenter = (cx: number, cy: number) => ({ x: cx * roomSize + half, y: cy * roomSize + half })
    const guards: Array<{ x: number; y: number }> = []
    const key = (x: number, y: number) => `${x},${y}`
    const visitedCells = new Set()
    const queue = [{ x: playerCell.x, y: playerCell.y }]
    visitedCells.add(key(playerCell.x, playerCell.y))
    while (queue.length) {
      const cur = queue.shift()!
      const x = cur.x
      const y = cur.y
      const pushIf = (nx: number, ny: number, passable: boolean) => {
        if (!passable || nx < 0 || nx >= roomsW || ny < 0 || ny >= roomsH) return
        const k = key(nx, ny)
        if (visitedCells.has(k)) return
        visitedCells.add(k)
        queue.push({ x: nx, y: ny })
      }
      pushIf(x + 1, y, x < roomsW - 1 && openRight[y]![x])
      pushIf(x - 1, y, x > 0 && openRight[y]![x - 1])
      pushIf(x, y + 1, y < roomsH - 1 && openDown[y]![x])
      pushIf(x, y - 1, y > 0 && openDown[y - 1]![x])
    }

    const minEnemyCellDistanceFromPlayer = 3
    const candidates: Array<{ x: number; y: number }> = []
    for (let y = 0; y < roomsH; y++) {
      for (let x = 0; x < roomsW; x++) {
        const k = key(x, y)
        if (!visitedCells.has(k)) continue
        if (k === key(playerCell.x, playerCell.y)) continue
        if (k === key(exitCell.x, exitCell.y)) continue
        const distCells = Math.hypot(x - playerCell.x, y - playerCell.y)
        if (distCells < minEnemyCellDistanceFromPlayer) continue
        candidates.push({ x, y })
      }
    }
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      const tmp = candidates[i]!
      candidates[i] = candidates[j]!
      candidates[j] = tmp
    }
    const guardCount = Math.min(12, candidates.length)
    for (let i = 0; i < guardCount; i++) {
      guards.push(cellCenter(candidates[i]!.x, candidates[i]!.y))
    }
    return {
      worldW,
      worldH,
      roomSize,
      walls,
      doors,
      finalExitDoor: {
        x: rightX,
        y: exitDoorY,
        w: wallThickness,
        h: finalDoorSpan
      },
      outsideGoal: { x: worldW + roomSize * 0.35, y: exitDoorY },
      cornerFillers,
      containers,
      player: cellCenter(playerCell.x, playerCell.y),
      guards
    }
  }

  _spawnProceduralLayout (world: WorldLike, layout: ProceduralLayoutLike) {
    if (this._tileGridGraphics?.parent)
      this._tileGridGraphics.parent.removeChild(this._tileGridGraphics)
    this._spawnFromType(world, 'floorTile', {
      x: layout.worldW * 0.5,
      y: layout.worldH * 0.5,
      rotation: 0,
      scaleX: layout.worldW,
      scaleY: layout.worldH
    })
    // Hospital-style floor tile borders.
    if (this._stage) {
      const g = new Graphics()
      g.zIndex = 90
      const tile = 40
      for (let x = 0; x <= layout.worldW; x += tile) {
        g.moveTo(x, 0)
        g.lineTo(x, layout.worldH)
      }
      for (let y = 0; y <= layout.worldH; y += tile) {
        g.moveTo(0, y)
        g.lineTo(layout.worldW, y)
      }
      g.stroke({ width: 1, color: 0xd4d4d8, alpha: 0.9 })
      this._stage.addChild(g)
      this._tileGridGraphics = g
    }
    for (const w of layout.walls) {
      this._spawnFromType(world, 'wallBlock', {
        x: w.x,
        y: w.y,
        rotation: 0,
        scaleX: w.w,
        scaleY: w.h
      })
    }
    for (const d of layout.doors ?? []) {
      const doorId = this._spawnFromType(
        world,
        'doorBlock',
        {
          x: d.x,
          y: d.y,
          rotation: 0,
          scaleX: d.w,
          scaleY: d.h
        },
        { tags: ['door'] }
      )
      this._doorIds.add(doorId)
      this._doorOpenUntilById.set(doorId, 0)
      const disp = world.getComponent(doorId, COMPONENT_DISPLAY)
      if (disp?.view) disp.view.tint = 0x6b4423
    }
    if (layout.finalExitDoor) {
      this._finalExitDoorId = this._spawnFromType(
        world,
        'doorBlock',
        {
          x: layout.finalExitDoor.x,
          y: layout.finalExitDoor.y,
          rotation: 0,
          scaleX: layout.finalExitDoor.w,
          scaleY: layout.finalExitDoor.h
        },
        { tags: ['finalExitDoor'] }
      )
      this._exitDoorUnlocked = false
      const disp = world.getComponent(this._finalExitDoorId, COMPONENT_DISPLAY)
      if (disp?.view) disp.view.tint = 0xdc2626
    }
    for (const c of layout.cornerFillers ?? []) {
      this._spawnFromType(world, 'wallBlock', {
        x: c.x,
        y: c.y,
        rotation: 0,
        scaleX: c.s,
        scaleY: c.s
      })
    }
    for (const c of layout.containers) {
      this._spawnFromType(
        world,
        'wallBlock',
        {
          x: c.x,
          y: c.y,
          rotation: 0,
          scaleX: c.s,
          scaleY: c.s
        },
        {
          sprite: { shape: 'rect', tint: 0xb0b0b0, anchorX: 0.5, anchorY: 0.5 }
        }
      )
    }
    if (layout.outsideGoal) {
      this._outsideGoal = { x: layout.outsideGoal.x, y: layout.outsideGoal.y, r: 55 }
      this._spawnFromType(
        world,
        'exitZone',
        {
          x: layout.outsideGoal.x,
          y: layout.outsideGoal.y,
          rotation: 0,
          scaleX: 85,
          scaleY: 85
        },
        {
          tags: ['exit', 'outsideGoal'],
          sprite: { shape: 'rect', tint: 0x22c55e, anchorX: 0.5, anchorY: 0.5 }
        }
      )
    }
    this._spawnFromType(
      world,
      'playerAgent',
      {
        x: layout.player.x,
        y: layout.player.y,
        rotation: 0,
        scaleX: 1,
        scaleY: 1
      },
      { id: 'player' }
    )
    const patrolSpan = Math.max(96, layout.roomSize * 0.42)
    let guardIndex = 0
    for (const g of layout.guards) {
      const pattern = guardIndex % 3
      const isRotate = pattern === 0
      const isVertical = pattern === 2
      const patrolType = isRotate ? 'rotate' : isVertical ? 'moveY' : 'move'
      this._spawnFromType(
        world,
        'guardAgent',
        {
          x: g.x,
          y: g.y,
          rotation: 0,
          scaleX: Math.random() < 0.5 ? -1 : 1,
          scaleY: 1
        },
        {
          instanceVariables: {
            patrolType,
            patrolRotateSpeed: 0.6 + Math.random() * 0.6,
            patrolMinX: g.x - patrolSpan,
            patrolMaxX: g.x + patrolSpan,
            patrolMinY: g.y - patrolSpan,
            patrolMaxY: g.y + patrolSpan,
            patrolSpeed: 64 + Math.random() * 24,
            visionRange: 230 + Math.floor(Math.random() * 70),
            fovDeg: 65 + Math.floor(Math.random() * 25)
          }
        }
      )
      guardIndex += 1
    }
  }

  _configureCameraBounds (world: WorldLike, layout: ProceduralLayoutLike) {
    const camEnt = [...world.entities.values()].find(
      (e: any) => !!e?.components?.get?.(COMPONENT_CAMERA)
    ) as any
    const cam = camEnt?.components?.get?.(COMPONENT_CAMERA)
    if (!cam) return
    const zoom = this._isMobileLayout()
      ? STEALTH_CAMERA_ZOOM_MOBILE
      : STEALTH_CAMERA_ZOOM_DESKTOP
    const halfW = this._viewW / (2 * zoom)
    const halfH = this._viewH / (2 * zoom)
    cam.zoom = zoom
    cam.offsetX = this._viewW * STEALTH_CAMERA_LEFT_BIAS_RATIO
    cam.offsetY = 0
    cam.boundLeft = Math.max(50, halfW)
    cam.boundRight = Math.max(
      cam.boundLeft,
      layout.worldW + layout.roomSize * 0.5 - halfW
    )
    cam.boundTop = Math.max(50, halfH)
    cam.boundBottom = Math.max(cam.boundTop, layout.worldH - halfH)
    cam.followMetaName = this.playerMetaName
  }
}

function rayBlockedSolids (
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  step: number,
  colliders: ColliderLike[],
  ignoreEntityId: number,
  world: unknown
) {
  const d = Math.hypot(x1 - x0, y1 - y0)
  const n = Math.max(1, Math.ceil(d / Math.max(step, 1)))
  for (let i = 1; i < n; i++) {
    const t = i / n
    const x = x0 + (x1 - x0) * t
    const y = y0 + (y1 - y0) * t
    for (const c of colliders) {
      if (c.entityId === ignoreEntityId) continue
      if (c.kind !== 'solid') continue
      if (x >= c.left && x <= c.right && y >= c.top && y <= c.bottom)
        return true
    }
  }
  void world
  return false
}

function normalizeAngle (a: number) {
  let out = a
  while (out > Math.PI) out -= Math.PI * 2
  while (out < -Math.PI) out += Math.PI * 2
  return out
}

function smoothAngleStep (current: number, target: number, maxStep: number) {
  if (!Number.isFinite(current)) return target
  const d = normalizeAngle(target - current)
  if (Math.abs(d) <= maxStep) return target
  return current + Math.sign(d) * maxStep
}

function segmentIntersectsCircle (x0: number, y0: number, x1: number, y1: number, cx: number, cy: number, r: number) {
  const dx = x1 - x0
  const dy = y1 - y0
  const len2 = dx * dx + dy * dy
  if (len2 <= 1e-6) return Math.hypot(cx - x0, cy - y0) <= r
  const t = Math.max(0, Math.min(1, ((cx - x0) * dx + (cy - y0) * dy) / len2))
  const px = x0 + dx * t
  const py = y0 + dy * t
  return Math.hypot(cx - px, cy - py) <= r
}

/**
 * Extracts pixels from a source texture rectangle and returns an independent sprite.
 * The returned sprite owns a new texture created from a copied canvas region.
 *
 * @param {Texture} sourceTexture Source texture.
 * @param {number} pxX source x in pixels
 * @param {number} pxY source y in pixels
 * @param {number} pxW width in pixels
 * @param {number} pxH height in pixels
 * @returns {Sprite | null} Extracted sprite, or null when extraction fails.
 */
function createSpriteFromPixelRegion (sourceTexture: Texture, pxX: number, pxY: number, pxW: number, pxH: number) {
  if (!sourceTexture) return null
  const src = sourceTexture.source?.resource ?? sourceTexture.source
  if (!src) return null
  const sw = Number(src.naturalWidth ?? src.videoWidth ?? src.width ?? 0)
  const sh = Number(src.naturalHeight ?? src.videoHeight ?? src.height ?? 0)
  const x = Math.max(0, Math.floor(pxX))
  const y = Math.max(0, Math.floor(pxY))
  const w = Math.max(1, Math.floor(pxW))
  const h = Math.max(1, Math.floor(pxH))
  if (!(sw > 0 && sh > 0)) return null
  if (x >= sw || y >= sh) return null
  const cropW = Math.min(w, sw - x)
  const cropH = Math.min(h, sh - y)
  const canvas = document.createElement('canvas')
  canvas.width = cropW
  canvas.height = cropH
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(src, x, y, cropW, cropH, 0, 0, cropW, cropH)
  const tex = Texture.from(canvas)
  return new Sprite({ texture: tex })
}

/**
 * Build a character from bag/head/hands slices of a selected 4x4 cell.
 * Uses uniform scaling so output is never stretched.
 *
 * @param {Texture} sourceTexture Source sheet texture.
 * @param {number} col zero-based column in 4x4 sheet
 * @param {number} row zero-based row in 4x4 sheet
 * @param {number} targetSize output footprint (max side) in px
 * @returns {Container | null} Composite character container, or null on invalid input.
 */
function createCompositeCharacterContainer (
  sourceTexture: Texture,
  col: number,
  row: number,
  targetSize: number,
  options: WeaponOptionsLike = {}
) {
  const src = sourceTexture?.source
  const srcW = Number(src?.width ?? 0)
  const srcH = Number(src?.height ?? 0)
  if (!(srcW > 0 && srcH > 0)) return null
  const frameW = Math.floor(srcW / 4)
  const frameH = Math.floor(srcH / 4)
  if (!(frameW > 0 && frameH > 0)) return null
  const frameX = frameW * col
  const frameY = frameH * row
  const extracted = createSpriteFromPixelRegion(
    sourceTexture,
    frameX,
    frameY,
    frameW,
    frameH
  )
  if (!extracted) return null

  const bag = createSpriteFromPixelRegion(
    extracted.texture,
    0,
    0,
    270,
    Math.floor(frameH / 2 + 50)
  )
  const head = createSpriteFromPixelRegion(
    extracted.texture,
    270,
    0,
    196,
    frameH
  )
  const hands = createSpriteFromPixelRegion(
    extracted.texture,
    451,
    0,
    Math.max(1, frameW - 451),
    frameH
  )
  if (!bag || !head || !hands) return null

  const container = new Container()
  container.addChild(bag)
  container.addChild(head)
  container.addChild(hands)
  bag.position.set(-57, -115)
  head.position.set(10, -25)
  hands.position.set(-100, -35)
  hands.scale.set(0.95, 0.95)

  const b = container.getLocalBounds()
  container.pivot.set(b.x + b.width / 2, b.y + b.height / 2)
  container.position.set(0, 0)
  const maxSide = Math.max(1, Math.max(b.width, b.height))
  const s = targetSize / maxSide
  container.scale.set(s, s)

  // Attach weapon after body-fit scaling so weapon size tweaks don't shrink the enemy body.
  const weaponTexture = options.weaponTexture ?? null
  if (weaponTexture) {
    const weapon = createWeaponSpriteFromStrip(
      weaponTexture,
      options.weaponIndex ?? 0,
      options.weaponCount ?? 5
    )
    if (weapon) {
      weapon.anchor.set(0.5, 0.5)
      weapon.position.set(140, 206)
      weapon.rotation = 0
      weapon.zIndex = -1;
      container.addChild(weapon)
    }
  }
  return container
}

function createWeaponSpriteFromStrip (sourceTexture: Texture, index: number, count: number) {
  if (!sourceTexture) return null
  const src = sourceTexture.source?.resource ?? sourceTexture.source
  if (!src) return null
  const sw = Number(src.naturalWidth ?? src.videoWidth ?? src.width ?? 0)
  const sh = Number(src.naturalHeight ?? src.videoHeight ?? src.height ?? 0)
  if (!(sw > 0 && sh > 0) || !(count > 0)) return null
  const frameW = Math.floor(sw / count)
  const frameH = sh
  if (!(frameW > 0 && frameH > 0)) return null
  const idx = Math.max(0, Math.min(count - 1, Math.floor(index)))
  const sp = createSpriteFromPixelRegion(
    sourceTexture,
    idx * frameW,
    0,
    frameW,
    frameH
  )
  if (!sp) return null
  sp.scale.set(0.75, 0.75)
  return sp
}

function castDistanceToSolid (
  x0: number,
  y0: number,
  ux: number,
  uy: number,
  maxDist: number,
  colliders: ColliderLike[],
  ignoreEntityId: number
) {
  let best = maxDist
  for (const c of colliders) {
    if (c.entityId === ignoreEntityId || c.kind !== 'solid') continue
    const t = rayAabbFirstHit(x0, y0, ux, uy, c.left, c.top, c.right, c.bottom)
    if (t != null && t >= 0 && t < best) best = t
  }
  return best
}

function rayAabbFirstHit (ox: number, oy: number, dx: number, dy: number, left: number, top: number, right: number, bottom: number) {
  const EPS = 1e-6
  let tMin = -Infinity
  let tMax = Infinity

  if (Math.abs(dx) < EPS) {
    if (ox < left || ox > right) return null
  } else {
    const tx1 = (left - ox) / dx
    const tx2 = (right - ox) / dx
    tMin = Math.max(tMin, Math.min(tx1, tx2))
    tMax = Math.min(tMax, Math.max(tx1, tx2))
  }

  if (Math.abs(dy) < EPS) {
    if (oy < top || oy > bottom) return null
  } else {
    const ty1 = (top - oy) / dy
    const ty2 = (bottom - oy) / dy
    tMin = Math.max(tMin, Math.min(ty1, ty2))
    tMax = Math.min(tMax, Math.max(ty1, ty2))
  }

  if (tMax < 0 || tMin > tMax) return null
  return tMin >= 0 ? tMin : tMax
}
