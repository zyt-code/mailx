import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { i18nStore } from '$lib/stores/i18nStore.svelte';
import Sidebar from './Sidebar.svelte';

const {
	eventBusEmitAsyncMock,
	mockState
} = vi.hoisted(() => ({
	eventBusEmitAsyncMock: vi.fn(),
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

vi.mock('$lib/events/index.js', () => ({
	eventBus: {
		on: vi.fn(),
		off: vi.fn(),
		emit: vi.fn(),
		emitAsync: eventBusEmitAsyncMock
	}
}));

describe('Sidebar refresh interactions', () => {
	beforeEach(async () => {
		await i18nStore.waitForReady();
		eventBusEmitAsyncMock.mockReset();
		eventBusEmitAsyncMock.mockResolvedValue(undefined);
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

	it('emits sync intent when clicking refresh', async () => {
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
			expect(eventBusEmitAsyncMock).toHaveBeenCalledWith('sync:trigger');
		});
		expect(onRefresh).not.toHaveBeenCalled();
	});

	it('emits a scoped sync intent when an explicit mailbox account is selected', async () => {
		mockState.selectedAccountId = 'acc-2';
		mockState.accounts = [
			{
				id: 'acc-1',
				name: 'Primary',
				email: 'primary@example.com',
				is_active: true
			},
			{
				id: 'acc-2',
				name: 'Secondary',
				email: 'secondary@example.com',
				is_active: false
			}
		];

		render(Sidebar, {
			collapsed: false,
			isMobile: false,
			activeFolder: 'inbox',
			onToggle: vi.fn(),
			onSelectFolder: vi.fn(),
			onRefresh: vi.fn(),
			onOpenSettings: vi.fn()
		});

		await fireEvent.click(screen.getByLabelText('Refresh'));

		await waitFor(() => {
			expect(eventBusEmitAsyncMock).toHaveBeenCalledWith('sync:trigger', { accountId: 'acc-2' });
		});
	});

	it('does not emit a second refresh intent while the first one is still pending', async () => {
		let resolveRefresh: (() => void) | undefined;
		eventBusEmitAsyncMock.mockImplementation(
			() =>
				new Promise<void>((resolve) => {
					resolveRefresh = resolve;
				})
		);

		render(Sidebar, {
			collapsed: false,
			isMobile: false,
			activeFolder: 'inbox',
			onToggle: vi.fn(),
			onSelectFolder: vi.fn(),
			onRefresh: vi.fn(),
			onOpenSettings: vi.fn()
		});

		const refreshButton = screen.getByLabelText('Refresh');
		await fireEvent.click(refreshButton);
		await fireEvent.click(refreshButton);

		expect(eventBusEmitAsyncMock).toHaveBeenCalledTimes(1);

		resolveRefresh?.();
		await Promise.resolve();
	});
});
