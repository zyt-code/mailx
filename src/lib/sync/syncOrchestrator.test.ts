import { describe, expect, it, vi } from 'vitest';
import { initSyncOrchestrator } from './syncOrchestrator.js';

describe('initSyncOrchestrator', () => {
	it('syncs the requested account when sync:trigger includes accountId', async () => {
		const handlers = new Map<string, (payload?: { accountId?: string }) => void | Promise<void>>();
		const syncAccount = vi.fn().mockResolvedValue(undefined);
		const syncAllAccounts = vi.fn().mockResolvedValue(undefined);

		initSyncOrchestrator({
			eventBus: {
				on(event, callback) {
					handlers.set(event, callback);
				}
			},
			syncAccount,
			syncAllAccounts,
			getActiveAccount: () => null
		});

		await handlers.get('sync:trigger')?.({ accountId: 'acc-7' });

		expect(syncAccount).toHaveBeenCalledWith('acc-7');
		expect(syncAllAccounts).not.toHaveBeenCalled();
	});

	it('falls back to the active account before syncing all accounts', async () => {
		const handlers = new Map<string, (payload?: { accountId?: string }) => void | Promise<void>>();
		const syncAccount = vi.fn().mockResolvedValue(undefined);
		const syncAllAccounts = vi.fn().mockResolvedValue(undefined);

		initSyncOrchestrator({
			eventBus: {
				on(event, callback) {
					handlers.set(event, callback);
				}
			},
			syncAccount,
			syncAllAccounts,
			getActiveAccount: () => ({ id: 'acc-2' })
		});

		await handlers.get('sync:trigger')?.();

		expect(syncAccount).toHaveBeenCalledWith('acc-2');
		expect(syncAllAccounts).not.toHaveBeenCalled();
	});
});
