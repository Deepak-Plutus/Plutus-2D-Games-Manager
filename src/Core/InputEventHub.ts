export class InputEventHub extends EventTarget {
  emit (type: string, detail: Record<string, unknown> = {}): void {
    this.dispatchEvent(new CustomEvent(type, { detail: { ...detail } }))
  }

  on (
    type: string,
    handler: (ev: CustomEvent<Record<string, unknown>>) => void,
    options?: AddEventListenerOptions | boolean
  ): () => void {
    this.addEventListener(type, handler as EventListener, options)
    return () => this.off(type, handler, options)
  }

  off (
    type: string,
    handler: (ev: CustomEvent<Record<string, unknown>>) => void,
    options?: EventListenerOptions | boolean
  ): void {
    this.removeEventListener(type, handler as EventListener, options)
  }

  once (type: string, handler: (ev: CustomEvent<Record<string, unknown>>) => void): void {
    const wrapped = (ev: Event) => handler(ev as CustomEvent<Record<string, unknown>>)
    this.addEventListener(type, wrapped, { once: true })
  }
}
