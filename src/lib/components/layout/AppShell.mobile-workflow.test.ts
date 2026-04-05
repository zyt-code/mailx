import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AppShell from './AppShell.svelte';

const {
	hasAccountsStore,
	activeAccountStore,
	isSyncingStore,
	preferencesStore,
	displayedEmailsStore,
	switchFolderMock,
	setSelectedAccountMock,
	eventBusEmitMock,
	eventBusEmitAsyncMock
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
	displayedEmailsStore: createMockStore([
		{
			id: 'mail-1',
			account_id: 'acc-1',
			folder: 'inbox',
			is_read: false,
			unread: true,
			subject: 'Hello',
			body: 'Body',
			html_body: '<p>Body</p>'
		}
	]),
	switchFolderMock: vi.fn(),
	setSelectedAccountMock: vi.fn(),
	eventBusEmitMock: vi.fn(),
	eventBusEmitAsyncMock: vi.fn().mockResolvedValue(undefined)
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

vi.mock('./Sidebar.svelte', async () => {
	const { default: Mock } = await import('$lib/test/AppShellSidebarMock.svelte');
	return { default: Mock };
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
	const { default: Mock } = await import('$lib/test/EmptyComponentMock.svelte');
	return { GetStarted: Mock };
});

vi.mock('./appShellLayout.js', () => ({
	createAppShellLayoutController: ({ setIsMobile }: { setIsMobile: (value: boolean) => void }) => ({
		initialize() {
			setIsMobile(true);
			return () => {};
		},
		toggleSidebar: vi.fn(),
		resizeMailList: vi.fn(),
		finishResize: vi.fn()
	})
}));

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
	setSelectedAccount: setSelectedAccountMock,
	markMailReadLocally: vi.fn(),
	markMailUnreadLocally: vi.fn(),
	displayedEmails: displayedEmailsStore,
	loadMails: vi.fn()
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

vi.mock('$app/navigation', () => ({
	goto: vi.fn()
}));

vi.mock('$app/environment', () => ({
	browser: false
}));

vi.mock('$lib/db/index.js', () => ({
	moveToTrash: vi.fn(),
	updateMail: vi.fn(),
	moveToArchive: vi.fn()
}));

describe('AppShell mobile workflow', () => {
	beforeEach(() => {
		hasAccountsStore.set(true);
		activeAccountStore.set({
			id: 'acc-1',
			name: 'Primary',
			email: 'primary@example.com',
			is_active: true
		});
		isSyncingStore.set(false);
		displayedEmailsStore.set([
			{
				id: 'mail-1',
				account_id: 'acc-1',
				folder: 'inbox',
				is_read: false,
				unread: true,
				subject: 'Hello',
				body: 'Body',
				html_body: '<p>Body</p>'
			}
		]);
		switchFolderMock.mockReset();
		setSelectedAccountMock.mockReset();
		eventBusEmitMock.mockReset();
		eventBusEmitAsyncMock.mockReset();
		eventBusEmitAsyncMock.mockResolvedValue(undefined);
	});

	it('opens the reading view for a selected mail and returns to the list on back', async () => {
		render(AppShell);

		await fireEvent.click(screen.getByRole('button', { name: 'mock-select-mail' }));

		await waitFor(() => {
			expect(screen.getByTestId('mock-reading-pane')).toBeTruthy();
		});

		await fireEvent.click(screen.getByRole('button', { name: 'mock-back-to-list' }));

		await waitFor(() => {
			expect(screen.getByTestId('mock-mail-list')).toBeTruthy();
		});
	});

	it('returns to the list when the selected mail disappears from the current mobile mailbox', async () => {
		render(AppShell);

		await fireEvent.click(screen.getByRole('button', { name: 'mock-select-mail' }));

		await waitFor(() => {
			expect(screen.getByTestId('mock-reading-pane')).toBeTruthy();
		});

		displayedEmailsStore.set([]);

		await waitFor(() => {
			expect(screen.getByTestId('mock-mail-list')).toBeTruthy();
		});
	});

	it('returns to the list and switches folders when mobile navigation changes while reading', async () => {
		render(AppShell);

		await fireEvent.click(screen.getByRole('button', { name: 'mock-select-mail' }));

		await waitFor(() => {
			expect(screen.getByTestId('mock-reading-pane')).toBeTruthy();
		});

		await fireEvent.click(screen.getByRole('button', { name: 'mock-select-folder' }));

		await waitFor(() => {
			expect(screen.getByTestId('mock-mail-list')).toBeTruthy();
		});

		expect(switchFolderMock).toHaveBeenCalledWith('sent');
	});

	it('returns to the inbox list when the account changes while mobile reading is open', async () => {
		render(AppShell);

		await fireEvent.click(screen.getByRole('button', { name: 'mock-select-mail' }));

		await waitFor(() => {
			expect(screen.getByTestId('mock-reading-pane')).toBeTruthy();
		});

		await fireEvent.click(screen.getByRole('button', { name: 'mock-select-account' }));

		await waitFor(() => {
			expect(screen.getByTestId('mock-mail-list')).toBeTruthy();
		});

		expect(setSelectedAccountMock).toHaveBeenCalledWith('acc-1');
		expect(switchFolderMock).toHaveBeenCalledWith('inbox');
	});
});
