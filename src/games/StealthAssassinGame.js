import { Container, Graphics, Sprite, Text, Texture } from 'pixi.js'
import { BaseSystem } from '../Systems/BaseSystem.js'
import { aabbOverlap, buildColliderList } from '../Core/CollisionService.js'
import {
  COMPONENT_CAMERA,
  COMPONENT_DISPLAY,
  COMPONENT_INSTANCE_VARIABLES,
  COMPONENT_META,
  COMPONENT_TRANSFORM
} from '../Components/index.js'

export class StealthAssassinGame extends BaseSystem {
  static inputRequirements = {
    keyboard: false,
    pointer: true,
    wheel: false,
    gamepad: false
  }

  constructor () {
    super()
    this.playerMetaName = 'player'
    this.playerMoveSpeed = 190
    this.playerRadius = 14
    this.playerEdgePreventionDistance = 85
    this.playerFacingAngleOffset = -Math.PI / 2
    this.playerInitialRotation = Math.PI
    this.enemyFacingAngleOffset = -Math.PI / 2
    this.enemyTurnSmoothSpeed = 10
    this.guardRadius = 15
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
    this._hud = null
    this._overlay = null
    this._pathGraphics = null
    this._pendingClick = null
    this._playerPath = []
    this._playerPathIndex = 0
    this._desiredGoal = null
    this._targetEnemyId = null
    this._targetRing = null
    this._retargetTick = 0
    this._isDirectMove = false
    this._lastPlayerPos = { x: 0, y: 0 }
    this._playerSkinApplied = false
    this._playerInitialRotationApplied = false
    this._enemySkinAppliedIds = new Set()
    this._weaponsTexture = null
    this._guardConeById = new Map()
    this._guardConeDistanceHistory = new Map()
    this._guardInvestigateRingById = new Map()
    this._patrolState = new Map()
    this._bullets = []
    this._worldFxRoot = null
    this._kills = 0
    this._playerHp = this.playerMaxHp
    this._gameOver = false
    this._won = false
    this._unsubPointer = null
  }

  configure (options = {}) {
    if (options.playerMetaName != null)
      this.playerMetaName = String(options.playerMetaName)
    if (options.playerMoveSpeed != null)
      this.playerMoveSpeed =
        Number(options.playerMoveSpeed) || this.playerMoveSpeed
    if (options.playerRadius != null)
      this.playerRadius = Number(options.playerRadius) || this.playerRadius
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
    if (options.enemyFacingAngleOffset != null)
      this.enemyFacingAngleOffset = Number(options.enemyFacingAngleOffset)
    if (options.enemyTurnSmoothSpeed != null)
      this.enemyTurnSmoothSpeed = Math.max(
        0.1,
        Number(options.enemyTurnSmoothSpeed) || this.enemyTurnSmoothSpeed
      )
    if (options.cellSize != null)
      this.cellSize = Math.max(16, Number(options.cellSize) || this.cellSize)
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

  setRuntime (w, h, inputCoordinator) {
    this._viewW = Number(w) || this._viewW
    this._viewH = Number(h) || this._viewH
    this._inputCoordinator = inputCoordinator
  }

  setScreenUi (uiRoot, w, h) {
    this._uiRoot = uiRoot
    this._viewW = Number(w) || this._viewW
    this._viewH = Number(h) || this._viewH
    this._hud = null
    this._overlay = null
    this._kills = 0
    this._playerHp = this.playerMaxHp
    this._gameOver = false
    this._won = false
    this._playerPath = []
    this._playerPathIndex = 0
    this._pendingClick = null
    this._desiredGoal = null
    this._targetEnemyId = null
    this._retargetTick = 0
    this._isDirectMove = false
    this._playerSkinApplied = false
    this._playerInitialRotationApplied = false
    this._enemySkinAppliedIds.clear()
    this._clearBullets()
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
    this._bindPointerClick()
  }

  update (dt, world) {
    if (!this.enabled || this._gameOver || this._won) return
    if (this._uiRoot && !this._hud) this._buildHud()

    const playerId = world.findEntityIdByMetaName(this.playerMetaName)
    if (playerId == null) return
    const playerTr = world.getComponent(playerId, COMPONENT_TRANSFORM)
    if (!playerTr) return
    if (!this._playerInitialRotationApplied) {
      playerTr.rotation = this.playerInitialRotation
      this._playerInitialRotationApplied = true
    }
    this._lastPlayerPos = { x: playerTr.x, y: playerTr.y }
    const playerDisp = world.getComponent(playerId, COMPONENT_DISPLAY)
    this._applyPlayerSkinFrame(playerDisp?.view ?? null)
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

    let colliders = buildColliderList(world)
    const navRadius = this._playerNavRadius()
    this._resolvePendingClick(world, playerTr, colliders)
    this._updateTargetEnemyTracking(world, playerTr, colliders, dt, navRadius)
    this._movePlayerAlongPath(dt, playerTr, colliders, navRadius)
    this._resolvePlayerWallPenetration(playerTr, colliders, navRadius)
    colliders = buildColliderList(world)
    const playerBox = this._playerAabb(playerTr)

    this._updateGuardsAi(world, dt, colliders, playerTr)
    this._updateBullets(dt, colliders, playerTr)
    colliders = buildColliderList(world)

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
      const vision = Number(iv?.get('visionRange') ?? this.defaultVisionRange)
      const fov = Number(iv?.get('fovDeg') ?? this.defaultFovDeg)
      this._drawGuardCone(world, c.entityId, gTr, vision, fov, colliders)
    }
    this._clearInvestigateRings()

    this._tryAutoTakedown(world, playerTr, colliders)

    aliveTargets = world.findEntityIdsByTag('guard').length
    if (this._hud)
      this._hud.text = `HP: ${Math.max(
        0,
        Math.ceil(this._playerHp)
      )}   Targets Left: ${aliveTargets}   Kills: ${this._kills}`
    this._drawPath()
    this._drawTargetRing(world)

    if (aliveTargets === 0) {
      for (const c of colliders) {
        if (!this._hasTag(world, c.entityId, 'exit')) continue
        if (aabbOverlap(playerBox, c)) {
          this._showResult('MISSION COMPLETE', 0x86efac)
          this._won = true
          return
        }
      }
    }
  }

