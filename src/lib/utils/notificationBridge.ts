import { invoke } from '@tauri-apps/api/core';
import { get } from 'svelte/store';
import { preferences } from '$lib/stores/preferencesStore';

/**
 * Backend notification preferences from Tauri NotificationManager
 */
interface BackendNotificationPreferences {
	enabled: boolean;
	new_mail: boolean;
	send_status: boolean;
	sync_errors: boolean;
	sound_enabled: boolean;
	quiet_hours: {
		enabled: boolean;
		start: string;
		end: string;
	};
	focus_assist_respect: boolean;
}

/**
 * Frontend notification preferences from preferencesStore
 */
interface FrontendNotificationPreferences {
	desktopNotifications: boolean;
	syncSuccessToasts: boolean;
	syncFailureToasts: boolean;
	quietHoursEnabled: boolean;
	quietHoursStart: string;
	quietHoursEnd: string;
}

/**
 * Mapping: Frontend → Backend
 */
function toBackendPreferences(
	frontend: FrontendNotificationPreferences
): BackendNotificationPreferences {
	return {
		enabled: frontend.desktopNotifications,
		new_mail: true, // Default: always notify for new mail if desktop notifications are enabled
		send_status: true, // Default: show send status
		sync_errors: frontend.syncFailureToasts,
		sound_enabled: true, // Default: sound on
		quiet_hours: {
			enabled: frontend.quietHoursEnabled,
			start: frontend.quietHoursStart,
			end: frontend.quietHoursEnd
		},
		focus_assist_respect: true // Default: respect focus assist
	};
}

/**
 * Mapping: Backend → Frontend
 */
function toFrontendPreferences(
	backend: BackendNotificationPreferences
): Partial<FrontendNotificationPreferences> {
	return {
		desktopNotifications: backend.enabled,
		syncFailureToasts: backend.sync_errors,
		quietHoursEnabled: backend.quiet_hours.enabled,
		quietHoursStart: backend.quiet_hours.start,
		quietHoursEnd: backend.quiet_hours.end
		// Note: syncSuccessToasts is frontend-only, not mapped from backend
	};
}

/**
 * Load notification preferences from Tauri backend and merge into frontend store
 *
 * This function:
 * 1. Calls the Tauri 'get_notification_preferences' command
 * 2. Maps backend preferences to frontend format
 * 3. Merges them into the preferencesStore
 *
 * If the Tauri command fails (e.g., running in browser), the function
 * silently succeeds to allow fallback to localStorage-only mode.
 */
export async function syncNotificationPreferencesFromBackend(): Promise<void> {
	try {
		const backendPrefs =
			await invoke<BackendNotificationPreferences>('get_notification_preferences');
		const frontendPatch = toFrontendPreferences(backendPrefs);

		// Merge backend preferences into frontend store
		preferences.updateSection('notifications', frontendPatch);

		console.log('[notificationBridge] Synced preferences from backend:', frontendPatch);
	} catch (error) {
		// Silently fail - this allows the app to work in browser mode
		// or when the Tauri command is not available
		console.warn('[notificationBridge] Failed to sync from backend:', error);
	}
}

/**
 * Save notification preferences to Tauri backend
 *
 * This function:
 * 1. Reads current preferences from the store
 * 2. Maps them to backend format
 * 3. Calls the Tauri 'set_notification_preferences' command
 *
 * If the Tauri command fails, the error is logged but not thrown
 * to avoid disrupting the UI flow (preferences are still saved to localStorage).
 */
export async function syncNotificationPreferencesToBackend(): Promise<void> {
	try {
		const currentPrefs = get(preferences).notifications;
		const backendPrefs = toBackendPreferences(currentPrefs);

		await invoke('set_notification_preferences', {
			prefs: backendPrefs
		});

		console.log('[notificationBridge] Synced preferences to backend:', backendPrefs);
	} catch (error) {
		// Log but don't throw - localStorage is the source of truth
		console.error('[notificationBridge] Failed to sync to backend:', error);
		throw error; // Re-throw to allow UI to show error if needed
	}
}
