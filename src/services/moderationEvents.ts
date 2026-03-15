// Sistema de eventos para atualização em tempo real do painel de moderação

type EventCallback = (data?: unknown) => void;

class ModerationEventEmitter {
  private listeners: { [key: string]: EventCallback[] } = {};

  on(event: string, callback: EventCallback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  off(event: string, callback: EventCallback) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
  }

  emit(event: string, data?: unknown) {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach(callback => callback(data));
  }
}

export const moderationEvents = new ModerationEventEmitter();

// Tipos de eventos
export const MODERATION_EVENTS = {
  BAN_APPLIED: 'ban_applied',
  MUTE_APPLIED: 'mute_applied',
  TIMEOUT_APPLIED: 'timeout_applied',
  BAN_REMOVED: 'ban_removed',
  MUTE_REMOVED: 'mute_removed',
  TIMEOUT_REMOVED: 'timeout_removed',
  MESSAGE_DELETED: 'message_deleted',
  REFRESH_NEEDED: 'refresh_needed'
} as const;
