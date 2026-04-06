import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { writable } from 'svelte/store';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mail } from '$lib/types.js';
import { createMailboxStore } from '$lib/mailbox/mailboxStore.js';
import AppShell from './AppShell.svelte';

type ReadableStoreLike<T> = {
	subscribe: (callback: (nextValue: T) => void) => () => void;
};

type MailStoreBridge = {
	displayedEmailsSource: ReadableStoreLike<Mail[]>;
	selectedAccountIdSource: ReadableStoreLike<string | null>;
	loadMails: (...args: any[]) => unknown;
	switchFolder: (...args: any[]) => unknown;
	setSelectedAccount: (...args: any[]) => unknown;
	markMailReadLocally: (...args: any[]) => unknown;
	markMailUnreadLocally: (...args: any[]) => unknown;
	initMailStore: (...args: any[]) => unknown;
};

const {
	layoutState,
	hasAccountsStore,
	activeAccountStore,
	isSyncingStore,
	preferencesStore,
	currentMailStore,
	displayedEmailsBridge,
	selectedAccountIdBridge,
	internalHandlers,
	tauriHandlers,
	fakeEventBus
} = vi.hoisted(() => {
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

	const layoutState = { isMobile: false };
	const hasAccountsStore = createMockStore(true);
	const activeAccountStore = createMockStore<{
		id: string;
		name: string;
		email: string;
		is_active: boolean;
	} | null>({
		id: 'acc-1',
		name: 'Primary',
		email: 'primary@example.com',
		is_active: true
	});
	const isSyncingStore = createMockStore(false);
	const preferencesStore = createMockStore({
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
	});
	const currentMailStore: MailStoreBridge = {
		displayedEmailsSource: createMockStore<Mail[]>([]),
		selectedAccountIdSource: createMockStore<string | null>(null),
		loadMails: vi.fn(),
		switchFolder: vi.fn(),
		setSelectedAccount: vi.fn(),
		markMailReadLocally: vi.fn(),
		markMailUnreadLocally: vi.fn(),
		initMailStore: vi.fn()
	};
	const displayedEmailsBridge = {
		subscribe(callback: (value: Mail[]) => void) {
			return currentMailStore.displayedEmailsSource.subscribe(callback);
		}
	};
	const selectedAccountIdBridge = {
		subscribe(callback: (value: string | null) => void) {
			return currentMailStore.selectedAccountIdSource.subscribe(callback);
		}
	};
	const internalHandlers = new Map<string, Set<(payload?: unknown) => void | Promise<void>>>();
	const tauriHandlers = new Map<string, Set<(payload?: unknown) => void | Promise<void>>>();
	const fakeEventBus = {
		on: vi.fn((event: string, callback: (payload?: unknown) => void | Promise<void>) => {
			if (!internalHandlers.has(event)) {
				internalHandlers.set(event, new Set());
			}
			internalHandlers.get(event)!.add(callback);
		}),
		off: vi.fn((event: string, callback: (payload?: unknown) => void | Promise<void>) => {
			internalHandlers.get(event)?.delete(callback);
		}),
		onTauri: vi.fn((event: string, callback: (payload?: unknown) => void | Promise<void>) => {
			if (!tauriHandlers.has(event)) {
				tauriHandlers.set(event, new Set());
			}
			tauriHandlers.get(event)!.add(callback);
			return Promise.resolve();
		}),
		emit: vi.fn(),
		emitAsync: vi.fn().mockResolvedValue(undefined),
		emitTauri: async (event: string, payload?: unknown) => {
			for (const callback of tauriHandlers.get(event) ?? []) {
				await callback(payload);
			}
		}
	};

	return {
		layoutState,
		hasAccountsStore,
		activeAccountStore,
		isSyncingStore,
		preferencesStore,
		currentMailStore,
		displayedEmailsBridge,
		selectedAccountIdBridge,
		internalHandlers,
		tauriHandlers,
		fakeEventBus
	};
});

