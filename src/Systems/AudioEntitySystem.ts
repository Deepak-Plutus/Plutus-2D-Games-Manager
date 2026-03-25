import { System } from "../Core/System";
import type { World } from "../Core/World";
import type { AudioApi, AudioState } from "./AudioSystem";
import { RES_AUDIO, RES_AUDIO_API } from "./AudioSystem";
import type { StateApi } from "./StateManagementSystem";
import { RES_STATE_API } from "./StateManagementSystem";
import { AudioSoundComponent } from "../Components/audio/AudioSoundComponent";
import { AudioMusicComponent } from "../Components/audio/AudioMusicComponent";

/**
 * AudioEntitySystem
 * - Registers JSON-defined sounds from `AudioSound` / `AudioMusic` components.
 * - Optionally auto-plays music when:
 *   - sound type is "url" (pause/resume works), and
 *   - browser audio is unlocked, and
 *   - game is in "playing" state.
 */
export class AudioEntitySystem extends System {
  get singletonKey(): string {
    return "AudioEntitySystem";
  }

  update(_dt: number, world: World): void {
    const audioApi = world.getResource<AudioApi>(RES_AUDIO_API);
    const audioState = world.getResource<AudioState>(RES_AUDIO);
    if (!audioApi || !audioState) return;

    const stateApi = world.getResource<StateApi>(RES_STATE_API);

    // Register SFX + optional auto-play.
    for (const [, sound] of world.query(AudioSoundComponent)) {
      if (!sound._registered) {
        const def = sound.toSoundDef();
        if (def) audioApi.registerSound(def);
        sound._registered = true;
      }

      // keep runtime changes (e.g. setVolume) reflected in AudioSystem registry
      if (sound._registered) {
        const def = sound.toSoundDef();
        if (def) audioApi.changeSound(sound.soundId, def as Partial<typeof def>);
      }

      // SFX autoplay is intentionally conservative: only once when unlocked,
      // and only if the sound is "url" (tone can't be paused/resumed).
      if (sound.autoplay && !sound._autoplayStarted && audioState.unlocked) {
        const def = sound.toSoundDef();
        if (def?.type === "url") {
          audioApi.play(sound.soundId);
        }
        sound._autoplayStarted = true;
      }

      if (sound.consumePlayRequest()) {
        audioApi.play(sound.soundId);
      }
      if (sound.consumeStopRequest()) {
        audioApi.stop(sound.soundId);
      }
    }

    // Register + auto-play music.
    for (const [, music] of world.query(AudioMusicComponent)) {
      if (!music._registered) {
        const def = music.toSoundDef();
        if (def) audioApi.registerSound(def);
        music._registered = true;
      }

      // keep runtime changes (setVolume/setLoop) reflected
      if (music._registered) {
        const def = music.toSoundDef();
        if (def) audioApi.changeSound(music.soundId, def as Partial<typeof def>);
      }

      if (music.consumePlayRequest()) {
        audioApi.play(music.soundId);
        music._playingUrl = music.soundType === "url";
      }
      if (music.consumePauseRequest()) {
        audioApi.pause(music.soundId);
        music._playingUrl = false;
      }
      if (music.consumeStopRequest()) {
        audioApi.stop(music.soundId);
        music._playingUrl = false;
      }

      if (!music.autoplay) continue;

      // Only auto-play URL music to avoid WebAudio tone restart spam.
      if (music.soundType !== "url") continue;

      const shouldPlay = audioState.unlocked && (stateApi ? stateApi.is("playing") : true);

      if (shouldPlay) {
        if (!music._playingUrl) {
          audioApi.play(music.soundId);
          music._playingUrl = true;
        }
      } else {
        if (music._playingUrl) {
          audioApi.pause(music.soundId);
          music._playingUrl = false;
        }
      }
    }
  }
}

