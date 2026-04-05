import { get, writable } from 'svelte/store';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const getMailsMock = vi.fn();
const getMailsCountMock = vi.fn();
const accountStore = writable([
	{ id: 'acc-1', is_active: false },
	{ id: 'acc-2', is_active: true }
]);

const internalHandlers = new Map<string, Set<(payload?: unknown) => void>>();
const tauriHandlers = new Map<string, Set<(payload?: unknown) => void>>();

vi.mock('$lib/db/index.js', () => ({
	getMails: getMailsMock,
	getMailsCount: getMailsCountMock,
	markMailRead: vi.fn()
}));

vi.mock('$lib/stores/accountStore.js', () => ({
	accounts: {
		subscribe: accountStore.subscribe
	}
}));

vi.mock('$lib/events/index.js', () => ({
	eventBus: {
		on: (event: string, callback: (payload?: unknown) => void) => {
			if (!internalHandlers.has(event)) {
				internalHandlers.set(event, new Set());
			}
			internalHandlers.get(event)!.add(callback);
		},
		onTauri: async (event: string, callback: (payload?: unknown) => void) => {
			if (!tauriHandlers.has(event)) {
				tauriHandlers.set(event, new Set());
			}
			tauriHandlers.get(event)!.add(callback);
		},
		emit: (event: string, payload?: unknown) => {
			internalHandlers.get(event)?.forEach((callback) => callback(payload));
		}
	}
}));

describe('mailStore scope behavior', () => {
	beforeEach(() => {
		vi.resetModules();
		getMailsMock.mockReset();
		getMailsCountMock.mockReset();
		internalHandlers.clear();
		tauriHandlers.clear();
		accountStore.set([
			{ id: 'acc-1', is_active: false },
			{ id: 'acc-2', is_active: true }
		]);
		getMailsMock.mockResolvedValue([]);
		getMailsCountMock.mockResolvedValue(0);
	});

	it('normalizes all-inboxes scope to the active account when switching to a non-inbox folder', async () => {
		const store = await import('./mailStore.js');

		store.initMailStore();
		await vi.waitFor(() => {
			expect(getMailsMock).toHaveBeenCalledWith('inbox', null, 50, 0);
		});

		getMailsMock.mockClear();
		getMailsCountMock.mockClear();

		store.switchFolder('sent');

		await vi.waitFor(() => {
			expect(get(store.selectedAccountId)).toBe('acc-2');
		});
		expect(getMailsMock).toHaveBeenCalledWith('sent', 'acc-2', 50, 0);
	});
});
