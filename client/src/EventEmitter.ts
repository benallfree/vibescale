// Generic event map type that maps event names to their payload types
export type EventMap = Record<string, any>

export class EventEmitter<Events extends EventMap = EventMap> {
  private events: Map<keyof Events, Set<(payload: Events[keyof Events]) => void>> = new Map()

  on<E extends keyof Events>(event: E, callback: (payload: Events[E]) => void): () => void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set())
    }
    this.events.get(event)!.add(callback as any)

    // Return unsubscribe function
    return () => this.off(event, callback)
  }

  off<E extends keyof Events>(event: E, callback: (payload: Events[E]) => void): void {
    this.events.get(event)?.delete(callback as any)
  }

  emit<E extends keyof Events>(event: E, payload: Events[E]): void {
    this.events.get(event)?.forEach((callback) => callback(payload))
  }
}
