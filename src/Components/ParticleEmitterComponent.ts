export type ParticleEmitterShape = 'circle' | 'rect';

export type ParticleEmitterComponentProps = {
  ratePerSec?: number;
  particleLifeMs?: number;
  speedMin?: number;
  speedMax?: number;
  spreadDeg?: number;
  sizeMin?: number;
  sizeMax?: number;
  color?: number;
  alpha?: number;
  maxParticles?: number;
  shape?: ParticleEmitterShape;
  burst?: number; // emit N immediately at start
};

export class ParticleEmitterComponent {
  static readonly type = 'ParticleEmitter';
  readonly type = ParticleEmitterComponent.type;

  ratePerSec: number;
  particleLifeMs: number;
  speedMin: number;
  speedMax: number;
  spreadDeg: number;
  sizeMin: number;
  sizeMax: number;
  color: number;
  alpha: number;
  maxParticles: number;
  shape: ParticleEmitterShape;
  burst: number;

  // runtime
  _accum: number = 0;
  _didBurst: boolean = false;
  _running = true;
  _pendingEmit = 0;

  constructor(props: ParticleEmitterComponentProps = {}) {
    this.ratePerSec = typeof props.ratePerSec === 'number' ? props.ratePerSec : 0;
    this.particleLifeMs = typeof props.particleLifeMs === 'number' ? props.particleLifeMs : 600;
    this.speedMin = typeof props.speedMin === 'number' ? props.speedMin : 40;
    this.speedMax = typeof props.speedMax === 'number' ? props.speedMax : 120;
    this.spreadDeg = typeof props.spreadDeg === 'number' ? props.spreadDeg : 360;
    this.sizeMin = typeof props.sizeMin === 'number' ? props.sizeMin : 2;
    this.sizeMax = typeof props.sizeMax === 'number' ? props.sizeMax : 5;
    this.color = typeof props.color === 'number' ? props.color : 0xffffff;
    this.alpha = typeof props.alpha === 'number' ? props.alpha : 0.9;
    this.maxParticles = typeof props.maxParticles === 'number' ? props.maxParticles : 200;
    this.shape = props.shape ?? 'circle';
    this.burst = typeof props.burst === 'number' ? props.burst : 0;
  }

  emit(count: number): void {
    if (!Number.isFinite(count) || count <= 0) return;
    this._pendingEmit += Math.floor(count);
  }

  start(): void {
    this._running = true;
  }

  stop(): void {
    this._running = false;
  }

  isRunning(): boolean {
    return this._running;
  }

  setRate(ratePerSec: number): void {
    if (!Number.isFinite(ratePerSec)) return;
    this.ratePerSec = Math.max(0, ratePerSec);
  }

  update(_dtMs: number): void {
    // System-driven integration; API parity method.
  }

  consumePendingEmit(): number {
    const n = this._pendingEmit;
    this._pendingEmit = 0;
    return n;
  }

  clearPendingEmit(): void {
    this._pendingEmit = 0;
  }

  resetBurst(): void {
    this._didBurst = false;
  }
}

