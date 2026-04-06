import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AppShell from './AppShell.svelte';

const {
	hasAccountsStore,
	activeAccountStore,
	isSyncingStore,
	preferencesStore,
	displayedEmailsStore,
	selectedAccountIdStore,
	loadMailsMock,
	moveToTrashMock
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
	displayedEmailsStore: createMockStore(createMails()),
	selectedAccountIdStore: createMockStore<string | null>(null),
	loadMailsMock: vi.fn().mockImplementation(async () => {
		displayedEmailsStore.set([createMails()[1]]);
	}),
	moveToTrashMock: vi.fn().mockResolvedValue(undefined)
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

function createMails() {
	return [
		{
			id: 'mail-1',
			account_id: 'acc-1',
			folder: 'inbox',
			is_read: false,
			unread: true,
			subject: 'First mail',
			body: 'Body 1',
			html_body: '<p>Body 1</p>',
			from_name: 'Sender One',
			from_email: 'one@example.com',
			preview: 'Preview 1',
			timestamp: 1
		},
		{
			id: 'mail-2',
			account_id: 'acc-1',
			folder: 'inbox',
			is_read: true,
			unread: false,
			subject: 'Second mail',
			body: 'Body 2',
			html_body: '<p>Body 2</p>',
			from_name: 'Sender Two',
			from_email: 'two@example.com',
			preview: 'Preview 2',
			timestamp: 2
		}
	];
}

vi.mock('./Sidebar.svelte', async () => {
	const { default: Mock } = await import('$lib/test/EmptyComponentMock.svelte');
	return { default: Mock };
});

vi.mock('./MailList.svelte', async () => {
	const { default: Mock } = await import('$lib/test/AppShellSelectionMailListMock.svelte');
	return { default: Mock };
});

vi.mock('./Resizer.svelte', async () => {
	const { default: Mock } = await import('$lib/test/EmptyComponentMock.svelte');
	return { default: Mock };
});

vi.mock('./ReadingPane.svelte', async () => {
	const { default: Mock } = await import('$lib/test/AppShellSelectionReadingPaneMock.svelte');
	return { default: Mock };
});

vi.mock('$lib/components/get-started/index.js', async () => {
	const { default: Mock } = await import('$lib/test/EmptyComponentMock.svelte');
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
	switchFolder: vi.fn(),
	setSelectedAccount: vi.fn(),
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
		emit: vi.fn(),
		emitAsync: vi.fn().mockResolvedValue(undefined)
	}
}));

vi.mock('$app/navigation', () => ({
	goto: vi.fn()
}));

vi.mock('$app/environment', () => ({
	browser: false
}));

vi.mock('$lib/db/index.js', () => ({
	moveToTrash: moveToTrashMock,
	updateMail: vi.fn(),
	moveToArchive: vi.fn()
}));

describe('AppShell selection workflow', () => {
	beforeEach(() => {
		hasAccountsStore.set(true);
		activeAccountStore.set({
			id: 'acc-1',
			name: 'Primary',
			email: 'primary@example.com',
			is_active: true
		});
		isSyncingStore.set(false);
		displayedEmailsStore.set(createMails());
		selectedAccountIdStore.set(null);
		loadMailsMock.mockClear();
		loadMailsMock.mockImplementation(async () => {
			displayedEmailsStore.set([createMails()[1]]);
		});
		moveToTrashMock.mockClear();
	});

	it('moves desktop reading selection to the next visible mail after deleting the selected mail from the list', async () => {
		render(AppShell);

		await fireEvent.click(screen.getByRole('button', { name: 'mock-select-mail-1' }));

		await waitFor(() => {
			expect(screen.getByTestId('mock-reading-pane')).toHaveAttribute('data-mail-id', 'mail-1');
		});

		await fireEvent.click(screen.getByRole('button', { name: 'mock-delete-mail-1' }));

		await waitFor(() => {
			expect(moveToTrashMock).toHaveBeenCalledWith('mail-1', 'inbox');
		});
		await waitFor(() => {
			expect(loadMailsMock).toHaveBeenCalledTimes(1);
		});
		await waitFor(() => {
			expect(screen.getByTestId('mock-reading-pane')).toHaveAttribute('data-mail-id', 'mail-2');
		});
	});

	it('moves desktop reading selection to the next visible mail after deleting from the reading pane', async () => {
		render(AppShell);

		await fireEvent.click(screen.getByRole('button', { name: 'mock-select-mail-1' }));

		await waitFor(() => {
			expect(screen.getByTestId('mock-reading-pane')).toHaveAttribute('data-mail-id', 'mail-1');
		});

		await fireEvent.click(screen.getByRole('button', { name: 'mock-reading-pane-delete' }));

		await waitFor(() => {
			expect(loadMailsMock).toHaveBeenCalledTimes(1);
		});
		await waitFor(() => {
			expect(screen.getByTestId('mock-reading-pane')).toHaveAttribute('data-mail-id', 'mail-2');
		});
	});

	it('moves desktop reading selection to the next visible mail after archiving from the reading pane', async () => {
		render(AppShell);

		await fireEvent.click(screen.getByRole('button', { name: 'mock-select-mail-1' }));

		await waitFor(() => {
			expect(screen.getByTestId('mock-reading-pane')).toHaveAttribute('data-mail-id', 'mail-1');
		});

		await fireEvent.click(screen.getByRole('button', { name: 'mock-reading-pane-archive' }));

		await waitFor(() => {
			expect(loadMailsMock).toHaveBeenCalledTimes(1);
		});
		await waitFor(() => {
			expect(screen.getByTestId('mock-reading-pane')).toHaveAttribute('data-mail-id', 'mail-2');
		});
	});

	it('falls back to the previous visible mail after removing the last visible selected mail', async () => {
		displayedEmailsStore.set([createMails()[1], createMails()[0]]);
		loadMailsMock.mockImplementation(async () => {
			displayedEmailsStore.set([createMails()[1]]);
		});

		render(AppShell);

		await fireEvent.click(screen.getByRole('button', { name: 'mock-select-mail-1' }));

		await waitFor(() => {
			expect(screen.getByTestId('mock-reading-pane')).toHaveAttribute('data-mail-id', 'mail-1');
		});

		await fireEvent.click(screen.getByRole('button', { name: 'mock-reading-pane-delete' }));

		await waitFor(() => {
			expect(loadMailsMock).toHaveBeenCalledTimes(1);
		});
		await waitFor(() => {
			expect(screen.getByTestId('mock-reading-pane')).toHaveAttribute('data-mail-id', 'mail-2');
		});
	});

	it('keeps desktop reading continuity when an external mailbox update removes the selected mail', async () => {
		render(AppShell);

		await fireEvent.click(screen.getByRole('button', { name: 'mock-select-mail-1' }));

		await waitFor(() => {
			expect(screen.getByTestId('mock-reading-pane')).toHaveAttribute('data-mail-id', 'mail-1');
		});

		displayedEmailsStore.set([createMails()[1]]);

		await waitFor(() => {
			expect(screen.getByTestId('mock-reading-pane')).toHaveAttribute('data-mail-id', 'mail-2');
		});
	});
});
