import { render, screen } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';
import MailList from './MailList.svelte';
import type { UserPreferences } from '$lib/stores/preferencesStore';

// Mock the stores with manual objects to avoid store imports
vi.mock('$lib/stores/mailStore.js', () => ({
	displayedEmails: { subscribe: (cb: (value: unknown[]) => void) => { cb([]); return () => {}; } },
	activeFolder: { subscribe: (cb: (value: string) => void) => { cb('inbox'); return () => {}; } },
	markMailReadLocally: vi.fn(),
	selectedAccountId: { subscribe: (cb: (value: string | null) => void) => { cb(null); return () => {}; } }
}));

vi.mock('$lib/stores/accountStore.js', () => ({
	accounts: { subscribe: (cb: (value: unknown[]) => void) => { cb([]); return () => {}; } }
}));

vi.mock('$lib/stores/preferencesStore.js', () => ({
	preferences: {
		subscribe: (cb: (value: UserPreferences) => void) => {
			cb({
				appearance: {
					accentTone: 'blue',
					mailDensity: 'comfortable',
					showPreviewSnippets: true,
					showAccountColor: true
				},
				notifications: {
					desktopNotifications: true,
					syncSuccessToasts: true,
					syncFailureToasts: true,
					quietHoursEnabled: false,
					quietHoursStart: '22:00',
					quietHoursEnd: '08:00'
				},
				keyboard: {
					singleKeyShortcuts: true,
					showShortcutHints: true,
					sendWithModEnter: false
				},
				privacy: {
					blockExternalImages: true,
					blockRemoteFonts: true,
					remoteContentAction: 'always_ask',
					readReceiptPolicy: 'never_send',
					htmlRenderingMode: 'sanitized',
					blockFormsInEmails: true,
					showSecurityWarnings: true,
					warnBeforeSuspiciousLinks: true,
					showFullUrlOnHover: true
				},
				language: {
					locale: 'en',
					autoDetect: true
				}
			});
			return () => {};
		}
	}
}));

describe('MailList', () => {
	it('renders "No emails found" when list is empty', () => {
		render(MailList, {
			selectedMailId: null,
			onSelectMail: vi.fn(),
			width: 300
		});

		expect(screen.getByText('No emails found')).toBeInTheDocument();
	});
});
