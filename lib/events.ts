/**
 * Sistema de eventos para sincronizar estado de sesiones y turnos
 */

type EventType = 'session-updated' | 'turno-updated'
type EventCallback = () => void

class EventEmitter {
  private listeners: Map<EventType, Set<EventCallback>> = new Map()

  on(event: EventType, callback: EventCallback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(callback)
  }

  off(event: EventType, callback: EventCallback) {
    const callbacks = this.listeners.get(event)
    if (callbacks) {
      callbacks.delete(callback)
    }
  }

  emit(event: EventType) {
    const callbacks = this.listeners.get(event)
    if (callbacks) {
      callbacks.forEach(callback => callback())
    }
  }
}

export const cajaEvents = new EventEmitter()