function createMail(id: string, accountId: string): Mail {
	return {
		id,
		account_id: accountId,
		folder: 'inbox',
		is_read: false,
		unread: true,
		subject: `Mail ${id}`,
		body: 'Body',
		html_body: '<p>Body</p>',
		from_name: 'Sender',
		from_email: 'sender@example.com',
		preview: 'Preview',
		timestamp: 1
	};
}

function createMailboxDb(initialData?: {
	aggregate?: Mail[];
	'acc-1'?: Mail[];
	'acc-2'?: Mail[];
}) {
	const mailboxData: Record<'aggregate' | 'acc-1' | 'acc-2', Mail[]> = {
		aggregate: initialData?.aggregate ?? [createMail('mail-1', 'acc-2'), createMail('mail-2', 'acc-1')],
		'acc-1': initialData?.['acc-1'] ?? [createMail('mail-2', 'acc-1')],
		'acc-2': initialData?.['acc-2'] ?? [createMail('mail-1', 'acc-2')]
	};

	const getMails = vi.fn(async (_folder: string, accountId: string | null) =>
		accountId ? [...mailboxData[accountId as 'acc-1' | 'acc-2']] : [...mailboxData.aggregate]
	);
	const getMailsCount = vi.fn(async (_folder: string, accountId: string | null) =>
		accountId ? mailboxData[accountId as 'acc-1' | 'acc-2'].length : mailboxData.aggregate.length
	);

	return {
		db: {
			getMails,
			getMailsCount,
			markMailRead: vi.fn().mockResolvedValue(undefined)
		},
		setMailboxData(nextData: Partial<Record<'aggregate' | 'acc-1' | 'acc-2', Mail[]>>) {
			for (const [key, value] of Object.entries(nextData)) {
				if (value) {
					mailboxData[key as 'aggregate' | 'acc-1' | 'acc-2'] = value;
				}
			}
		},
		getMails,
		getMailsCount
	};
}

function connectMailStoreBridge(mailboxStore: ReturnType<typeof createMailboxStore>) {
	currentMailStore.displayedEmailsSource = mailboxStore.displayedEmails;
	currentMailStore.selectedAccountIdSource = mailboxStore.selectedAccountId;
	currentMailStore.loadMails = mailboxStore.loadMails;
	currentMailStore.switchFolder = mailboxStore.switchFolder;
	currentMailStore.setSelectedAccount = mailboxStore.setSelectedAccount;
	currentMailStore.markMailReadLocally = mailboxStore.markMailReadLocally;
	currentMailStore.markMailUnreadLocally = mailboxStore.markMailUnreadLocally;
}

vi.mock('./Sidebar.svelte', async () => {
	const { default: Mock } = await import('$lib/test/EmptyComponentMock.svelte');
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
	const { default: Mock } = await import('$lib/test/AppShellGetStartedMock.svelte');
	return { GetStarted: Mock };
});

vi.mock('./appShellLayout.js', () => ({
	createAppShellLayoutController: ({ setIsMobile }: { setIsMobile: (value: boolean) => void }) => ({
		initialize() {
			setIsMobile(layoutState.isMobile);
			return () => {};
		},
		toggleSidebar: vi.fn(),
		resizeMailList: vi.fn(),
		finishResize: vi.fn()
	})
}));

vi.mock('./appShellRuntime.js', () => ({
	initAppShellRuntime: vi.fn()
}));

vi.mock('$lib/sync/autoSyncLifecycle.js', () => ({
	bindAutoSyncLifecycle: vi.fn(() => () => {})
}));

vi.mock('$lib/stores/accountStore.js', () => ({
	hasAccounts: hasAccountsStore,
	activeAccount: activeAccountStore,
	accounts: {
		subscribe(callback: (value: { id: string; is_active: boolean }[]) => void) {
			callback([
				{ id: 'acc-1', is_active: true },
				{ id: 'acc-2', is_active: false }
			]);
			return () => {};
		}
	}
}));

