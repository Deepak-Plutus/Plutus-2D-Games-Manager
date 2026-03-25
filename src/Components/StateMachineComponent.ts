import type { GameStateId } from "../Systems/StateManagementSystem";

export type StateMachineAction =
  | { type: "PlaySound"; soundId: string }
  | { type: "SetResource"; key: string; value: unknown }
  | { type: "TransitionGameState"; to: GameStateId | string; reason?: string }
  | { type: "DespawnSelf" };

export type StateMachineCondition =
  | { type: "Always" }
  | { type: "KeyJustPressed"; code: string }
  | { type: "UiEquals"; key: string; value: unknown }
  | { type: "ResourceEquals"; key: string; value: unknown }
  | { type: "TimerEnded"; timerName: string };

export type StateMachineStateDef = {
  onEnter?: StateMachineAction[];
  onExit?: StateMachineAction[];
  onUpdate?: StateMachineAction[];
};

export type StateMachineTransitionDef = {
  from?: string | "*";
  to: string;
  when: StateMachineCondition;
  actions?: StateMachineAction[];
};

export type StateMachineComponentProps = {
  initialState: string;
  states: Record<string, StateMachineStateDef>;
  transitions: StateMachineTransitionDef[];
};

export class StateMachineComponent {
  static readonly type = "StateMachine";
  readonly type = StateMachineComponent.type;

  initialState: string;
  states: Record<string, StateMachineStateDef>;
  transitions: StateMachineTransitionDef[];

  // runtime
  _initialized = false;
  _currentState?: string;
  _timeInStateMs = 0;

  constructor(props: StateMachineComponentProps) {
    this.initialState = props.initialState;
    this.states = props.states ?? {};
    this.transitions = props.transitions ?? [];
  }

  addState(name: string): void {
    if (!name) return;
    if (!this.states[name]) this.states[name] = {};
  }

  setState(name: string): void {
    if (!name) return;
    this._currentState = name;
    this._timeInStateMs = 0;
  }

  update(dtMs: number): void {
    this._timeInStateMs += Math.max(0, dtMs);
  }

  getState(): string | undefined {
    return this._currentState;
  }

  getTimeInStateMs(): number {
    return this._timeInStateMs;
  }

  addTransition(transition: StateMachineTransitionDef): void {
    if (!transition || !transition.to || !transition.when) return;
    this.transitions.push(transition);
  }

  getTransitionsFrom(state: string): StateMachineTransitionDef[] {
    return this.transitions.filter((t) => (t.from ?? "*") === "*" || t.from === state);
  }

  resetToInitialState(): void {
    this.setState(this.initialState);
    this._initialized = false;
  }
}

