export type TriggerEventType = 'enter' | 'exit';

export type TriggerAction =
  | { type: 'PlaySound'; soundId: string }
  | { type: 'DespawnOther' }
  | { type: 'DespawnSelf' };

export class TriggerZoneComponent {
  private _tag?: string; // optional filter: only fire when other has this tag
  private _once: boolean;
  private _onEnter: TriggerAction[];
  private _onExit: TriggerAction[];

  constructor(init?: Partial<TriggerZoneComponent>) {
    this._tag = init?.tag;
    this._once = init?.once ?? false;
    this._onEnter = init?.onEnter ?? [];
    this._onExit = init?.onExit ?? [];
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

  get onEnter(): TriggerAction[] {
    return this._onEnter;
  }

  set onEnter(value: TriggerAction[]) {
    this._onEnter = value;
  }

  get onExit(): TriggerAction[] {
    return this._onExit;
  }

  set onExit(value: TriggerAction[]) {
    this._onExit = value;
  }
}

