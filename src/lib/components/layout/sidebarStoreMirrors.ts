import type { UserPreferences } from '$lib/stores/preferencesStore.js';
import type { Account, Folder } from '$lib/types.js';

type ReadableStore<T> = {
	subscribe: (run: (value: T) => void) => () => void;
};

type SidebarStoreMirrorsDeps = {
	activeAccountStore: ReadableStore<Account | null>;
	hasAccountsStore: ReadableStore<boolean>;
	isSyncingStore: ReadableStore<boolean>;
	lastSyncStore: ReadableStore<number | null>;
	unreadCountsStore: ReadableStore<Record<Folder, number>>;
	accountsStore: ReadableStore<Account[]>;
	selectedAccountIdStore: ReadableStore<string | null>;
	syncingAccountIdStore: ReadableStore<string | null>;
	preferencesStore: ReadableStore<UserPreferences>;
	setCurrentAccount: (value: Account | null) => void;
	setIsAccountConfigured: (value: boolean) => void;
	setIsRefreshing: (value: boolean) => void;
	setLastSync: (value: number | null) => void;
	setUnreadCounts: (value: Record<Folder, number>) => void;
	setAllAccounts: (value: Account[]) => void;
	setSelectedAccountId: (value: string | null) => void;
	setCurrentSyncAccountId: (value: string | null) => void;
	setShowShortcutHints: (value: boolean) => void;
};

export function bindSidebarStoreMirrors({
	activeAccountStore,
	hasAccountsStore,
	isSyncingStore,
	lastSyncStore,
	unreadCountsStore,
	accountsStore,
	selectedAccountIdStore,
	syncingAccountIdStore,
	preferencesStore,
	setCurrentAccount,
	setIsAccountConfigured,
	setIsRefreshing,
	setLastSync,
	setUnreadCounts,
	setAllAccounts,
	setSelectedAccountId,
	setCurrentSyncAccountId,
	setShowShortcutHints
}: SidebarStoreMirrorsDeps): () => void {
	const unsubscribers = [
		activeAccountStore.subscribe((value) => {
			setCurrentAccount(value);
		}),
		hasAccountsStore.subscribe((value) => {
			setIsAccountConfigured(value);
		}),
		isSyncingStore.subscribe((value) => {
			setIsRefreshing(value);
		}),
		lastSyncStore.subscribe((value) => {
			setLastSync(value);
		}),
		unreadCountsStore.subscribe((value) => {
			setUnreadCounts(value);
		}),
		accountsStore.subscribe((value) => {
			setAllAccounts(value);
		}),
		selectedAccountIdStore.subscribe((value) => {
			setSelectedAccountId(value);
		}),
		syncingAccountIdStore.subscribe((value) => {
			setCurrentSyncAccountId(value);
		}),
		preferencesStore.subscribe((value) => {
			setShowShortcutHints(value.keyboard.showShortcutHints);
		})
	];

	return () => {
		for (const unsubscribe of unsubscribers) {
			unsubscribe();
		}
	};
}
