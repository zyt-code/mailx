import { writable } from 'svelte/store';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { bindAutoSyncLifecycle } from './autoSyncLifecycle.js';

describe('bindAutoSyncLifecycle', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('syncs the active account immediately when an account becomes active', async () => {
		const activeAccountStore = writable<{ id: string } | null>(null);
		const hasAccountsStore = writable(true);
		const isSyncingStore = writable(false);
		const triggerSync = vi.fn().mockResolvedValue(undefined);

		const cleanup = bindAutoSyncLifecycle({
			activeAccountStore,
			hasAccountsStore,
			isSyncingStore,
			triggerSync,
			intervalMs: 1000
		});

		activeAccountStore.set({ id: 'acc-1' });
		await Promise.resolve();

		expect(triggerSync).toHaveBeenCalledWith({ accountId: 'acc-1' });
		cleanup();
	});

	it('runs periodic sync-all only when the app is not already syncing', async () => {
		const activeAccountStore = writable<{ id: string } | null>({ id: 'acc-1' });
		const hasAccountsStore = writable(true);
		const isSyncingStore = writable(false);
		const triggerSync = vi.fn().mockResolvedValue(undefined);

		const cleanup = bindAutoSyncLifecycle({
			activeAccountStore,
			hasAccountsStore,
			isSyncingStore,
			triggerSync,
			intervalMs: 1000
		});

		await Promise.resolve();
		expect(triggerSync).toHaveBeenNthCalledWith(1, { accountId: 'acc-1' });

		await vi.advanceTimersByTimeAsync(1000);
		expect(triggerSync).toHaveBeenNthCalledWith(2);

		isSyncingStore.set(true);
		await vi.advanceTimersByTimeAsync(1000);
		expect(triggerSync).toHaveBeenCalledTimes(2);

		cleanup();
	});

	it('clears the interval on cleanup', async () => {
		const activeAccountStore = writable<{ id: string } | null>({ id: 'acc-1' });
		const hasAccountsStore = writable(true);
		const isSyncingStore = writable(false);
		let releaseTrigger: (() => void) | undefined;
		const triggerSync = vi.fn().mockImplementation(
			() =>
				new Promise<void>((resolve) => {
					releaseTrigger = resolve;
				})
		);

		const cleanup = bindAutoSyncLifecycle({
			activeAccountStore,
			hasAccountsStore,
			isSyncingStore,
			triggerSync,
			intervalMs: 1000
		});

		cleanup();
		releaseTrigger?.();
		await Promise.resolve();
		await vi.advanceTimersByTimeAsync(3000);

		expect(triggerSync).toHaveBeenCalledTimes(1);
	});

	it('syncs the latest active account after an in-flight sync finishes', async () => {
		const activeAccountStore = writable<{ id: string } | null>({ id: 'acc-1' });
		const hasAccountsStore = writable(true);
		const isSyncingStore = writable(true);
		const triggerSync = vi.fn().mockResolvedValue(undefined);

		const cleanup = bindAutoSyncLifecycle({
			activeAccountStore,
			hasAccountsStore,
			isSyncingStore,
			triggerSync,
			intervalMs: 1000
		});

		activeAccountStore.set({ id: 'acc-2' });
		await Promise.resolve();

		expect(triggerSync).not.toHaveBeenCalled();

		isSyncingStore.set(false);
		await Promise.resolve();

		expect(triggerSync).toHaveBeenCalledWith({ accountId: 'acc-2' });
		cleanup();
	});
});
