/**
 * Event hub for behavior-level game events with optional BroadcastChannel mirroring.
 */
export class BehaviorEventHub extends EventTarget {
  private _bc: BroadcastChannel | null

  /**
   * @param {string | null} broadcastChannelName Optional channel name for cross-context mirrors.
   */
  constructor (broadcastChannelName: string | null = null) {
    super()
    this._bc = broadcastChannelName ? new BroadcastChannel(broadcastChannelName) : null
  }

  /**
   * Emits a local custom event and mirrors it to BroadcastChannel when available.
   *
   * @param {string} type Event type.
   * @param {Record<string, unknown>} detail Event payload.
   * @returns {void} Nothing.
   */
  emit (type: string, detail: Record<string, unknown> = {}): void {
    this.dispatchEvent(new CustomEvent(type, { detail: { ...detail } }))
    try {
      this._bc?.postMessage({ type, detail })
    } catch {
      // ignore cross-context mirror failures
    }
  }

  /**
   * Closes channel resources.
   *
   * @returns {void} Nothing.
   */
  destroy (): void {
    this._bc?.close()
    this._bc = null
  }
}
