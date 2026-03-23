import { get, writable } from 'svelte/store';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const selectedAccountIdStore = writable<string | null>(null);
const getUnreadCountMock = vi.fn();
const eventHandlers = new Map<string, Set<(payload?: unknown) => void>>();

vi.mock('$lib/stores/mailStore.js', () => ({
	selectedAccountId: {
		subscribe: selectedAccountIdStore.subscribe
	}
}));

vi.mock('$lib/db/index.js', () => ({
	getUnreadCount: getUnreadCountMock
}));

vi.mock('$lib/events/index.js', () => ({
	eventBus: {
		on: (event: string, callback: (payload?: unknown) => void) => {
			if (!eventHandlers.has(event)) {
				eventHandlers.set(event, new Set());
			}
			eventHandlers.get(event)!.add(callback);
		},
		emit: (event: string, payload?: unknown) => {
			eventHandlers.get(event)?.forEach((callback) => callback(payload));
		}
	}
}));

describe('unreadStore', () => {
	beforeEach(() => {
		vi.resetModules();
		selectedAccountIdStore.set(null);
		getUnreadCountMock.mockReset();
		eventHandlers.clear();
	});

	it('loads unread counts for every folder independent of the active list cache', async () => {
		getUnreadCountMock.mockImplementation(async (folder: string, accountId: string | null) => {
			const counts: Record<string, number> = {
				inbox: 5,
				sent: 0,
				drafts: 2,
				archive: 1,
				trash: 0
			};
			expect(accountId).toBeNull();
			return counts[folder] ?? 0;
		});

		const { folderUnreadCounts, initUnreadStore, refreshUnreadCounts } = await import('./unreadStore');

		initUnreadStore();
		await refreshUnreadCounts();

		expect(get(folderUnreadCounts)).toEqual({
			inbox: 5,
			sent: 0,
			drafts: 2,
			archive: 1,
			trash: 0
		});
	});

	it('refreshes unread counts when the selected account changes', async () => {
		getUnreadCountMock.mockImplementation(async (folder: string, accountId: string | null) => {
			if (accountId === 'acc-2') {
				return folder === 'inbox' ? 7 : 0;
			}
			return folder === 'inbox' ? 3 : 0;
		});

		const { folderUnreadCounts, initUnreadStore } = await import('./unreadStore');

		initUnreadStore();
		await new Promise((resolve) => setTimeout(resolve, 0));

		selectedAccountIdStore.set('acc-2');
		await vi.waitFor(() => {
			expect(getUnreadCountMock).toHaveBeenCalledWith('inbox', 'acc-2');
		});
		await vi.waitFor(() => {
			expect(get(folderUnreadCounts)).toEqual({
				inbox: 7,
				sent: 0,
				drafts: 0,
				archive: 0,
				trash: 0
			});
		});
	});

	it('optimistically updates counts when a mail is marked unread', async () => {
		getUnreadCountMock.mockImplementation(async (folder: string) => {
			return folder === 'inbox' ? 3 : 0;
		});

		const { folderUnreadCounts, initUnreadStore } = await import('./unreadStore');
		const { eventBus } = await import('$lib/events/index.js');

		initUnreadStore();
		await new Promise((resolve) => setTimeout(resolve, 0));

		eventBus.emit('mail:updated', {
			accountId: null,
			folder: 'inbox',
			read: false
		});

		expect(get(folderUnreadCounts)).toEqual({
			inbox: 4,
			sent: 0,
			drafts: 0,
			archive: 0,
			trash: 0
		});
	});
});
