export class BehaviorEventHub extends EventTarget {
  private _bc: BroadcastChannel | null

  constructor (broadcastChannelName: string | null = null) {
    super()
    this._bc = broadcastChannelName ? new BroadcastChannel(broadcastChannelName) : null
  }

  emit (type: string, detail: Record<string, unknown> = {}): void {
    this.dispatchEvent(new CustomEvent(type, { detail: { ...detail } }))
    try {
      this._bc?.postMessage({ type, detail })
    } catch {
      // ignore cross-context mirror failures
    }
  }

  destroy (): void {
    this._bc?.close()
    this._bc = null
  }
}
