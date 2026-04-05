import { writable } from 'svelte/store';
import { describe, expect, it } from 'vitest';
import type { Account, Folder } from '$lib/types.js';
import type { UserPreferences } from '$lib/stores/preferencesStore.js';
import { bindSidebarStoreMirrors } from './sidebarStoreMirrors.js';

function createAccount(id: string, overrides: Partial<Account> = {}): Account {
	return {
		id,
		email: `${id}@example.com`,
		name: `Account ${id}`,
		imap_server: 'imap.example.com',
		imap_port: 993,
		imap_use_ssl: true,
		smtp_server: 'smtp.example.com',
		smtp_port: 465,
		smtp_use_ssl: true,
		is_active: false,
		created_at: 0,
		updated_at: 0,
		...overrides
	};
}

function createPreferences(showShortcutHints: boolean): UserPreferences {
	return {
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
			showShortcutHints,
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
	};
}

function createUnreadCounts(inbox: number): Record<Folder, number> {
	return {
		inbox,
		sent: 0,
		drafts: 0,
		archive: 0,
		trash: 0
	};
}

describe('bindSidebarStoreMirrors', () => {
	it('mirrors the latest sidebar-related store values into local component state', () => {
		const activeAccountStore = writable<Account | null>(createAccount('acc-1'));
		const hasAccountsStore = writable(true);
		const isSyncingStore = writable(false);
		const lastSyncStore = writable<number | null>(1000);
		const unreadCountsStore = writable(createUnreadCounts(3));
		const accountsStore = writable<Account[]>([createAccount('acc-1')]);
		const selectedAccountIdStore = writable<string | null>(null);
		const syncingAccountIdStore = writable<string | null>(null);
		const preferencesStore = writable(createPreferences(true));

		let currentAccount: Account | null = null;
		let isAccountConfigured = false;
		let isRefreshing = true;
		let lastSync: number | null = null;
		let unreadCounts = createUnreadCounts(0);
		let allAccounts: Account[] = [];
		let selectedAccountId: string | null = 'seed';
		let currentSyncAccountId: string | null = 'sync-seed';
		let showShortcutHints = false;

		const cleanup = bindSidebarStoreMirrors({
			activeAccountStore,
			hasAccountsStore,
			isSyncingStore,
			lastSyncStore,
			unreadCountsStore,
			accountsStore,
			selectedAccountIdStore,
			syncingAccountIdStore,
			preferencesStore,
			setCurrentAccount: (value) => {
				currentAccount = value;
			},
			setIsAccountConfigured: (value) => {
				isAccountConfigured = value;
			},
			setIsRefreshing: (value) => {
				isRefreshing = value;
			},
			setLastSync: (value) => {
				lastSync = value;
			},
			setUnreadCounts: (value) => {
				unreadCounts = value;
			},
			setAllAccounts: (value) => {
				allAccounts = value;
			},
			setSelectedAccountId: (value) => {
				selectedAccountId = value;
			},
			setCurrentSyncAccountId: (value) => {
				currentSyncAccountId = value;
			},
			setShowShortcutHints: (value) => {
				showShortcutHints = value;
			}
		});

		expect(currentAccount).toEqual(expect.objectContaining({ id: 'acc-1' }));
		expect(isAccountConfigured).toBe(true);
		expect(isRefreshing).toBe(false);
		expect(lastSync).toBe(1000);
		expect(unreadCounts.inbox).toBe(3);
		expect(allAccounts).toHaveLength(1);
		expect(selectedAccountId).toBeNull();
		expect(currentSyncAccountId).toBeNull();
		expect(showShortcutHints).toBe(true);

		activeAccountStore.set(createAccount('acc-2'));
		hasAccountsStore.set(false);
		isSyncingStore.set(true);
		lastSyncStore.set(2000);
		unreadCountsStore.set(createUnreadCounts(7));
		accountsStore.set([createAccount('acc-1'), createAccount('acc-2')]);
		selectedAccountIdStore.set('acc-2');
		syncingAccountIdStore.set('acc-2');
		preferencesStore.set(createPreferences(false));

		expect(currentAccount).toEqual(expect.objectContaining({ id: 'acc-2' }));
		expect(isAccountConfigured).toBe(false);
		expect(isRefreshing).toBe(true);
		expect(lastSync).toBe(2000);
		expect(unreadCounts.inbox).toBe(7);
		expect(allAccounts).toHaveLength(2);
		expect(selectedAccountId).toBe('acc-2');
		expect(currentSyncAccountId).toBe('acc-2');
		expect(showShortcutHints).toBe(false);

		cleanup();
	});

	it('stops mirroring updates after cleanup', () => {
		const activeAccountStore = writable<Account | null>(createAccount('acc-1'));
		const hasAccountsStore = writable(true);
		const isSyncingStore = writable(false);
		const lastSyncStore = writable<number | null>(1000);
		const unreadCountsStore = writable(createUnreadCounts(1));
		const accountsStore = writable<Account[]>([createAccount('acc-1')]);
		const selectedAccountIdStore = writable<string | null>(null);
		const syncingAccountIdStore = writable<string | null>(null);
		const preferencesStore = writable(createPreferences(true));

		let currentAccount: Account | null = null;
		let isAccountConfigured = false;
		let isRefreshing = true;
		let lastSync: number | null = null;
		let unreadCounts = createUnreadCounts(0);
		let allAccounts: Account[] = [];
		let selectedAccountId: string | null = 'seed';
		let currentSyncAccountId: string | null = 'seed';
		let showShortcutHints = false;

		const cleanup = bindSidebarStoreMirrors({
			activeAccountStore,
			hasAccountsStore,
			isSyncingStore,
			lastSyncStore,
			unreadCountsStore,
			accountsStore,
			selectedAccountIdStore,
			syncingAccountIdStore,
			preferencesStore,
			setCurrentAccount: (value) => {
				currentAccount = value;
			},
			setIsAccountConfigured: (value) => {
				isAccountConfigured = value;
			},
			setIsRefreshing: (value) => {
				isRefreshing = value;
			},
			setLastSync: (value) => {
				lastSync = value;
			},
			setUnreadCounts: (value) => {
				unreadCounts = value;
			},
			setAllAccounts: (value) => {
				allAccounts = value;
			},
			setSelectedAccountId: (value) => {
				selectedAccountId = value;
			},
			setCurrentSyncAccountId: (value) => {
				currentSyncAccountId = value;
			},
			setShowShortcutHints: (value) => {
				showShortcutHints = value;
			}
		});

		cleanup();

		activeAccountStore.set(createAccount('acc-9'));
		hasAccountsStore.set(false);
		isSyncingStore.set(true);
		lastSyncStore.set(9000);
		unreadCountsStore.set(createUnreadCounts(9));
		accountsStore.set([createAccount('acc-1'), createAccount('acc-9')]);
		selectedAccountIdStore.set('acc-9');
		syncingAccountIdStore.set('acc-9');
		preferencesStore.set(createPreferences(false));

		expect(currentAccount).toEqual(expect.objectContaining({ id: 'acc-1' }));
		expect(isAccountConfigured).toBe(true);
		expect(isRefreshing).toBe(false);
		expect(lastSync).toBe(1000);
		expect(unreadCounts.inbox).toBe(1);
		expect(allAccounts).toHaveLength(1);
		expect(selectedAccountId).toBeNull();
		expect(currentSyncAccountId).toBeNull();
		expect(showShortcutHints).toBe(true);
	});
});
