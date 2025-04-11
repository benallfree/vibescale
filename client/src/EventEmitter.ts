// Generic event map type that maps event names to their payload types
export type EventMap = Record<string, any>

export type EmitterEvent<Events extends EventMap = EventMap, E extends keyof Events = keyof Events> = {
  name: E
  data: Events[E]
}

export type EmitterCallback<Events extends EventMap = EventMap, E extends keyof Events = keyof Events> = (
  event: EmitterEvent<Events, E>
) => void

export type Emitter<Events extends EventMap = EventMap> = {
  on<E extends keyof Events>(event: E | '*', callback: EmitterCallback<Events, E>): () => void
  off<E extends keyof Events>(event: E | '*', callback: EmitterCallback<Events, E>): void
  emit<E extends keyof Events>(name: E, data: Events[E]): void
}

export class EventEmitter<Events extends EventMap = EventMap> implements Emitter<Events> {
  private events: Map<keyof Events | '*', Set<EmitterCallback<Events, any>>> = new Map()

  on<E extends keyof Events>(event: E | '*', callback: EmitterCallback<Events, E>): () => void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set())
    }
    this.events.get(event)!.add(callback)
    return () => this.off(event, callback)
  }

  off<E extends keyof Events>(event: E | '*', callback: EmitterCallback<Events, E>): void {
    this.events.get(event)?.delete(callback)
  }

  emit<E extends keyof Events>(name: E, data: Events[E]): void {
    // Emit to specific event listeners
    this.events.get(name)?.forEach((callback) => callback({ name, data }))

    // Emit to wildcard listeners
    this.events.get('*')?.forEach((callback) => callback({ name, data }))
  }
}
