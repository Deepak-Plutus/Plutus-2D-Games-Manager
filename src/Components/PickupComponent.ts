export type PickupComponentProps = {
  /**
   * If set, only trigger pickup when colliding entity.name matches.
   * Defaults to "hero".
   */
  targetEntityName?: string;
  /**
   * Optional healing amount applied to a Health-like object.
   */
  healAmount?: number;
  /**
   * Optional damage amount applied to a Health-like object.
   */
  damageAmount?: number;
  /**
   * Optional sound played by the PickupSystem when pickup triggers.
   */
  soundId?: string;
  /**
   * If true, pickup despawns after successful pickup.
   */
  despawnOnPickup?: boolean;
};

/**
 * PickupComponent
 * - JSON-driven pickup behavior hook.
 *
 * Note: in this codebase, components do not have direct access to `world`,
 * so `onPickup(entity)` / `applyEffect(entity)` are written to work with a
 * "Health-like" object:
 * - if it has `heal(v)` it will be called
 * - if it has `takeDamage(v)` it will be called
 */
export class PickupComponent {
  static readonly type = "Pickup";
  readonly type = PickupComponent.type;

  targetEntityName: string;
  healAmount: number;
  damageAmount: number;
  soundId?: string;
  despawnOnPickup: boolean;

  // runtime
  private _picked = false;
  private _destroyAfter = false;

  constructor(props: PickupComponentProps = {}) {
    this.targetEntityName = typeof props.targetEntityName === "string" ? props.targetEntityName : "hero";
    this.healAmount = typeof props.healAmount === "number" ? props.healAmount : 0;
    this.damageAmount = typeof props.damageAmount === "number" ? props.damageAmount : 0;
    this.soundId = typeof props.soundId === "string" ? props.soundId : undefined;
    this.despawnOnPickup = typeof props.despawnOnPickup === "boolean" ? props.despawnOnPickup : true;
  }

  onPickup(entity: any): void {
    if (this._picked) return;
    this._picked = true;
    this.applyEffect(entity);
    this.destroyAfterPickup();
  }

  reset(): void {
    this._picked = false;
    this._destroyAfter = false;
  }

  applyEffect(entity: any): void {
    if (!entity) return;

    // Prefer doc-style HealthComponent helper methods if present.
    if (this.healAmount > 0) {
      if (typeof entity.heal === "function") entity.heal(this.healAmount);
      else if (typeof entity.hp === "number") entity.hp = entity.hp + this.healAmount;
    }

    if (this.damageAmount > 0) {
      if (typeof entity.takeDamage === "function") entity.takeDamage(this.damageAmount);
      else if (typeof entity.hp === "number") entity.hp = Math.max(0, entity.hp - this.damageAmount);
    }
  }

  destroyAfterPickup(): void {
    this._destroyAfter = this.despawnOnPickup;
  }

  destroyNow(): void {
    this._destroyAfter = true;
  }

  get picked(): boolean {
    return this._picked;
  }

  get destroyAfter(): boolean {
    return this._destroyAfter;
  }
}

