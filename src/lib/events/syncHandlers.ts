import { eventBus } from './index.js';

/**
 * Initialize sync event handlers for notifications.
 * Call once at app startup.
 */
export function initSyncHandlers(): void {
  eventBus.onTauri<{ account_id: string; error: string }>('sync:failed', ({ error }) => {
    if (typeof window !== 'undefined' && (window as any).notification) {
      (window as any).notification.show({
        type: 'error',
        title: 'Sync Failed',
        message: error,
        duration: 8000
      });
    }
  });

  eventBus.onTauri<{ account_email: string }>('sync:completed', ({ account_email }) => {
    if (typeof window !== 'undefined' && (window as any).notification) {
      (window as any).notification.show({
        type: 'success',
        title: 'Sync Complete',
        message: `${account_email} is up to date`,
        duration: 3000
      });
    }
  });
}
