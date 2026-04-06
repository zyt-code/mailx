import { fireEvent, render, screen } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mail } from '$lib/types.js';
import AppShell from './AppShell.svelte';

const {
	hasAccountsStore,
	activeAccountStore,
	isSyncingStore,
	preferencesStore,
	displayedEmailsStore,
	selectedAccountIdStore,
	switchFolderMock,
	selectAccountMock,
	loadMailsMock,
	syncAccountMock,
	syncAllAccountsMock,
	eventBusEmitMock,
	eventBusEmitAsyncMock,
	gotoMock
} = vi.hoisted(() => ({
	hasAccountsStore: createMockStore(true),
	activeAccountStore: createMockStore({
		id: 'acc-1',
		name: 'Primary',
		email: 'primary@example.com',
		is_active: true
	}),
	isSyncingStore: createMockStore(false),
	preferencesStore: createMockStore({
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
	}),
	displayedEmailsStore: createMockStore<Mail[]>([]),
	selectedAccountIdStore: createMockStore<string | null>(null),
	switchFolderMock: vi.fn(),
	selectAccountMock: vi.fn(),
	loadMailsMock: vi.fn(),
	syncAccountMock: vi.fn().mockResolvedValue(undefined),
	syncAllAccountsMock: vi.fn().mockResolvedValue(undefined),
	eventBusEmitMock: vi.fn(),
	eventBusEmitAsyncMock: vi.fn().mockResolvedValue(undefined),
	gotoMock: vi.fn()
}));

function createMockStore<T>(initialValue: T) {
	let value = initialValue;
	const subscribers = new Set<(nextValue: T) => void>();

	return {
		subscribe(callback: (nextValue: T) => void) {
			callback(value);
			subscribers.add(callback);
			return () => {
				subscribers.delete(callback);
			};
		},
		set(nextValue: T) {
			value = nextValue;
			for (const subscriber of subscribers) {
				subscriber(value);
			}
		}
	};
}

function createMail(): Mail {
	return {
		id: 'mail-1',
		account_id: 'acc-1',
		folder: 'inbox',
		is_read: false,
		unread: true,
		subject: 'Hello',
		body: 'Body',
		html_body: '<p>Body</p>',
		from_name: 'Sender',
		from_email: 'sender@example.com',
		preview: 'Preview',
		timestamp: 1
	};
}

vi.mock('./Sidebar.svelte', async () => {
	const { default: SidebarMock } = await import('$lib/test/AppShellSidebarMock.svelte');
	return { default: SidebarMock };
});

vi.mock('./MailList.svelte', async () => {
	const { default: Mock } = await import('$lib/test/AppShellMailListMock.svelte');
	return { default: Mock };
});

vi.mock('./Resizer.svelte', async () => {
	const { default: Mock } = await import('$lib/test/EmptyComponentMock.svelte');
	return { default: Mock };
});

vi.mock('./ReadingPane.svelte', async () => {
	const { default: Mock } = await import('$lib/test/AppShellReadingPaneMock.svelte');
	return { default: Mock };
});

vi.mock('$lib/components/get-started/index.js', async () => {
	const { default: Mock } = await import('$lib/test/AppShellGetStartedMock.svelte');
	return { GetStarted: Mock };
});

vi.mock('$lib/stores/accountStore.js', () => ({
	hasAccounts: hasAccountsStore,
	activeAccount: activeAccountStore
}));

vi.mock('$lib/stores/syncStore.js', () => ({
	initSyncStore: vi.fn(),
	isSyncing: isSyncingStore
}));

vi.mock('$lib/stores/unreadStore.js', () => ({
	initUnreadStore: vi.fn()
}));

vi.mock('$lib/stores/preferencesStore.js', () => ({
	preferences: preferencesStore
}));

vi.mock('$lib/stores/mailStore.js', () => ({
	initMailStore: vi.fn(),
	switchFolder: switchFolderMock,
	setSelectedAccount: vi.fn(),
	selectAccount: selectAccountMock,
	markMailReadLocally: vi.fn(),
	markMailUnreadLocally: vi.fn(),
	displayedEmails: displayedEmailsStore,
	selectedAccountId: selectedAccountIdStore,
	loadMails: loadMailsMock
}));

vi.mock('$lib/events/index.js', () => ({
	initSyncHandlers: vi.fn(),
	initSyncOrchestrator: vi.fn(),
	eventBus: {
		on: vi.fn(),
		off: vi.fn(),
		emit: eventBusEmitMock,
		emitAsync: eventBusEmitAsyncMock
	}
}));

vi.mock('$lib/sync/index.js', () => ({
	syncAccount: syncAccountMock,
	syncAllAccounts: syncAllAccountsMock
}));

vi.mock('$app/navigation', () => ({
	goto: gotoMock
}));

