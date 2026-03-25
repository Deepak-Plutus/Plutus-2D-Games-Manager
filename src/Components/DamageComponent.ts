/**
 * DamageComponent
 * - Holds a default damage value
 * - Provides helper method `dealDamage(entity, amount)` that operates on a Health-like object.
 *
 * Note: this component does not have access to ECS `world`, so `entity` is treated as:
 * - a `HealthComponent` (recommended), or
 * - any object with numeric `hp` (+ optional `takeDamage(v)` / `maxHp`).
 */
export class DamageComponent {
  static readonly type = "Damage";
  readonly type = DamageComponent.type;

  private _damage: number;

  constructor(init?: Partial<DamageComponent> & { damage?: number; defaultDamage?: number }) {
    const dmg = (init as any)?.damage ?? (init as any)?.defaultDamage ?? 10;
    this._damage = Number.isFinite(dmg) ? dmg : 10;
  }

  setDamage(v: number): void {
    if (!Number.isFinite(v)) return;
    this._damage = Math.max(0, v);
  }

  get damage(): number {
    return this._damage;
  }

  dealDamage(entity: any, amount: number): void {
    if (!entity) return;
    if (!Number.isFinite(amount) || amount <= 0) return;

    // HealthComponent already exposes helper `takeDamage`.
    if (typeof entity.takeDamage === "function") {
      entity.takeDamage(amount);
      return;
    }

    if (typeof entity.hp === "number") {
      const curr = entity.hp;
      const next = Math.max(0, curr - amount);
      entity.hp = next;
      return;
    }
  }
}

