export class GroundedComponent {
  private _grounded: boolean;
  private _groundContacts: number;

  constructor() {
    this._grounded = false;
    this._groundContacts = 0;
  }

  get grounded(): boolean {
    return this._grounded;
  }

  set grounded(value: boolean) {
    this._grounded = value;
  }

  get groundContacts(): number {
    return this._groundContacts;
  }

  set groundContacts(value: number) {
    this._groundContacts = value;
  }

  setGrounded(value: boolean): void {
    this._grounded = !!value;
  }

  isGrounded(): boolean {
    return this._grounded;
  }

  reset(): void {
    this._grounded = false;
    this._groundContacts = 0;
  }
}

