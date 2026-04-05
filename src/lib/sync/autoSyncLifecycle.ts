import { get, type Readable } from 'svelte/store';

type AccountLike = {
	id: string;
};

type SyncTriggerPayload = {
	accountId?: string;
};

type AutoSyncDeps = {
	activeAccountStore: Readable<AccountLike | null>;
	hasAccountsStore: Readable<boolean>;
	isSyncingStore: Readable<boolean>;
	triggerSync: (payload?: SyncTriggerPayload) => Promise<unknown>;
	intervalMs?: number;
};

const DEFAULT_INTERVAL_MS = 15 * 60 * 1000;

export function bindAutoSyncLifecycle({
	activeAccountStore,
	hasAccountsStore,
	isSyncingStore,
	triggerSync,
	intervalMs = DEFAULT_INTERVAL_MS
}: AutoSyncDeps): () => void {
	let currentAccountId: string | null = null;
	let hasAccounts = get(hasAccountsStore);
	let isSyncing = get(isSyncingStore);
	let syncIntervalId: ReturnType<typeof setInterval> | null = null;
	let destroyed = false;

	function clearSyncInterval(): void {
		if (syncIntervalId) {
			clearInterval(syncIntervalId);
			syncIntervalId = null;
		}
	}

	const unsubscribeHasAccounts = hasAccountsStore.subscribe((value) => {
		hasAccounts = value;
	});

	const unsubscribeIsSyncing = isSyncingStore.subscribe((value) => {
		isSyncing = value;
	});

	const unsubscribeActiveAccount = activeAccountStore.subscribe(async (account) => {
		if (destroyed) {
			return;
		}

		if (!account || account.id === currentAccountId) {
			return;
		}

		currentAccountId = account.id;

		if (!hasAccounts || isSyncing) {
			return;
		}

		try {
			await triggerSync({ accountId: account.id });
		} catch (error) {
			console.error('[autoSyncLifecycle] Initial account sync failed:', error);
			return;
		}

		if (destroyed) {
			return;
		}

		clearSyncInterval();
		syncIntervalId = setInterval(() => {
			if (destroyed || isSyncing) {
				return;
			}

			triggerSync().catch((error) => {
				console.error('[autoSyncLifecycle] Periodic sync failed:', error);
			});
		}, intervalMs);
	});

	return () => {
		destroyed = true;
		unsubscribeActiveAccount();
		unsubscribeHasAccounts();
		unsubscribeIsSyncing();
		clearSyncInterval();
	};
}