  _buildHud () {
    if (!this._uiRoot) return
    const t = new Text({
      text: 'Targets Left: 0   Kills: 0',
      style: {
        fill: 0xe2e8f0,
        fontSize: 14,
        fontFamily: '"Bungee", "Segoe UI", system-ui, sans-serif'
      }
    })
    t.position.set(12, 10)
    t.zIndex = 200
    this._uiRoot.addChild(t)
    this._hud = t
  }

  _applyPlayerSkinFrame (view) {
    if (this._playerSkinApplied) return
    if (!(view instanceof Sprite)) return
    const baseTex = view.texture
    const src = baseTex?.source
    const srcW = Number(src?.width ?? 0)
    const srcH = Number(src?.height ?? 0)
    if (!(srcW > 0 && srcH > 0)) return
    const container = createCompositeCharacterContainer(baseTex, 0, 0, 80)
    if (!container) return
    view.removeChildren()
    view.texture = Texture.EMPTY
    view.width = 80
    view.height = 80
    view.addChild(container)
    this._playerSkinApplied = true
  }

  _applyEnemySkinFrame (entityId, view) {
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
    view.removeChildren()
    view.texture = Texture.EMPTY
    view.addChild(container)
    view.width = 40
    view.height = 40
    this._enemySkinAppliedIds.add(entityId)
  }

  _getWeaponsTexture () {
    if (this._weaponsTexture) return this._weaponsTexture
    this._weaponsTexture = Texture.from('/Weapons.png')
    return this._weaponsTexture
  }

  _bindPointerClick () {
    if (this._unsubPointer || !this._inputCoordinator?.hub) return
    const onDown = ev => {
      const d = /** @type {CustomEvent} */ (ev).detail ?? {}
      if (Number(d.button ?? 0) !== 0) return
      this._pendingClick = { x: Number(d.x ?? 0), y: Number(d.y ?? 0) }
    }
    this._inputCoordinator.hub.addEventListener('pointer:down', onDown)
    this._unsubPointer = () =>
      this._inputCoordinator?.hub?.removeEventListener('pointer:down', onDown)
  }