vi.mock('$lib/stores/syncStore.js', () => ({
	isSyncing: isSyncingStore
}));

vi.mock('$lib/stores/unreadStore.js', () => ({
	initUnreadStore: vi.fn()
}));

vi.mock('$lib/stores/preferencesStore.js', () => ({
	preferences: preferencesStore
}));

vi.mock('$lib/stores/mailStore.js', () => ({
	initMailStore: () => currentMailStore.initMailStore(),
	switchFolder: (folder: string) => currentMailStore.switchFolder(folder),
	setSelectedAccount: (accountId: string | null) => currentMailStore.setSelectedAccount(accountId),
	markMailReadLocally: (mail: Mail) => currentMailStore.markMailReadLocally(mail),
	markMailUnreadLocally: (mail: Mail) => currentMailStore.markMailUnreadLocally(mail),
	displayedEmails: displayedEmailsBridge,
	selectedAccountId: selectedAccountIdBridge,
	loadMails: (folder?: string) => currentMailStore.loadMails(folder)
}));

vi.mock('$lib/events/index.js', () => ({
	initSyncHandlers: vi.fn(),
	initSyncOrchestrator: vi.fn(),
	eventBus: fakeEventBus
}));

vi.mock('$app/navigation', () => ({
	goto: vi.fn()
}));

vi.mock('$app/environment', () => ({
	browser: false
}));

vi.mock('$lib/db/index.js', () => ({
	getMails: vi.fn(),
	getMailsCount: vi.fn(),
	markMailRead: vi.fn(),
	moveToTrash: vi.fn(),
	updateMail: vi.fn(),
	moveToArchive: vi.fn()
}));