vi.mock('$app/environment', () => ({
	browser: false
}));

vi.mock('$lib/db/index.js', () => ({
	moveToTrash: vi.fn(),
	updateMail: vi.fn(),
	moveToArchive: vi.fn()
}));

describe('AppShell mailbox workflow', () => {
	beforeEach(() => {
		hasAccountsStore.set(true);
		activeAccountStore.set({
			id: 'acc-1',
			name: 'Primary',
			email: 'primary@example.com',
			is_active: true
		});
		isSyncingStore.set(false);
		displayedEmailsStore.set([createMail()]);
		selectedAccountIdStore.set(null);
		switchFolderMock.mockReset();
		selectAccountMock.mockReset();
		loadMailsMock.mockReset();
		syncAccountMock.mockClear();
		syncAllAccountsMock.mockClear();
		eventBusEmitMock.mockReset();
		eventBusEmitAsyncMock.mockReset();
		eventBusEmitAsyncMock.mockResolvedValue(undefined);
		gotoMock.mockReset();
	});

	it('routes account selection through the explicit mailbox account command', async () => {
		render(AppShell);

		await fireEvent.click(screen.getByRole('button', { name: 'mock-select-account' }));

		expect(selectAccountMock).toHaveBeenCalledWith('acc-1');
		expect(switchFolderMock).not.toHaveBeenCalled();
		expect(loadMailsMock).not.toHaveBeenCalled();
	});

	it('clears the desktop reading selection when the mailbox folder changes', async () => {
		render(AppShell);

		await fireEvent.click(screen.getByRole('button', { name: 'mock-select-mail' }));

		expect(screen.getByTestId('mock-reading-pane')).toHaveAttribute('data-mail-id', 'mail-1');

		await fireEvent.click(screen.getByRole('button', { name: 'mock-select-folder' }));

		expect(switchFolderMock).toHaveBeenCalledWith('sent');
		expect(screen.getByTestId('mock-mail-list')).toHaveAttribute('data-selected-mail-id', '');
		expect(screen.getByTestId('mock-reading-pane')).toHaveAttribute('data-mail-id', '');
	});

	it('clears the desktop reading selection when the mailbox account changes', async () => {
		render(AppShell);

		await fireEvent.click(screen.getByRole('button', { name: 'mock-select-mail' }));

		expect(screen.getByTestId('mock-reading-pane')).toHaveAttribute('data-mail-id', 'mail-1');

		await fireEvent.click(screen.getByRole('button', { name: 'mock-select-account' }));

		expect(selectAccountMock).toHaveBeenCalledWith('acc-1');
		expect(switchFolderMock).not.toHaveBeenCalled();
		expect(screen.getByTestId('mock-mail-list')).toHaveAttribute('data-selected-mail-id', '');
		expect(screen.getByTestId('mock-reading-pane')).toHaveAttribute('data-mail-id', '');
	});

	it('routes the refresh shortcut through sync intent instead of direct sync commands', async () => {
		render(AppShell);
		await Promise.resolve();
		eventBusEmitAsyncMock.mockClear();

		await fireEvent.keyDown(document.body, { key: 'r' });

		expect(eventBusEmitAsyncMock).toHaveBeenCalledWith('sync:trigger');
		expect(syncAllAccountsMock).not.toHaveBeenCalled();
	});

	it('does not emit sync intent from the refresh shortcut when no accounts are configured', async () => {
		hasAccountsStore.set(false);

		render(AppShell);
		await Promise.resolve();
		eventBusEmitAsyncMock.mockClear();

		await fireEvent.keyDown(document.body, { key: 'r' });

		expect(eventBusEmitAsyncMock).not.toHaveBeenCalled();
		expect(syncAllAccountsMock).not.toHaveBeenCalled();
	});

	it('does not emit compose intent from the compose shortcut when no accounts are configured', async () => {
		hasAccountsStore.set(false);

		render(AppShell);
		await Promise.resolve();
		eventBusEmitMock.mockClear();

		await fireEvent.keyDown(document.body, { key: 'c' });

		expect(eventBusEmitMock).not.toHaveBeenCalled();
	});

	it('routes get-started settings entry to add-account setup when no accounts are configured', async () => {
		hasAccountsStore.set(false);

		render(AppShell);

		await fireEvent.click(screen.getByRole('button', { name: 'mock-get-started-open-settings' }));

		expect(gotoMock).toHaveBeenCalledWith('/settings/accounts/new');
	});

	it('routes shell settings entry to the settings screen when accounts are configured', async () => {
		render(AppShell);

		await fireEvent.click(screen.getByRole('button', { name: 'mock-sidebar-open-settings' }));

		expect(gotoMock).toHaveBeenCalledWith('/settings');
	});
});
