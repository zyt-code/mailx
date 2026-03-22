import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	syncNotificationPreferencesFromBackend,
	syncNotificationPreferencesToBackend
} from '../src/lib/utils/notificationBridge';

// Mock Tauri invoke
const mockInvoke = vi.fn();
vi.mock('@tauri-apps/api/core', () => ({
	invoke: (...args: unknown[]) => mockInvoke(...args)
}));

import { get } from 'svelte/store';
import { preferences } from '../src/lib/stores/preferencesStore';

describe('notificationBridge', () => {
	beforeEach(() => {
		// Reset preferences to default before each test
		preferences.resetAll();
		vi.clearAllMocks();
	});

	describe('syncNotificationPreferencesFromBackend', () => {
		it('should map backend preferences to frontend format', async () => {
			const mockBackendPrefs = {
				enabled: true,
				new_mail: true,
				send_status: true,
				sync_errors: true,
				sound_enabled: true,
				quiet_hours: {
					enabled: true,
					start: '22:00',
					end: '08:00'
				},
				focus_assist_respect: true
			};

			mockInvoke.mockResolvedValue(mockBackendPrefs);

			await syncNotificationPreferencesFromBackend();

			const currentPrefs = get(preferences).notifications;
			expect(currentPrefs.desktopNotifications).toBe(true);
			expect(currentPrefs.syncFailureToasts).toBe(true);
			expect(currentPrefs.quietHoursEnabled).toBe(true);
			expect(currentPrefs.quietHoursStart).toBe('22:00');
			expect(currentPrefs.quietHoursEnd).toBe('08:00');
		});

		it('should handle Tauri command failures gracefully', async () => {
			mockInvoke.mockRejectedValue(new Error('Tauri command not available'));

			// Should not throw
			await expect(syncNotificationPreferencesFromBackend()).resolves.not.toThrow();

			// Preferences should remain at defaults
			const currentPrefs = get(preferences).notifications;
			expect(currentPrefs).toBeDefined();
		});
	});

	describe('syncNotificationPreferencesToBackend', () => {
		it('should map frontend preferences to backend format', async () => {
			// Set up frontend preferences
			preferences.updateSection('notifications', {
				desktopNotifications: true,
				syncFailureToasts: false,
				quietHoursEnabled: true,
				quietHoursStart: '23:00',
				quietHoursEnd: '07:00'
			});

			mockInvoke.mockResolvedValue(undefined);

			await syncNotificationPreferencesToBackend();

			expect(mockInvoke).toHaveBeenCalledWith('set_notification_preferences', {
				prefs: expect.objectContaining({
					enabled: true,
					sync_errors: false,
					quiet_hours: {
						enabled: true,
						start: '23:00',
						end: '07:00'
					}
				})
			});
		});

		it('should throw on Tauri command failures', async () => {
			mockInvoke.mockRejectedValue(new Error('Failed to save'));

			await expect(syncNotificationPreferencesToBackend()).rejects.toThrow();
		});
	});

	describe('field mapping', () => {
		it('should correctly map all supported fields', async () => {
			const mockBackendPrefs = {
				enabled: false,
				new_mail: true,
				send_status: true,
				sync_errors: false,
				sound_enabled: true,
				quiet_hours: {
					enabled: true,
					start: '21:00',
					end: '06:00'
				},
				focus_assist_respect: true
			};

			mockInvoke.mockResolvedValue(mockBackendPrefs);

			await syncNotificationPreferencesFromBackend();

			const currentPrefs = get(preferences).notifications;
			expect(currentPrefs.desktopNotifications).toBe(false);
			expect(currentPrefs.syncFailureToasts).toBe(false);
			expect(currentPrefs.quietHoursEnabled).toBe(true);
			expect(currentPrefs.quietHoursStart).toBe('21:00');
			expect(currentPrefs.quietHoursEnd).toBe('06:00');
		});

		it('should use default values for backend-only fields when sending', async () => {
			preferences.updateSection('notifications', {
				desktopNotifications: true,
				syncFailureToasts: true
			});

			mockInvoke.mockResolvedValue(undefined);

			await syncNotificationPreferencesToBackend();

			const callArgs = mockInvoke.mock.calls[0] as unknown[][];
			const sentPrefs = callArgs[1] as unknown as { prefs: Record<string, unknown> };

			// These should always be sent with default values
			expect(sentPrefs.prefs.new_mail).toBe(true);
			expect(sentPrefs.prefs.send_status).toBe(true);
			expect(sentPrefs.prefs.sound_enabled).toBe(true);
			expect(sentPrefs.prefs.focus_assist_respect).toBe(true);
		});
	});
});
