import { eventBus } from './index.js';
import { get } from 'svelte/store';
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { preferences, isQuietHoursActive } from '$lib/stores/preferencesStore.js';

let _initialized = false;

/**
 * Initialize sync event handlers for user-facing notification behavior.
 * Call once at app startup. Safe to call multiple times (idempotent).
 */
export function initSyncHandlers(): void {
  if (_initialized) return;
  _initialized = true;

  // Show toast on sync failure
  eventBus.onTauri<{ account_id: string; error: string }>('sync:failed', ({ error }) => {
    const notificationPreferences = get(preferences).notifications;
    if (
      notificationPreferences.syncFailureToasts &&
      typeof window !== 'undefined' &&
      (window as any).notification
    ) {
      // Categorize common errors for user-friendly messages
      let title = 'Sync Failed';
      let message = error;

      if (error.includes('Authentication failed') || error.includes('Login failed')) {
        title = 'Invalid Credentials';
        message = 'Please check your email and password in Settings.';
      } else if (error.includes('Connection failed') || error.includes('Failed to connect')) {
        title = 'Connection Failed';
        message = 'Could not reach the mail server. Check your IMAP settings and network.';
      } else if (error.includes('Timeout')) {
        title = 'Connection Timeout';
        message = 'The mail server took too long to respond.';
      } else if (error.includes('Credential error') || error.includes('Failed to get password')) {
        title = 'Missing Password';
        message = 'No password stored for this account. Please re-enter it in Settings.';
      }

      (window as any).notification.show({
        type: 'error',
        title,
        message,
        duration: 8000
      });
    }
  });

  // Show toast on sync success
  eventBus.onTauri<{ account_email: string; new_count?: number }>('sync:completed', async ({ account_email, new_count }) => {
    const notificationPreferences = get(preferences).notifications;

    if (
      notificationPreferences.syncSuccessToasts &&
      typeof window !== 'undefined' &&
      (window as any).notification
    ) {
      (window as any).notification.show({
        type: 'success',
        title: 'Sync Complete',
        message: `${account_email} is up to date`,
        duration: 3000
      });
    }

    // Send system notification for new mail if window is not focused
    if (
      notificationPreferences.desktopNotifications &&
      !isQuietHoursActive(notificationPreferences) &&
      new_count &&
      new_count > 0
    ) {
      try {
        const window = getCurrentWindow();
        const focused = await window.isFocused();

        if (!focused) {
          let permissionGranted = await isPermissionGranted();
          if (!permissionGranted) {
            const result = await requestPermission();
            permissionGranted = result === 'granted';
          }

          if (permissionGranted) {
            sendNotification({
              title: 'New Mail',
              body: `${new_count} new message${new_count > 1 ? 's' : ''} in ${account_email}`
            });
          }
        }
      } catch (e) {
        console.error('[syncHandlers] Failed to send notification:', e);
      }
    }
  });
}