  _showResult (title, color) {
    if (!this._uiRoot || this._overlay) return
    const root = new Container()
    root.zIndex = 300
    const bg = new Graphics()
    bg.rect(0, 0, this._viewW, this._viewH)
    bg.fill({ color: 0x020617, alpha: 0.72 })
    const t = new Text({
      text: `${title}\nTap / click to restart`,
      style: {
        fill: color,
        fontSize: 26,
        align: 'center',
        fontFamily: '"Bungee", "Segoe UI", system-ui, sans-serif'
      }
    })
    t.anchor.set(0.5)
    t.position.set(this._viewW / 2, this._viewH / 2)
    root.addChild(bg)
    root.addChild(t)
    root.eventMode = 'static'
    root.on('pointertap', () => {
      if (typeof window !== 'undefined') window.location.reload()
    })
    this._uiRoot.addChild(root)
    this._overlay = root
  }

  _hasTag (world, id, tag) {
    const m = world.getComponent(id, COMPONENT_META)
    const tags = m?.tags
    return Array.isArray(tags) && tags.includes(tag)
  }

  _updateGuardsAi (world, dt, colliders, playerTr) {
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
        state = {
          mode: 'patrol',
          targetX: maxX,
          minX,
          maxX,
          baseY: tr.y,
          patrolHomeX: tr.x,
          patrolHomeY: tr.y,
          patrolType: String(iv.get('patrolType') ?? 'move'),
          patrolRotateSpeed: Number(iv.get('patrolRotateSpeed') ?? 0.85),
          heading: tr.scaleX >= 0 ? 0 : Math.PI,
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
          patrolTurnTarget: tr.scaleX >= 0 ? 0 : Math.PI,
          guardPath: [],
          guardPathIndex: 0,
          investigateCenterX: tr.x,
          investigateCenterY: tr.y,
          investigatePhase: 'pause',
          investigatePhaseTimer: 0,
          investigateScanBase: tr.scaleX >= 0 ? 0 : Math.PI
        }
        this._patrolState.set(id, state)
      }
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
        state.seenTimer = Math.min(this.detectHoldSec, state.seenTimer + dt)
        if (
          state.seenTimer >= this.detectHoldSec &&
          state.mode !== 'chase' &&
          state.mode !== 'shoot'
        ) {
          state.returnX = state.targetX
          state.returnY = tr.y
        }
        if (state.seenTimer >= this.detectHoldSec) {
          state.mode = distToPlayer <= shootRange ? 'shoot' : 'chase'
        }
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
            this._spawnBullet(tr.x, tr.y, playerTr.x, playerTr.y)
            state.fireCooldown = this.guardFireInterval
          }
        }
      } else if (state.mode === 'chase') {
        this._guardChasePlayer(tr, state, dt, colliders, playerTr, id)
        const newDist = Math.hypot(playerTr.x - tr.x, playerTr.y - tr.y)
        if (
          sees &&
          state.seenTimer >= this.detectHoldSec &&
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
            colliders
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
              colliders
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
        } else {
          if (state.patrolSubState === 'wait') {
            state.patrolWaitTimer -= dt
            const elapsed = Math.max(0, this.patrolWaitDuration - state.patrolWaitTimer)
            state.heading =
              state.patrolScanBase + Math.sin(elapsed * this.patrolWaitScanSpeed) * 0.45
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
              state.heading += Math.sign(diff) * step
            }
          } else {
            if (Math.abs(tr.x - state.targetX) < 8) {
              state.targetX = state.targetX === state.maxX ? state.minX : state.maxX
              const dirNext = Math.sign(state.targetX - tr.x) || 1
              state.patrolTurnTarget = dirNext >= 0 ? 0 : Math.PI
              state.patrolScanBase = state.heading
              state.patrolWaitTimer = this.patrolWaitDuration
              state.patrolSubState = 'wait'
            } else {
              const speed = Number(iv.get('patrolSpeed') ?? this.defaultPatrolSpeed)
              const dir = Math.sign(state.targetX - tr.x) || 1
              const nx = tr.x + dir * speed * dt
              if (this._canOccupyCircle(nx, tr.y, this.guardRadius, colliders, id)) {
                tr.x = nx
                state.heading = dir >= 0 ? 0 : Math.PI
                state.lastMoveX = dir
                state.lastMoveY = 0
              } else {
                state.targetX = state.targetX === state.maxX ? state.minX : state.maxX
                const dirNext = Math.sign(state.targetX - tr.x) || 1
                state.patrolTurnTarget = dirNext >= 0 ? 0 : Math.PI
                state.patrolScanBase = state.heading
                state.patrolWaitTimer = this.patrolWaitDuration
                state.patrolSubState = 'wait'
              }
            }
          }
        }
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

  _guardChasePlayer (tr, state, dt, colliders, playerTr, guardId) {
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
    guardId,
    gTr,
    pTr,
    visionRange,
    fovDeg,
    colliders,
    world,
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

  _tryAutoTakedown (world, pTr, colliders) {
    const guards = world.findEntityIdsByTag('guard')
    for (const id of guards) {
      const tr = world.getComponent(id, COMPONENT_TRANSFORM)
      if (!tr) continue
      const dx = tr.x - pTr.x
      const dy = tr.y - pTr.y
      const d = Math.hypot(dx, dy)
      if (d > this.playerRadius * 1.8) continue
      const facingX = pTr.scaleX >= 0 ? 1 : -1
      const dirX = dx / Math.max(1e-6, d)
      const dot = Math.max(-1, Math.min(1, facingX * dirX))
      const ang = (Math.acos(dot) * 180) / Math.PI
      if (ang > 100 * 0.5) continue
      if (rayBlockedSolids(pTr.x, pTr.y, tr.x, tr.y, 10, colliders, -1, world))
        continue
      const deadX = tr.x
      const deadY = tr.y
      world.destroyEntity(id)
      this._kills += 1
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

  _alertNearbyGuardsOnKill (world, deadGuardId, x, y) {
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
      s.heading = Math.atan2(y - tr.y, x - tr.x)
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

  _planGuardPath (start, goal, colliders) {
    const raw = this._findPathWithFallback(
      start,
      goal,
      colliders,
      this.guardRadius,
      this.cellSize
    )
    return this._simplifyPathWithVisibility(start, raw ?? [], colliders, this.guardRadius)
  }

  _moveGuardAlongPath (tr, state, speed, dt, colliders, id) {
    if (!Array.isArray(state.guardPath) || !state.guardPath.length) return true
    const target = state.guardPath[state.guardPathIndex]
    if (!target) return true
    const dx = target.x - tr.x
    const dy = target.y - tr.y
    const d = Math.hypot(dx, dy)
    const step = speed * dt
    if (d <= step) {
      if (this._canOccupyCircle(target.x, target.y, this.guardRadius, colliders, id)) {
        tr.x = target.x
        tr.y = target.y
        state.guardPathIndex += 1
        return state.guardPathIndex >= state.guardPath.length
      }
      return true
    }
    const ux = dx / Math.max(d, 1e-6)
    const uy = dy / Math.max(d, 1e-6)
    const nx = tr.x + ux * step
    const ny = tr.y + uy * step
    if (this._canOccupyCircle(nx, ny, this.guardRadius, colliders, id)) {
      tr.x = nx
      tr.y = ny
      state.heading = Math.atan2(uy, ux)
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

  _drawInvestigateRings (world) {
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

  _resolvePendingClick (world, playerTr, colliders) {
    if (!this._pendingClick) return
    const click = this._pendingClick
    this._pendingClick = null
    const worldTarget = this._screenToWorld(world, click.x, click.y)
    const enemyHit = this._pickEnemyAt(world, worldTarget.x, worldTarget.y)
    if (enemyHit != null) {
      this._targetEnemyId = enemyHit
      const tr = world.getComponent(enemyHit, COMPONENT_TRANSFORM)
      if (tr) this._desiredGoal = { x: tr.x, y: tr.y }
    } else {
      this._targetEnemyId = null
      this._desiredGoal = worldTarget
    }
    this._assignSmartRoute(
      { x: playerTr.x, y: playerTr.y },
      this._desiredGoal,
      colliders,
      this._playerNavRadius()
    )
  }

  _updateTargetEnemyTracking (world, playerTr, colliders, dt, navRadius) {
    if (this._targetEnemyId == null) return
    if (!world.entities.has(this._targetEnemyId)) {
      this._targetEnemyId = null
      return
    }
    const targetTr = world.getComponent(
      this._targetEnemyId,
      COMPONENT_TRANSFORM
    )
    if (!targetTr) {
      this._targetEnemyId = null
      return
    }
    this._desiredGoal = { x: targetTr.x, y: targetTr.y }
    this._retargetTick -= dt
    if (this._retargetTick > 0) return
    this._retargetTick = 0.2
    this._assignSmartRoute(
      { x: playerTr.x, y: playerTr.y },
      this._desiredGoal,
      colliders,
      navRadius
    )
  }

  _movePlayerAlongPath (dt, playerTr, colliders, navRadius) {
    if (!this._playerPath.length) return
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
      playerTr.rotation = Math.atan2(dy, dx) + this.playerFacingAngleOffset
    }
    if (d <= step) {
      if (this._canOccupyCircle(target.x, target.y, navRadius, colliders, -1)) {
        playerTr.x = target.x
        playerTr.y = target.y
        this._playerPathIndex += 1
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

  _assignSmartRoute (start, goal, colliders, navRadius) {
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
    g.stroke({ width: 3, color: 0x38bdf8, alpha: 0.95 })
    const end = route[route.length - 1]
    const prev = route[Math.max(route.length - 2, 0)]
    const vx = end.x - prev.x
    const vy = end.y - prev.y
    const len = Math.hypot(vx, vy) || 1
    const ux = vx / len
    const uy = vy / len
    const ax = end.x
    const ay = end.y
    const s = 10
    g.moveTo(ax, ay)
    g.lineTo(ax - ux * s - uy * 6, ay - uy * s + ux * 6)
    g.lineTo(ax - ux * s + uy * 6, ay - uy * s - ux * 6)
    g.closePath()
    g.fill({ color: 0x38bdf8, alpha: 1 })
  }

  _drawTargetRing (world) {
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

  _drawGuardCone (world, id, tr, visionRange, fovDeg, colliders) {
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
      const filtered = spatialHits[i]
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
    g.fill({ color: 0xf59e0b, alpha: 0.17 })
    g.moveTo(coneOriginX, coneOriginY)
    for (let i = 0; i <= rays; i++) {
      const t = i / Math.max(1, rays)
      const a = a0 + (a1 - a0) * t
      const ux = Math.cos(a)
      const uy = Math.sin(a)
      const hitDist = castDistanceToSolid(
        coneOriginX,
        coneOriginY,
        ux,
        uy,
        visionRange,
        colliders,
        id
      )
      g.lineTo(coneOriginX + ux * hitDist, coneOriginY + uy * hitDist)
    }
    g.lineTo(coneOriginX, coneOriginY)
    g.closePath()
    g.stroke({ width: 1.2, color: 0xfbbf24, alpha: 0.5 })
  }

  _screenToWorld (world, sx, sy) {
    const camEnt = [...world.entities.values()].find(
      e => !!e.components.get(COMPONENT_CAMERA)
    )
    const cam = camEnt?.components?.get(COMPONENT_CAMERA)
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
    return { x: sx + tx - this._viewW / 2, y: sy + ty - this._viewH / 2 }
  }

  _canOccupyCircle (x, y, radius, colliders, ignoreEntityId) {
    const a = {
      left: x - radius,
      right: x + radius,
      top: y - radius,
      bottom: y + radius
    }
    for (const c of colliders) {
      if (c.entityId === ignoreEntityId || c.kind !== 'solid') continue
      if (
        !(
          a.right <= c.left ||
          a.left >= c.right ||
          a.bottom <= c.top ||
          a.top >= c.bottom
        )
      )
        return false
    }
    return true
  }

  _pickEnemyAt (world, x, y) {
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

  _hasClearCorridor (start, goal, radius, colliders) {
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
      if (!this._canOccupyCircle(x, y, radius, colliders, -1)) return false
    }
    return true
  }

  _simplifyPathWithVisibility (start, path, colliders, radius) {
    if (!Array.isArray(path) || path.length <= 1)
      return Array.isArray(path) ? path : []
    const out = []
    let anchor = { x: start.x, y: start.y }
    let i = 0
    while (i < path.length) {
      let best = i
      for (let j = i; j < path.length; j++) {
        if (this._hasClearCorridor(anchor, path[j], radius, colliders)) {
          best = j
        } else {
          break
        }
      }
      out.push(path[best])
      anchor = path[best]
      i = best + 1
    }
    return out
  }

  _spawnBullet (x0, y0, x1, y1) {
    if (!this._worldFxRoot) return
    const dx = x1 - x0
    const dy = y1 - y0
    const d = Math.hypot(dx, dy) || 1
    const ux = dx / d
    const uy = dy / d
    const view = new Graphics()
    view.circle(0, 0, 4)
    view.fill({ color: 0xf87171, alpha: 1 })
    view.position.set(x0, y0)
    view.zIndex = 165
    this._worldFxRoot.addChild(view)
    this._bullets.push({
      x: x0,
      y: y0,
      vx: ux * this.bulletSpeed,
      vy: uy * this.bulletSpeed,
      life: 2.6,
      view
    })
  }

  _updateBullets (dt, colliders, playerTr) {
    for (let i = this._bullets.length - 1; i >= 0; i--) {
      const b = this._bullets[i]
      b.life -= dt
      b.x += b.vx * dt
      b.y += b.vy * dt
      b.view.position.set(b.x, b.y)
      if (
        Math.hypot(playerTr.x - b.x, playerTr.y - b.y) <=
        this.playerRadius + 4
      ) {
        this._playerHp = Math.max(0, this._playerHp - this.bulletDamage)
        if (this._playerHp <= 0) {
          this._showResult('MISSION FAILED', 0xfca5a5)
          this._gameOver = true
        }
        b.life = 0
      }
      let blocked = b.life <= 0
      if (!blocked) {
        for (const c of colliders) {
          if (c.kind !== 'solid') continue
          if (
            b.x >= c.left &&
            b.x <= c.right &&
            b.y >= c.top &&
            b.y <= c.bottom
          ) {
            blocked = true
            break
          }
        }
      }
      if (blocked) {
        if (b.view.parent) b.view.parent.removeChild(b.view)
        this._bullets.splice(i, 1)
      }
    }
  }

  _clearBullets () {
    for (const b of this._bullets) {
      if (b.view?.parent) b.view.parent.removeChild(b.view)
    }
    this._bullets = []
  }

  _playerAabb (tr) {
    return {
      left: tr.x - this.playerRadius,
      right: tr.x + this.playerRadius,
      top: tr.y - this.playerRadius,
      bottom: tr.y + this.playerRadius
    }
  }

  _findPathWithFallback (start, goal, colliders, radius, cell) {
    const primary = this._findPath(start, goal, colliders, radius, cell)
    if (primary?.length) return primary

    // If exact goal is blocked or unreachable, pick nearest reachable alternative.
    const bounds = this._solidBounds(colliders)
    const toCell = p => ({
      cx: Math.round((p.x - bounds.minX) / cell),
      cy: Math.round((p.y - bounds.minY) / cell)
    })
    const toWorld = (cx, cy) => ({
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
        if (!this._canOccupyCircle(wp.x, wp.y, radius, colliders, -1)) continue
        c.d = Math.hypot(wp.x - goal.x, wp.y - goal.y)
      }
      candidates.sort((a, b) => a.d - b.d)
      for (const c of candidates) {
        const wp = toWorld(c.x, c.y)
        if (!this._canOccupyCircle(wp.x, wp.y, radius, colliders, -1)) continue
        const p = this._findPath(start, wp, colliders, radius, cell)
        if (p?.length) return p
      }
    }
    return null
  }

  _findPath (start, goal, colliders, radius, cell) {
    const bounds = this._solidBounds(colliders)
    const toCell = p => ({
      cx: Math.round((p.x - bounds.minX) / cell),
      cy: Math.round((p.y - bounds.minY) / cell)
    })
    const toWorld = (cx, cy) => ({
      x: bounds.minX + cx * cell,
      y: bounds.minY + cy * cell
    })
    const s = toCell(start)
    const g = toCell(goal)
    const key = (cx, cy) => `${cx},${cy}`
    const open = [s]
    const closed = new Set()
    const came = new Map()
    const gScore = new Map([[key(s.cx, s.cy), 0]])
    const fScore = new Map([
      [key(s.cx, s.cy), Math.hypot(g.cx - s.cx, g.cy - s.cy)]
    ])
    // 4-way grid navigation only (no diagonals) for cleaner row/column routes.
    const cardinal = [
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
        const k = key(open[i].cx, open[i].cy)
        const f = fScore.get(k) ?? Infinity
        if (f < bestF) {
          bestF = f
          bestIdx = i
        }
      }
      const current = open.splice(bestIdx, 1)[0]
      const currentKey = key(current.cx, current.cy)
      if (closed.has(currentKey)) continue
      closed.add(currentKey)
      if (current.cx === g.cx && current.cy === g.cy) {
        const out = []
        let ck = currentKey
        while (ck) {
          const [sx, sy] = ck.split(',').map(Number)
          out.push(toWorld(sx, sy))
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
        if (!this._canOccupyCircle(wp.x, wp.y, radius, colliders, -1)) continue
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

  _solidBounds (colliders) {
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

  _orderedCardinalNeighbors (cx, cy, gx, gy, cardinal) {
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
    const out = []
    for (const [dx, dy] of primary) {
      if (
        cardinal.some(n => n[0] === dx && n[1] === dy) &&
        !out.some(n => n[0] === dx && n[1] === dy)
      ) {
        out.push([dx, dy])
      }
    }
    for (const [dx, dy] of cardinal) {
      if (!out.some(n => n[0] === dx && n[1] === dy)) out.push([dx, dy])
    }
    return out
  }

  _distanceToNearestSolid (x, y, colliders) {
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

  _resolvePlayerWallPenetration (playerTr, colliders, radius) {
    const maxIters = 4
    const skin = 0.01
    for (let iter = 0; iter < maxIters; iter++) {
      let moved = false
      const l = playerTr.x - radius
      const r = playerTr.x + radius
      const t = playerTr.y - radius
      const b = playerTr.y + radius
      for (const c of colliders) {
        if (c.kind !== 'solid') continue
        const overlapX = Math.min(r, c.right) - Math.max(l, c.left)
        const overlapY = Math.min(b, c.bottom) - Math.max(t, c.top)
        if (overlapX <= 0 || overlapY <= 0) continue

        // Push out along the shallow axis to avoid corner locking.
        if (overlapX < overlapY) {
          const pushDir = playerTr.x < (c.left + c.right) * 0.5 ? -1 : 1
          playerTr.x += pushDir * (overlapX + skin)
        } else {
          const pushDir = playerTr.y < (c.top + c.bottom) * 0.5 ? -1 : 1
          playerTr.y += pushDir * (overlapY + skin)
        }
        moved = true
      }
      if (!moved) break
    }
  }
}

function rayBlockedSolids (
  x0,
  y0,
  x1,
  y1,
  step,
  colliders,
  ignoreEntityId,
  world
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

function normalizeAngle (a) {
  let out = a
  while (out > Math.PI) out -= Math.PI * 2
  while (out < -Math.PI) out += Math.PI * 2
  return out
}

function smoothAngleStep (current, target, maxStep) {
  if (!Number.isFinite(current)) return target
  const d = normalizeAngle(target - current)
  if (Math.abs(d) <= maxStep) return target
  return current + Math.sign(d) * maxStep
}

/**
 * Extracts pixels from a source texture rectangle and returns an independent sprite.
 * The returned sprite owns a new texture created from a copied canvas region.
 *
 * @param {Texture} sourceTexture
 * @param {number} pxX source x in pixels
 * @param {number} pxY source y in pixels
 * @param {number} pxW width in pixels
 * @param {number} pxH height in pixels
 * @returns {Sprite | null}
 */
function createSpriteFromPixelRegion (sourceTexture, pxX, pxY, pxW, pxH) {
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
 * @param {Texture} sourceTexture
 * @param {number} col zero-based column in 4x4 sheet
 * @param {number} row zero-based row in 4x4 sheet
 * @param {number} targetSize output footprint (max side) in px
 * @returns {Container | null}
 */
function createCompositeCharacterContainer (
  sourceTexture,
  col,
  row,
  targetSize,
  options = {}
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
    255,
    Math.floor(frameH / 2 + 50)
  )
  const head = createSpriteFromPixelRegion(
    extracted.texture,
    255,
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
  head.position.set(0, -25)
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

function createWeaponSpriteFromStrip (sourceTexture, index, count) {
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
  x0,
  y0,
  ux,
  uy,
  maxDist,
  colliders,
  ignoreEntityId
) {
  let best = maxDist
  for (const c of colliders) {
    if (c.entityId === ignoreEntityId || c.kind !== 'solid') continue
    const t = rayAabbFirstHit(x0, y0, ux, uy, c.left, c.top, c.right, c.bottom)
    if (t != null && t >= 0 && t < best) best = t
  }
  return best
}

function rayAabbFirstHit (ox, oy, dx, dy, left, top, right, bottom) {
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
