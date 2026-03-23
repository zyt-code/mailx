import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { i18nStore } from '$lib/stores/i18nStore.svelte';
import Sidebar from './Sidebar.svelte';

const {
	syncAccountMock,
	syncAllAccountsMock,
	mockState
} = vi.hoisted(() => ({
	syncAccountMock: vi.fn(),
	syncAllAccountsMock: vi.fn(),
	mockState: {
		hasAccounts: true,
		activeAccount: {
			id: 'acc-1',
			name: 'Primary',
			email: 'primary@example.com',
			is_active: true
		},
		accounts: [
			{
				id: 'acc-1',
				name: 'Primary',
				email: 'primary@example.com',
				is_active: true
			}
		],
		isSyncing: false,
		lastSyncTime: null as number | null,
		syncingAccountId: null as string | null,
		selectedAccountId: null as string | null,
		folderUnreadCounts: {
			inbox: 3,
			sent: 0,
			drafts: 0,
			archive: 0,
			trash: 0
		},
		preferences: {
			appearance: {
				accentTone: 'blue',
				mailDensity: 'comfortable',
				showPreviewSnippets: true,
				showAccountColor: true,
				theme: 'system'
			},
			notifications: {
				desktopNotifications: true,
				syncSuccessToasts: true,
				syncFailureToasts: true,
				quietHoursEnabled: false,
				quietHoursStart: '22:00',
				quietHoursEnd: '07:00'
			},
			keyboard: {
				singleKeyShortcuts: true,
				showShortcutHints: true,
				sendWithModEnter: true
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
		}
	}
}));

vi.mock('$lib/stores/accountStore.js', () => ({
	hasAccounts: { subscribe: (cb: (value: boolean) => void) => { cb(mockState.hasAccounts); return () => {}; } },
	activeAccount: { subscribe: (cb: (value: typeof mockState.activeAccount) => void) => { cb(mockState.activeAccount); return () => {}; } },
	accounts: { subscribe: (cb: (value: typeof mockState.accounts) => void) => { cb(mockState.accounts); return () => {}; } }
}));

vi.mock('$lib/stores/syncStore.js', () => ({
	isSyncing: { subscribe: (cb: (value: boolean) => void) => { cb(mockState.isSyncing); return () => {}; } },
	lastSyncTime: { subscribe: (cb: (value: number | null) => void) => { cb(mockState.lastSyncTime); return () => {}; } },
	syncingAccountId: { subscribe: (cb: (value: string | null) => void) => { cb(mockState.syncingAccountId); return () => {}; } }
}));

vi.mock('$lib/stores/unreadStore.js', () => ({
	folderUnreadCounts: {
		subscribe: (cb: (value: typeof mockState.folderUnreadCounts) => void) => {
			cb(mockState.folderUnreadCounts);
			return () => {};
		}
	}
}));

vi.mock('$lib/stores/mailStore.js', () => ({
	selectedAccountId: { subscribe: (cb: (value: string | null) => void) => { cb(mockState.selectedAccountId); return () => {}; } }
}));

vi.mock('$lib/stores/preferencesStore.js', () => ({
	preferences: {
		subscribe: (cb: (value: typeof mockState.preferences) => void) => {
			cb(mockState.preferences);
			return () => {};
		},
		updateSection: vi.fn()
	}
}));

vi.mock('$lib/sync/index.js', () => ({
	syncAccount: syncAccountMock,
	syncAllAccounts: syncAllAccountsMock
}));

vi.mock('$lib/events/index.js', () => ({
	eventBus: {
		on: vi.fn(),
		off: vi.fn()
	}
}));

describe('Sidebar refresh interactions', () => {
	beforeEach(async () => {
		await i18nStore.waitForReady();
		syncAccountMock.mockReset();
		syncAllAccountsMock.mockReset();
		syncAccountMock.mockResolvedValue({});
		syncAllAccountsMock.mockResolvedValue([]);
		mockState.hasAccounts = true;
		mockState.selectedAccountId = null;
		mockState.activeAccount = {
			id: 'acc-1',
			name: 'Primary',
			email: 'primary@example.com',
			is_active: true
		};
		mockState.isSyncing = false;
	});

	it('triggers account sync when clicking refresh', async () => {
		const onRefresh = vi.fn().mockResolvedValue(undefined);

		render(Sidebar, {
			collapsed: false,
			isMobile: false,
			activeFolder: 'inbox',
			onToggle: vi.fn(),
			onSelectFolder: vi.fn(),
			onRefresh,
			onOpenSettings: vi.fn()
		});

		await fireEvent.click(screen.getByLabelText('Refresh'));

		await waitFor(() => {
			expect(syncAccountMock).toHaveBeenCalledWith('acc-1');
		});
		expect(onRefresh).toHaveBeenCalled();
	});
});
