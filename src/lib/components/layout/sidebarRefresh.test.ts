import { describe, expect, it, vi } from 'vitest';
import { createSidebarRefresh } from './sidebarRefresh.js';

describe('createSidebarRefresh', () => {
	it('emits aggregate sync intent when no explicit account is selected', async () => {
		let isRefreshPending = false;
		const triggerSync = vi.fn().mockResolvedValue(undefined);
		const refresh = createSidebarRefresh({
			getSelectedAccountId: () => null,
			getIsRefreshing: () => false,
			getIsRefreshPending: () => isRefreshPending,
			getIsAccountConfigured: () => true,
			setIsRefreshPending: (value) => {
				isRefreshPending = value;
			},
			triggerSync
		});

		await refresh.refresh();

		expect(triggerSync).toHaveBeenCalledWith();
		expect(isRefreshPending).toBe(false);
	});

	it('emits account-scoped sync intent when a mailbox account is selected', async () => {
		let isRefreshPending = false;
		const triggerSync = vi.fn().mockResolvedValue(undefined);
		const refresh = createSidebarRefresh({
			getSelectedAccountId: () => 'acc-2',
			getIsRefreshing: () => false,
			getIsRefreshPending: () => isRefreshPending,
			getIsAccountConfigured: () => true,
			setIsRefreshPending: (value) => {
				isRefreshPending = value;
			},
			triggerSync
		});

		await refresh.refresh();

		expect(triggerSync).toHaveBeenCalledWith({ accountId: 'acc-2' });
		expect(isRefreshPending).toBe(false);
	});

	it('does not trigger refresh when accounts are not configured', async () => {
		let isRefreshPending = false;
		const triggerSync = vi.fn().mockResolvedValue(undefined);
		const showDisabledFeedback = vi.fn();
		const refresh = createSidebarRefresh({
			getSelectedAccountId: () => null,
			getIsRefreshing: () => false,
			getIsRefreshPending: () => isRefreshPending,
			getIsAccountConfigured: () => false,
			setIsRefreshPending: (value) => {
				isRefreshPending = value;
			},
			triggerSync,
			showDisabledFeedback
		});

		await refresh.refresh();

		expect(showDisabledFeedback).toHaveBeenCalledTimes(1);
		expect(triggerSync).not.toHaveBeenCalled();
		expect(isRefreshPending).toBe(false);
	});

	it('suppresses a second refresh while one is pending', async () => {
		let isRefreshPending = false;
		let releaseRefresh: (() => void) | undefined;
		const triggerSync = vi.fn().mockImplementation(
			() =>
				new Promise<void>((resolve) => {
					releaseRefresh = resolve;
				})
		);
		const refresh = createSidebarRefresh({
			getSelectedAccountId: () => null,
			getIsRefreshing: () => false,
			getIsRefreshPending: () => isRefreshPending,
			getIsAccountConfigured: () => true,
			setIsRefreshPending: (value) => {
				isRefreshPending = value;
			},
			triggerSync
		});

		const firstRun = refresh.refresh();
		const secondRun = refresh.refresh();
		await Promise.resolve();

		expect(triggerSync).toHaveBeenCalledTimes(1);
		expect(isRefreshPending).toBe(true);

		releaseRefresh?.();
		await firstRun;
		await secondRun;

		expect(isRefreshPending).toBe(false);
	});

	it('logs refresh failures and clears the pending flag', async () => {
		let isRefreshPending = false;
		const logError = vi.fn();
		const refresh = createSidebarRefresh({
			getSelectedAccountId: () => null,
			getIsRefreshing: () => false,
			getIsRefreshPending: () => isRefreshPending,
			getIsAccountConfigured: () => true,
			setIsRefreshPending: (value) => {
				isRefreshPending = value;
			},
			triggerSync: vi.fn().mockRejectedValue(new Error('sync failed')),
			logError
		});

		await refresh.refresh();

		expect(logError).toHaveBeenCalledWith('Refresh failed:', expect.any(Error));
		expect(isRefreshPending).toBe(false);
	});
});
