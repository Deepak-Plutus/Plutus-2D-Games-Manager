/** @see https://www.construct.net/en/make-games/manuals/construct-3/behavior-reference/follow */
export const followBehaviorDefaults = {
  /** Target entity `meta.name` (ignored when followSelf) */
  targetName: '',
  /** Entries per second saved to history (Construct: History rate) */
  historyRate: 30,
  /** Ring buffer cap (Construct-style max delay scales with this; cap 10 per spec) */
  historyMaxEntries: 10,
  /** Seconds behind real target to replay (clamped by available history span) */
  followDelay: 0.15,
  /** Pixels/s toward sampled X/Y when > 0; 0 = snap each axis */
  maxSpeed: 200,
  stopDistance: 4,
  /** When true, face direction of movement toward delayed sample */
  rotateToward: false,
  /** Follow own delayed trail (source = this entity) */
  followSelf: false,
  /** If false, behavior does not run until followObject / followSelf */
  following: true,
  followX: true,
  followY: true,
  followWidth: false,
  followHeight: false,
  followAngle: false,
  followOpacity: false,
  followVisibility: false,
  /** Destroy this instance when target no longer exists */
  followDestroyed: false,
};
