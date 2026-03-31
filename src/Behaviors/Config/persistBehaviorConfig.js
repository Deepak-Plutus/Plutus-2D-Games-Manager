/** @see https://www.construct.net/en/make-games/manuals/construct-3/behavior-reference/persist */
export const persistBehaviorDefaults = {
  /** localStorage key prefix */
  storagePrefix: 'plutus_persist',
  /** Load saved state on first tick */
  autoLoad: false,
  /** Save when behavior is disabled or entity would despawn (manual save only if false) */
  autoSave: false,
};
