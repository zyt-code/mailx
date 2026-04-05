import { get } from 'svelte/store';
import { eventBus } from '$lib/events/eventBus.js';
import { activeAccount } from '$lib/stores/accountStore.js';
import { syncAccount, syncAllAccounts } from '$lib/sync/index.js';

type SyncTriggerPayload = {
	accountId?: string;
};

type SyncOrchestratorDeps = {
	eventBus: {
		on: (
			event: string,
			callback: (payload?: SyncTriggerPayload) => void | Promise<void>
		) => void;
	};
	syncAccount: (accountId: string) => Promise<unknown>;
	syncAllAccounts: () => Promise<unknown>;
	getActiveAccount: () => { id: string } | null;
};

let initialized = false;

export function initSyncOrchestrator(
	deps: SyncOrchestratorDeps = {
		eventBus,
		syncAccount,
		syncAllAccounts,
		getActiveAccount: () => get(activeAccount)
	}
): void {
	if (deps.eventBus === eventBus && initialized) {
		return;
	}

	if (deps.eventBus === eventBus) {
		initialized = true;
	}

	deps.eventBus.on('sync:trigger', async (payload) => {
		try {
			if (payload?.accountId) {
				await deps.syncAccount(payload.accountId);
				return;
			}

			const account = deps.getActiveAccount();
			if (account) {
				await deps.syncAccount(account.id);
				return;
			}

			await deps.syncAllAccounts();
		} catch (error) {
			console.error('[syncOrchestrator] sync:trigger invoke failed:', error);
		}
	});
}
