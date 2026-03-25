export type TriggerEventType = 'enter' | 'exit';
export type TriggerRect = { x: number; y: number; width: number; height: number };

export type TriggerAction =
  | { type: 'PlaySound'; soundId: string }
  | { type: 'DespawnOther' }
  | { type: 'DespawnSelf' }
  | { type: 'DamageOther'; damage?: number }
  | { type: 'CollectCoin'; value?: number; despawnSelf?: boolean }
  | { type: 'SetCheckpoint'; checkpointId: string }
  | { type: 'HealOther'; amount: number }
  | { type: 'TeleportOther'; x: number; y: number }
  | {
      type: 'LevelEnd';
      reason?: string;
      despawnSelf?: boolean;
      pausePhysics?: boolean;
      transitionTo?: 'paused' | 'playing';
    };

export type TriggerZoneComponentProps = {
  tag?: string;
  once?: boolean;
  onEnter?: TriggerAction[];
  onExit?: TriggerAction[];
};

export class TriggerZoneComponent {
  private _tag?: string; // optional filter: only fire when other has this tag
  private _once: boolean;
  private _onEnterActions: TriggerAction[];
  private _onExitActions: TriggerAction[];
  private _bounds?: TriggerRect;

  constructor(init?: TriggerZoneComponentProps) {
    this._tag = init?.tag;
    this._once = init?.once ?? false;
    this._onEnterActions = init?.onEnter ?? [];
    this._onExitActions = init?.onExit ?? [];
  }

  get tag(): string | undefined {
    return this._tag;
  }

  set tag(value: string | undefined) {
    this._tag = value;
  }

  get once(): boolean {
    return this._once;
  }

  set once(value: boolean) {
    this._once = value;
  }

  get onEnterActions(): TriggerAction[] {
    return this._onEnterActions;
  }

  set onEnterActions(value: TriggerAction[]) {
    this._onEnterActions = value;
  }

  get onExitActions(): TriggerAction[] {
    return this._onExitActions;
  }

  set onExitActions(value: TriggerAction[]) {
    this._onExitActions = value;
  }

  get bounds(): TriggerRect | undefined {
    return this._bounds;
  }

  // Doc API: setBounds(rect)
  setBounds(rect: TriggerRect): void {
    if (!rect) return;
    this._bounds = { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  }

  // Doc API: onEnter(entity)
  onEnter(_entity: unknown): TriggerAction[] {
    return this._onEnterActions;
  }

  // Doc API: onExit(entity)
  onExit(_entity: unknown): TriggerAction[] {
    return this._onExitActions;
  }

  addOnEnterAction(action: TriggerAction): void {
    this._onEnterActions.push(action);
  }

  addOnExitAction(action: TriggerAction): void {
    this._onExitActions.push(action);
  }

  removeOnEnterAction(index: number): void {
    if (!Number.isInteger(index)) return;
    if (index < 0 || index >= this._onEnterActions.length) return;
    this._onEnterActions.splice(index, 1);
  }

  removeOnExitAction(index: number): void {
    if (!Number.isInteger(index)) return;
    if (index < 0 || index >= this._onExitActions.length) return;
    this._onExitActions.splice(index, 1);
  }

  getActions(eventType: TriggerEventType): TriggerAction[] {
    return eventType === 'enter' ? [...this._onEnterActions] : [...this._onExitActions];
  }

  clearActions(eventType?: TriggerEventType): void {
    if (!eventType || eventType === 'enter') this._onEnterActions = [];
    if (!eventType || eventType === 'exit') this._onExitActions = [];
  }
}

