import { describe, expect, it, vi } from 'vitest';
import { initAppShellRuntime } from './appShellRuntime.js';

describe('initAppShellRuntime', () => {
	it('initializes the AppShell runtime in the expected order', () => {
		const calls: string[] = [];

		initAppShellRuntime({
			initSyncStore: () => calls.push('syncStore'),
			initMailStore: () => calls.push('mailStore'),
			initSyncOrchestrator: () => calls.push('syncOrchestrator'),
			initSyncHandlers: () => calls.push('syncHandlers'),
			initUnreadStore: () => calls.push('unreadStore')
		});

		expect(calls).toEqual([
			'syncStore',
			'mailStore',
			'syncOrchestrator',
			'syncHandlers',
			'unreadStore'
		]);
	});

	it('only initializes the default runtime once', async () => {
		vi.resetModules();

		const initSyncStore = vi.fn();
		const initMailStore = vi.fn();
		const initSyncOrchestrator = vi.fn();
		const initSyncHandlers = vi.fn();
		const initUnreadStore = vi.fn();

		vi.doMock('$lib/stores/syncStore.js', () => ({
			initSyncStore
		}));
		vi.doMock('$lib/stores/mailStore.js', () => ({
			initMailStore
		}));
		vi.doMock('$lib/events/index.js', () => ({
			initSyncOrchestrator,
			initSyncHandlers
		}));
		vi.doMock('$lib/stores/unreadStore.js', () => ({
			initUnreadStore
		}));

		const { initAppShellRuntime: initDefaultRuntime } = await import('./appShellRuntime.js');

		initDefaultRuntime();
		initDefaultRuntime();

		expect(initSyncStore).toHaveBeenCalledTimes(1);
		expect(initMailStore).toHaveBeenCalledTimes(1);
		expect(initSyncOrchestrator).toHaveBeenCalledTimes(1);
		expect(initSyncHandlers).toHaveBeenCalledTimes(1);
		expect(initUnreadStore).toHaveBeenCalledTimes(1);
	});
});
