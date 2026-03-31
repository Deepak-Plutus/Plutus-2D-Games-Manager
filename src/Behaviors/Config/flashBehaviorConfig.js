/** @see https://www.construct.net/en/make-games/manuals/construct-3/behavior-reference/flash */
export const flashBehaviorDefaults = {
  /** Seconds visible “on” */
  onDuration: 0.1,
  offDuration: 0.1,
  /** Full flash cycles (on+off = 1) */
  repeatCount: 3,
  /** CSS/Pixi-style hex without # */
  flashTint: 'ffffff',
  /** Original tint restore (hex without #) */
  restoreTint: 'ffffff',
  ease: 'power2.inOut',
};
