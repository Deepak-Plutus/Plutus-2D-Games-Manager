import { System } from "../Core/System";
import type { World } from "../Core/World";
import { RES_AUDIO, RES_AUDIO_API, type AudioApi, type AudioState } from "./AudioSystem";
import { RES_ENTITIES, type EntitiesResource } from "./EntitiesManagementSystem";
import { RES_STATE_API, type StateApi } from "./StateManagementSystem";
import type { TimerAction } from "../Components/TimerComponent";
import { TimerComponent as TimerComponentClass } from "../Components/TimerComponent";

export const RES_TIMERS = "timers";

export class TimerSystem extends System {
  get singletonKey(): string {
    return "TimerSystem";
  }

  update(_dt: number, world: World): void {
    const audio = world.getResource<AudioApi>(RES_AUDIO_API);
    const entities = world.getResource<EntitiesResource>(RES_ENTITIES);
    const stateApi = world.getResource<StateApi>(RES_STATE_API);
    const _audioState = world.getResource<AudioState>(RES_AUDIO);
    void _audioState;

    if (!entities) return;

    const dt = _dt;

    for (const [entity, timer] of world.query(TimerComponentClass)) {
      if (!timer.active) continue;

      if (stateApi?.is("paused") ?? false) continue;

      timer.update(dt);
      if (!timer.isFinished()) continue;

      for (const action of timer.onExpire) this.execute(action, world, entity.id, audio, entities, stateApi);

      if (timer.repeat) {
        timer.start(timer.durationMs);
      } else {
        timer.active = false;
      }
    }
  }

  private execute(
    action: TimerAction,
    world: World,
    selfId: number,
    audio: AudioApi | undefined,
    entities: EntitiesResource,
    stateApi: StateApi | undefined,
  ): void {
    switch (action.type) {
      case "PlaySound":
        audio?.play(action.soundId);
        return;
      case "SetResource":
        world.setResource(action.key, action.value);
        return;
      case "TransitionState":
        stateApi?.transition(action.to as any, action.reason ?? "timer_expire");
        return;
      case "DespawnSelf":
        entities.despawnById(selfId);
        return;
      default:
        return;
    }
  }
}

