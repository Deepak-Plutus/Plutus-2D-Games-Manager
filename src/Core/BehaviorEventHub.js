/**
 * In-process behavior events + optional cross-context BroadcastChannel.
 * Use `addEventListener('bullet:hit', fn)` or `hub.on(type, fn)` pattern via wrapper.
 */
export class BehaviorEventHub extends EventTarget {
  /**
   * @param {string | null} [broadcastChannelName] if set, mirrors emits to BroadcastChannel
   */
  constructor(broadcastChannelName = null) {
    super();
    /** @type {BroadcastChannel | null} */
    this._bc = broadcastChannelName ? new BroadcastChannel(broadcastChannelName) : null;
  }

  /**
   * @param {string} type
   * @param {Record<string, unknown>} [detail]
   */
  emit(type, detail = {}) {
    this.dispatchEvent(new CustomEvent(type, { detail: { ...detail } }));
    try {
      this._bc?.postMessage({ type, detail });
    } catch {
      /* ignore */
    }
  }

  destroy() {
    this._bc?.close();
    this._bc = null;
  }
}
