const EVENT_NAMES = ['API:UN_AUTHORIZED', 'API:INVALID', 'API:NETWORK_ERROR'] as const
type EventName = (typeof EVENT_NAMES)[number]
type EventListener = (...args: any[]) => void

class EventEmitter {
  private listeners: Record<EventName, Set<EventListener>>
  constructor() {
    this.listeners = EVENT_NAMES.reduce(
      (lMap, eventName) => {
        lMap[eventName] = new Set()
        return lMap
      },
      {} as Record<EventName, Set<EventListener>>
    )
  }
  on(eventName: EventName, listener: EventListener) {
    this.listeners[eventName].add(listener)
  }

  emit(eventName: EventName, ...args: any[]) {
    this.listeners[eventName].forEach(listener => listener(...args))
  }
}

export default new EventEmitter()