describe('AppShell account workflow', () => {
	beforeEach(() => {
		layoutState.isMobile = false;
		hasAccountsStore.set(true);
		activeAccountStore.set({
			id: 'acc-1',
			name: 'Primary',
			email: 'primary@example.com',
			is_active: true
		});
		isSyncingStore.set(false);
		internalHandlers.clear();
		tauriHandlers.clear();
		fakeEventBus.on.mockClear();
		fakeEventBus.off.mockClear();
		fakeEventBus.onTauri.mockClear();
		fakeEventBus.emit.mockClear();
		fakeEventBus.emitAsync.mockClear();
		currentMailStore.displayedEmailsSource = {
			subscribe(callback: (value: Mail[]) => void) {
				callback([]);
				return () => {};
			}
		};
		currentMailStore.selectedAccountIdSource = {
			subscribe(callback: (value: string | null) => void) {
				callback(null);
				return () => {};
			}
		};
		currentMailStore.loadMails = vi.fn();
		currentMailStore.switchFolder = vi.fn();
		currentMailStore.setSelectedAccount = vi.fn();
		currentMailStore.markMailReadLocally = vi.fn();
		currentMailStore.markMailUnreadLocally = vi.fn();
		currentMailStore.initMailStore = vi.fn();
	});

	it('clears the desktop reading selection when the selected mailbox account is deleted', async () => {
		const accountsStore = writable([
			{ id: 'acc-1', is_active: true },
			{ id: 'acc-2', is_active: false }
		]);
		const { db } = createMailboxDb();
		const mailboxStore = createMailboxStore({
			db,
			accountsStore,
			eventBus: fakeEventBus
		});

		connectMailStoreBridge(mailboxStore);
		mailboxStore.init();
		await mailboxStore.selectAccount('acc-2');

		render(AppShell);

		await fireEvent.click(screen.getByRole('button', { name: 'mock-select-mail' }));

		await waitFor(() => {
			expect(screen.getByTestId('mock-reading-pane')).toHaveAttribute('data-mail-id', 'mail-1');
		});

		await fakeEventBus.emitTauri('account:deleted', { id: 'acc-2' });

		await waitFor(() => {
			expect(screen.getByTestId('mock-mail-list')).toHaveAttribute('data-selected-mail-id', '');
		});
		await waitFor(() => {
			expect(screen.getByTestId('mock-reading-pane')).toHaveAttribute('data-mail-id', '');
		});
	});

	it('returns mobile reading view to the list when the selected mailbox account is deleted', async () => {
		layoutState.isMobile = true;
		const accountsStore = writable([
			{ id: 'acc-1', is_active: true },
			{ id: 'acc-2', is_active: false }
		]);
		const { db } = createMailboxDb();
		const mailboxStore = createMailboxStore({
			db,
			accountsStore,
			eventBus: fakeEventBus
		});

		connectMailStoreBridge(mailboxStore);
		mailboxStore.init();
		await mailboxStore.selectAccount('acc-2');

		render(AppShell);

		await fireEvent.click(screen.getByRole('button', { name: 'mock-select-mail' }));

		await waitFor(() => {
			expect(screen.getByTestId('mock-reading-pane')).toHaveAttribute('data-mail-id', 'mail-1');
		});

		await fakeEventBus.emitTauri('account:deleted', { id: 'acc-2' });

		await waitFor(() => {
			expect(screen.getByTestId('mock-mail-list')).toBeTruthy();
		});
	});

	it('leaves get-started and shows the mailbox after an account is created', async () => {
		hasAccountsStore.set(false);
		activeAccountStore.set(null);
		const accountsStore = writable<{ id: string; is_active: boolean }[]>([]);
		const { db, setMailboxData, getMails } = createMailboxDb({
			aggregate: [],
			'acc-1': [],
			'acc-2': []
		});
		const mailboxStore = createMailboxStore({
			db,
			accountsStore,
			eventBus: fakeEventBus
		});

		connectMailStoreBridge(mailboxStore);
		mailboxStore.init();

		render(AppShell);

		expect(screen.getByRole('button', { name: 'mock-get-started-open-settings' })).toBeTruthy();

		accountsStore.set([{ id: 'acc-1', is_active: true }]);
		hasAccountsStore.set(true);
		activeAccountStore.set({
			id: 'acc-1',
			name: 'Primary',
			email: 'primary@example.com',
			is_active: true
		});
		setMailboxData({
			aggregate: [createMail('mail-2', 'acc-1')],
			'acc-1': [createMail('mail-2', 'acc-1')]
		});

		await fakeEventBus.emitTauri('account:created');

		await waitFor(() => {
			expect(getMails).toHaveBeenCalledWith('inbox', null, 50, 0);
		});
		await waitFor(() => {
			expect(screen.getByTestId('mock-mail-list')).toBeTruthy();
		});
	});

	it('returns to get-started without reloading the deleted last account from a non-inbox mailbox context', async () => {
		const accountsStore = writable([{ id: 'acc-1', is_active: true }]);
		const { db, getMails } = createMailboxDb({
			aggregate: [createMail('mail-1', 'acc-1')],
			'acc-1': [createMail('mail-1', 'acc-1')],
			'acc-2': []
		});
		const mailboxStore = createMailboxStore({
			db,
			accountsStore,
			eventBus: fakeEventBus
		});

		connectMailStoreBridge(mailboxStore);
		mailboxStore.init();
		await mailboxStore.switchFolder('sent');
		getMails.mockClear();

		render(AppShell);

		await fakeEventBus.emitTauri('account:deleted', { id: 'acc-1' });
		accountsStore.set([]);
		hasAccountsStore.set(false);
		activeAccountStore.set(null);

		await waitFor(() => {
			expect(getMails).toHaveBeenCalledWith('sent', null, 50, 0);
		});
		expect(getMails).not.toHaveBeenCalledWith('sent', 'acc-1', 50, 0);
		await waitFor(() => {
			expect(screen.getByRole('button', { name: 'mock-get-started-open-settings' })).toBeTruthy();
		});
	});
});
