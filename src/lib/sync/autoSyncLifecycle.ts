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
	let pendingInitialSyncAccountId: string | null = null;
	let hasAccounts = get(hasAccountsStore);
	let isSyncing = get(isSyncingStore);
	let syncIntervalId: ReturnType<typeof setInterval> | null = null;
	let destroyed = false;
	let initialSyncInFlight = false;

	function clearSyncInterval(): void {
		if (syncIntervalId) {
			clearInterval(syncIntervalId);
			syncIntervalId = null;
		}
	}

	async function flushPendingInitialSync(): Promise<void> {
		if (
			destroyed ||
			initialSyncInFlight ||
			!pendingInitialSyncAccountId ||
			!hasAccounts ||
			isSyncing
		) {
			return;
		}

		const accountId = pendingInitialSyncAccountId;
		pendingInitialSyncAccountId = null;
		initialSyncInFlight = true;

		try {
			await triggerSync({ accountId });
		} catch (error) {
			console.error('[autoSyncLifecycle] Initial account sync failed:', error);
			if (!destroyed && currentAccountId === accountId) {
				pendingInitialSyncAccountId = accountId;
			}
			return;
		} finally {
			initialSyncInFlight = false;
		}

		if (destroyed || currentAccountId !== accountId) {
			void flushPendingInitialSync();
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
	}

	const unsubscribeHasAccounts = hasAccountsStore.subscribe((value) => {
		hasAccounts = value;
		void flushPendingInitialSync();
	});

	const unsubscribeIsSyncing = isSyncingStore.subscribe((value) => {
		isSyncing = value;
		void flushPendingInitialSync();
	});

	const unsubscribeActiveAccount = activeAccountStore.subscribe(async (account) => {
		if (destroyed) {
			return;
		}

		if (!account) {
			currentAccountId = null;
			pendingInitialSyncAccountId = null;
			clearSyncInterval();
			return;
		}

		if (account.id === currentAccountId && !pendingInitialSyncAccountId) {
			return;
		}

		currentAccountId = account.id;
		pendingInitialSyncAccountId = account.id;
		clearSyncInterval();

		void flushPendingInitialSync();
	});

	return () => {
		destroyed = true;
		unsubscribeActiveAccount();
		unsubscribeHasAccounts();
		unsubscribeIsSyncing();
		clearSyncInterval();
	};
}
