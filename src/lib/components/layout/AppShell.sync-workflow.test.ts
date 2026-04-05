import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { writable } from 'svelte/store';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mail } from '$lib/types.js';
import { createMailboxStore } from '$lib/mailbox/mailboxStore.js';
import { initSyncOrchestrator } from '$lib/sync/syncOrchestrator.js';
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

	const hasAccountsStore = createMockStore(true);
	const activeAccountStore = createMockStore({
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
		emit: vi.fn((event: string, payload?: unknown) => {
			internalHandlers.get(event)?.forEach((callback) => {
				void callback(payload);
			});
		}),
		emitAsync: vi.fn(async (event: string, payload?: unknown) => {
			for (const callback of internalHandlers.get(event) ?? []) {
				await callback(payload);
			}
		}),
		emitTauri: async (event: string, payload?: unknown) => {
			for (const callback of tauriHandlers.get(event) ?? []) {
				await callback(payload);
			}
		}
	};

	return {
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

function createSyncOrchestratorEventBus() {
	return {
		on: fakeEventBus.on as (
			event: string,
			callback: (payload?: { accountId?: string }) => void | Promise<void>
		) => void
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
	const { default: Mock } = await import('$lib/test/EmptyComponentMock.svelte');
	return { default: Mock };
});

vi.mock('./Resizer.svelte', async () => {
	const { default: Mock } = await import('$lib/test/EmptyComponentMock.svelte');
	return { default: Mock };
});

vi.mock('./ReadingPane.svelte', async () => {
	const { default: Mock } = await import('$lib/test/EmptyComponentMock.svelte');
	return { default: Mock };
});

vi.mock('$lib/components/get-started/index.js', async () => {
	const { default: Mock } = await import('$lib/test/EmptyComponentMock.svelte');
	return { GetStarted: Mock };
});

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
			callback([{ id: 'acc-1', is_active: true }]);
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

describe('AppShell sync workflow', () => {
	beforeEach(() => {
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

	it('routes the keyboard refresh shortcut through sync orchestration and reloads the aggregate inbox on mails:updated', async () => {
		const getMails = vi.fn().mockResolvedValue([]);
		const getMailsCount = vi.fn().mockResolvedValue(0);
		const markMailRead = vi.fn().mockResolvedValue(undefined);
		const syncAccount = vi.fn(async () => {
			await fakeEventBus.emitTauri('mails:updated');
		});
		const syncAllAccounts = vi.fn().mockResolvedValue(undefined);
		const accountsStore = writable([{ id: 'acc-1', is_active: true }]);
		const mailboxStore = createMailboxStore({
			db: { getMails, getMailsCount, markMailRead },
			accountsStore,
			eventBus: fakeEventBus
		});

		connectMailStoreBridge(mailboxStore);
		mailboxStore.init();
		await waitFor(() => {
			expect(getMails).toHaveBeenCalledWith('inbox', null, 50, 0);
		});
		getMails.mockClear();
		getMailsCount.mockClear();

		initSyncOrchestrator({
			eventBus: createSyncOrchestratorEventBus(),
			syncAccount,
			syncAllAccounts,
			getActiveAccount: () => ({ id: 'acc-1' })
		});

		render(AppShell);
		await Promise.resolve();

		await fireEvent.keyDown(document.body, { key: 'r' });

		await waitFor(() => {
			expect(syncAccount).toHaveBeenCalledWith('acc-1');
		});
		await waitFor(() => {
			expect(getMails).toHaveBeenCalledWith('inbox', null, 50, 0);
		});
		expect(syncAllAccounts).not.toHaveBeenCalled();
	});

	it('keeps the explicit mailbox account scope when the keyboard refresh shortcut triggers sync orchestration', async () => {
		const getMails = vi.fn().mockResolvedValue([]);
		const getMailsCount = vi.fn().mockResolvedValue(0);
		const markMailRead = vi.fn().mockResolvedValue(undefined);
		const syncAccount = vi.fn(async () => {
			await fakeEventBus.emitTauri('mails:updated');
		});
		const syncAllAccounts = vi.fn().mockResolvedValue(undefined);
		const accountsStore = writable([
			{ id: 'acc-1', is_active: true },
			{ id: 'acc-2', is_active: false }
		]);
		const mailboxStore = createMailboxStore({
			db: { getMails, getMailsCount, markMailRead },
			accountsStore,
			eventBus: fakeEventBus
		});

		connectMailStoreBridge(mailboxStore);
		mailboxStore.init();
		await waitFor(() => {
			expect(getMails).toHaveBeenCalledWith('inbox', null, 50, 0);
		});
		await mailboxStore.selectAccount('acc-2');
		getMails.mockClear();
		getMailsCount.mockClear();

		initSyncOrchestrator({
			eventBus: createSyncOrchestratorEventBus(),
			syncAccount,
			syncAllAccounts,
			getActiveAccount: () => ({ id: 'acc-1' })
		});

		render(AppShell);
		await Promise.resolve();

		await fireEvent.keyDown(document.body, { key: 'r' });

		await waitFor(() => {
			expect(syncAccount).toHaveBeenCalledWith('acc-2');
		});
		await waitFor(() => {
			expect(getMails).toHaveBeenCalledWith('inbox', 'acc-2', 50, 0);
		});
		expect(syncAllAccounts).not.toHaveBeenCalled();
	});
});
