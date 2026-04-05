import { listen, type UnlistenFn } from '@tauri-apps/api/event';

type EventCallback<T = any> = (payload: T) => void | Promise<void>;

/**
 * Central event bus for coordinating app state
 * Handles both Tauri backend events and internal frontend events
 */
export class EventBus {
  private listeners: Map<string, Set<EventCallback>> = new Map();
  private tauriUnlisteners: UnlistenFn[] = [];

  /**
   * Listen to events from Tauri backend
   */
  async onTauri<T>(event: string, callback: EventCallback<T>): Promise<void> {
    const unlisten = await listen<T>(event, (event) => callback(event.payload));
    this.tauriUnlisteners.push(unlisten);
  }

  /**
   * Listen to internal frontend events
   */
  on(event: string, callback: EventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: EventCallback): void {
    const callbacks = this.listeners.get(event);
    if (!callbacks) return;
    callbacks.delete(callback);
    if (callbacks.size === 0) {
      this.listeners.delete(event);
    }
  }

  /**
   * Emit an internal frontend event
   */
  emit(event: string, payload?: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      [...callbacks].forEach(cb => cb(payload));
    }
  }

  async emitAsync(event: string, payload?: any): Promise<void> {
    const callbacks = this.listeners.get(event);
    if (!callbacks) return;

    for (const callback of [...callbacks]) {
      await callback(payload);
    }
  }

  /**
   * Remove all listeners (cleanup)
   */
  destroy(): void {
    this.tauriUnlisteners.forEach(unlisten => unlisten());
    this.listeners.clear();
  }
}

// Singleton instance
export const eventBus = new EventBus();
