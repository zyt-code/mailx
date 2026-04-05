import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { writable } from 'svelte/store';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { i18nStore } from '$lib/stores/i18nStore.svelte';
import { createMailboxStore } from '$lib/mailbox/mailboxStore.js';
import { initSyncOrchestrator } from '$lib/sync/syncOrchestrator.js';
import Sidebar from './Sidebar.svelte';

const {
	selectedAccountIdStore,
	mockState,
	internalHandlers,
	tauriHandlers,
	fakeEventBus
} = vi.hoisted(() => ({
	selectedAccountIdStore: createMockStore<string | null>(null),
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
	},
	internalHandlers: new Map<string, Set<(payload?: unknown) => void | Promise<void>>>(),
	tauriHandlers: new Map<string, Set<(payload?: unknown) => void | Promise<void>>>(),
	fakeEventBus: {
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
	}
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

function createSyncOrchestratorEventBus() {
	return {
		on: fakeEventBus.on as (
			event: string,
			callback: (payload?: { accountId?: string }) => void | Promise<void>
		) => void
	};
}

vi.mock('$lib/stores/accountStore.js', () => ({
	hasAccounts: {
		subscribe: (callback: (value: boolean) => void) => {
			callback(mockState.hasAccounts);
			return () => {};
		}
	},
	activeAccount: {
		subscribe: (callback: (value: typeof mockState.activeAccount) => void) => {
			callback(mockState.activeAccount);
			return () => {};
		}
	},
	accounts: {
		subscribe: (callback: (value: typeof mockState.accounts) => void) => {
			callback(mockState.accounts);
			return () => {};
		}
	}
}));

vi.mock('$lib/stores/syncStore.js', () => ({
	isSyncing: {
		subscribe: (callback: (value: boolean) => void) => {
			callback(mockState.isSyncing);
			return () => {};
		}
	},
	lastSyncTime: {
		subscribe: (callback: (value: number | null) => void) => {
			callback(mockState.lastSyncTime);
			return () => {};
		}
	},
	syncingAccountId: {
		subscribe: (callback: (value: string | null) => void) => {
			callback(mockState.syncingAccountId);
			return () => {};
		}
	}
}));

vi.mock('$lib/stores/unreadStore.js', () => ({
	folderUnreadCounts: {
		subscribe: (callback: (value: typeof mockState.folderUnreadCounts) => void) => {
			callback(mockState.folderUnreadCounts);
			return () => {};
		}
	}
}));

vi.mock('$lib/stores/mailStore.js', () => ({
	selectedAccountId: selectedAccountIdStore
}));

vi.mock('$lib/stores/preferencesStore.js', () => ({
	preferences: {
		subscribe: (callback: (value: typeof mockState.preferences) => void) => {
			callback(mockState.preferences);
			return () => {};
		},
		updateSection: vi.fn()
	}
}));

vi.mock('$lib/events/index.js', () => ({
	eventBus: fakeEventBus
}));

describe('Sidebar sync workflow', () => {
	beforeEach(async () => {
		await i18nStore.waitForReady();
		selectedAccountIdStore.set(null);
		mockState.hasAccounts = true;
		mockState.activeAccount = {
			id: 'acc-1',
			name: 'Primary',
			email: 'primary@example.com',
			is_active: true
		};
		mockState.accounts = [mockState.activeAccount];
		mockState.isSyncing = false;
		internalHandlers.clear();
		tauriHandlers.clear();
		fakeEventBus.on.mockClear();
		fakeEventBus.off.mockClear();
		fakeEventBus.onTauri.mockClear();
		fakeEventBus.emit.mockClear();
		fakeEventBus.emitAsync.mockClear();
	});

	it('routes refresh intent through sync orchestration and reloads the current mailbox when mails are updated', async () => {
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
			expect(syncAccount).toHaveBeenCalledWith('acc-1');
		});
		await waitFor(() => {
			expect(getMails).toHaveBeenCalledWith('inbox', null, 50, 0);
		});
		expect(syncAllAccounts).not.toHaveBeenCalled();
	});

	it('keeps an explicit mailbox account scope through refresh orchestration and reload', async () => {
		selectedAccountIdStore.set('acc-2');
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

		mailboxStore.init();
		await mailboxStore.selectAccount('acc-2');
		getMails.mockClear();
		getMailsCount.mockClear();

		initSyncOrchestrator({
			eventBus: createSyncOrchestratorEventBus(),
			syncAccount,
			syncAllAccounts,
			getActiveAccount: () => ({ id: 'acc-1' })
		});

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
			expect(syncAccount).toHaveBeenCalledWith('acc-2');
		});
		await waitFor(() => {
			expect(getMails).toHaveBeenCalledWith('inbox', 'acc-2', 50, 0);
		});
		expect(syncAllAccounts).not.toHaveBeenCalled();
	});
});
