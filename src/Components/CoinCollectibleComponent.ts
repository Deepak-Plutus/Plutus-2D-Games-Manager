export class CoinCollectibleComponent {
  private _value: number;

  constructor(init?: Partial<CoinCollectibleComponent>) {
    this._value = init?.value ?? 1;
  }

  get value(): number {
    return this._value;
  }
  set value(v: number) {
    this._value = v;
  }
}
