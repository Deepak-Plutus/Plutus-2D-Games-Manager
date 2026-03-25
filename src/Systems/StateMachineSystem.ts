import { System } from "../Core/System";
import type { World } from "../Core/World";
import { RES_INPUT } from "./InputSystem";
import type { InputState } from "./InputSystem";
import { RES_UI } from "./UiSystem";
import type { UiState } from "./UiSystem";
import { RES_ENTITIES } from "./EntitiesManagementSystem";
import type { EntitiesResource } from "./EntitiesManagementSystem";
import { RES_AUDIO_API, type AudioApi } from "./AudioSystem";
import type { StateApi } from "./StateManagementSystem";
import { RES_STATE_API } from "./StateManagementSystem";
import { TimerComponent } from "../Components/TimerComponent";
import { StateMachineComponent, type StateMachineAction, type StateMachineCondition } from "../Components/StateMachineComponent";

export class StateMachineSystem extends System {
  get singletonKey(): string {
    return "StateMachineSystem";
  }

  update(dt: number, world: World): void {
    const input = world.getResource<InputState>(RES_INPUT);
    const ui = world.getResource<UiState>(RES_UI);
    const entities = world.getResource<EntitiesResource>(RES_ENTITIES);
    const audio = world.getResource<AudioApi>(RES_AUDIO_API);
    const stateApi = world.getResource<StateApi>(RES_STATE_API);

    // Timer ended condition can still work without these, but actions may require them.
    void entities;

    for (const [entity, sm] of world.query(StateMachineComponent)) {
      if (!sm._initialized) {
        sm._initialized = true;
        sm.setState(sm.initialState);
        this.runStateActions(sm, sm._currentState, "onEnter", world, audio, entities, stateApi, entity.id);
      }

      sm.update(dt);

      const fromState = sm._currentState;
      if (!fromState) continue;

      for (const tr of sm.transitions) {
        if (tr.from && tr.from !== "*" && tr.from !== fromState) continue;
        if (!this.evalCondition(tr.when, entity.id, world, input, ui, entities)) continue;

        const prev = fromState;
        // exit actions
        this.runStateActions(sm, prev, "onExit", world, audio, entities, stateApi, entity.id);

        // transition actions (optional)
        for (const a of tr.actions ?? []) {
          this.executeAction(a, world, audio, entities, stateApi, entity.id);
        }

        // enter actions
        sm.setState(tr.to);
        this.runStateActions(sm, tr.to, "onEnter", world, audio, entities, stateApi, entity.id);
        break;
      }

      // onUpdate actions each frame (kept separate from transitions)
      const st = sm.states[sm._currentState ?? ""];
      if (st?.onUpdate?.length) {
        for (const a of st.onUpdate) this.executeAction(a, world, audio, entities, stateApi, entity.id);
      }
    }
  }

  private evalCondition(
    cond: StateMachineCondition,
    selfId: number,
    world: World,
    input: InputState | undefined,
    ui: UiState | undefined,
    entities: EntitiesResource | undefined,
  ): boolean {
    switch (cond.type) {
      case "Always":
        return true;
      case "KeyJustPressed":
        return input?.justPressed.has(cond.code) ?? false;
      case "UiEquals":
        return (ui?.values[cond.key] ?? undefined) === cond.value;
      case "ResourceEquals":
        return world.getResource(cond.key as any) === cond.value;
      case "TimerEnded": {
        if (!entities) return false;
        const tEnt = entities.findByName(cond.timerName);
        if (!tEnt) return false;
        const timer = world.getComponent(tEnt, TimerComponent);
        if (!timer) return false;
        // TimerSystem marks active=false when it finishes (non-repeat).
        return timer._started && (timer.active === false || timer._remainingMs <= 0);
      }
      default:
        void selfId;
        return false;
    }
  }

  private runStateActions(
    sm: StateMachineComponent,
    stateName: string | undefined,
    hook: "onEnter" | "onExit",
    world: World,
    audio: AudioApi | undefined,
    entities: EntitiesResource | undefined,
    stateApi: StateApi | undefined,
    selfId: number,
  ): void {
    if (!stateName) return;
    const def = sm.states[stateName];
    const actions = hook === "onEnter" ? def?.onEnter : def?.onExit;
    for (const a of actions ?? []) this.executeAction(a, world, audio, entities, stateApi, selfId);
  }

  private executeAction(
    action: StateMachineAction,
    world: World,
    audio: AudioApi | undefined,
    entities: EntitiesResource | undefined,
    stateApi: StateApi | undefined,
    selfId: number,
  ): void {
    switch (action.type) {
      case "PlaySound":
        audio?.play(action.soundId);
        return;
      case "SetResource":
        world.setResource(action.key, action.value);
        return;
      case "TransitionGameState":
        stateApi?.transition(action.to as any, action.reason);
        return;
      case "DespawnSelf":
        entities?.despawnById(selfId);
        return;
      default:
        return;
    }
  }
}

