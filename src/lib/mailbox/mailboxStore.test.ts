import { get, writable } from 'svelte/store';
import { describe, expect, it, vi } from 'vitest';
import type { Mail } from '$lib/types.js';
import { createMailboxStore } from './mailboxStore.js';

function makeMail(overrides: Partial<Mail>): Mail {
	return {
		id: crypto.randomUUID(),
		from_name: 'Sender',
		from_email: 'sender@example.com',
		subject: 'Subject',
		preview: 'Preview',
		body: 'Body',
		timestamp: Date.now(),
		folder: 'inbox',
		is_read: true,
		unread: false,
		...overrides
	};
}

describe('createMailboxStore', () => {
	it('keeps inbox aggregate scope when no account is selected', async () => {
		const getMails = vi.fn().mockResolvedValue([makeMail({ folder: 'inbox', account_id: 'acc-1' })]);
		const getMailsCount = vi.fn().mockResolvedValue(1);
		const markMailRead = vi.fn().mockResolvedValue(undefined);
		const accountsStore = writable([
			{ id: 'acc-1', is_active: true },
			{ id: 'acc-2', is_active: false }
		]);

		const store = createMailboxStore({
			db: { getMails, getMailsCount, markMailRead },
			accountsStore
		});

		await store.loadMails();

		expect(get(store.selectedAccountId)).toBeNull();
		expect(get(store.effectiveAccountId)).toBeNull();
		expect(getMails).toHaveBeenCalledWith('inbox', null, 50, 0);
	});

	it('normalizes aggregate inbox selection to the active account when switching to a non-inbox folder', async () => {
		const getMails = vi.fn().mockResolvedValue([makeMail({ folder: 'sent', account_id: 'acc-2' })]);
		const getMailsCount = vi.fn().mockResolvedValue(1);
		const markMailRead = vi.fn().mockResolvedValue(undefined);
		const accountsStore = writable([
			{ id: 'acc-1', is_active: false },
			{ id: 'acc-2', is_active: true }
		]);

		const store = createMailboxStore({
			db: { getMails, getMailsCount, markMailRead },
			accountsStore
		});

		await store.switchFolder('sent');

		expect(get(store.activeFolder)).toBe('sent');
		expect(get(store.selectedAccountId)).toBe('acc-2');
		expect(get(store.effectiveAccountId)).toBe('acc-2');
		expect(getMails).toHaveBeenCalledWith('sent', 'acc-2', 50, 0);
	});

	it('reloads the mailbox when the explicit account selection changes', async () => {
		const getMails = vi.fn().mockResolvedValue([makeMail({ folder: 'inbox', account_id: 'acc-1' })]);
		const getMailsCount = vi.fn().mockResolvedValue(1);
		const markMailRead = vi.fn().mockResolvedValue(undefined);
		const accountsStore = writable([
			{ id: 'acc-1', is_active: true },
			{ id: 'acc-2', is_active: false }
		]);

		const store = createMailboxStore({
			db: { getMails, getMailsCount, markMailRead },
			accountsStore
		});

		await store.selectAccount('acc-1');

		expect(get(store.selectedAccountId)).toBe('acc-1');
		expect(get(store.effectiveAccountId)).toBe('acc-1');
		expect(getMails).toHaveBeenCalledTimes(1);
		expect(getMails).toHaveBeenCalledWith('inbox', 'acc-1', 50, 0);
	});

	it('updates selectedAccountId without reloading when setSelectedAccount is used as a pure state change', () => {
		const getMails = vi.fn().mockResolvedValue([]);
		const getMailsCount = vi.fn().mockResolvedValue(0);
		const markMailRead = vi.fn().mockResolvedValue(undefined);
		const accountsStore = writable([{ id: 'acc-1', is_active: true }]);

		const store = createMailboxStore({
			db: { getMails, getMailsCount, markMailRead },
			accountsStore
		});

		store.setSelectedAccount('acc-1');

		expect(get(store.selectedAccountId)).toBe('acc-1');
		expect(getMails).not.toHaveBeenCalled();
	});

	it('falls back to the active account when loadMails receives a stale selected account id', async () => {
		const getMails = vi.fn().mockResolvedValue([makeMail({ folder: 'inbox', account_id: 'acc-2' })]);
		const getMailsCount = vi.fn().mockResolvedValue(1);
		const markMailRead = vi.fn().mockResolvedValue(undefined);
		const accountsStore = writable([
			{ id: 'acc-1', is_active: false },
			{ id: 'acc-2', is_active: true }
		]);

		const store = createMailboxStore({
			db: { getMails, getMailsCount, markMailRead },
			accountsStore
		});

		store.setSelectedAccount('acc-9');
		await store.loadMails();

		expect(get(store.selectedAccountId)).toBe('acc-2');
		expect(get(store.effectiveAccountId)).toBe('acc-2');
		expect(getMails).toHaveBeenCalledWith('inbox', 'acc-2', 50, 0);
	});

	it('reloads the current mailbox when mails:updated arrives from tauri', async () => {
		const getMails = vi.fn().mockResolvedValue([makeMail({ folder: 'inbox', account_id: 'acc-1' })]);
		const getMailsCount = vi.fn().mockResolvedValue(1);
		const markMailRead = vi.fn().mockResolvedValue(undefined);
		const accountsStore = writable([{ id: 'acc-1', is_active: true }]);
		const tauriHandlers = new Map<string, (payload?: unknown) => void | Promise<void>>();

		const store = createMailboxStore({
			db: { getMails, getMailsCount, markMailRead },
			accountsStore,
			eventBus: {
				on: vi.fn(),
				onTauri(event, callback) {
					tauriHandlers.set(event, callback);
					return Promise.resolve();
				},
				emit: vi.fn()
			}
		});

		store.init();
		await store.loadMails();
		getMails.mockClear();

		await tauriHandlers.get('mails:updated')?.();

		expect(getMails).toHaveBeenCalledWith('inbox', null, 50, 0);
	});

	it('falls back to the active account when the selected account disappears', async () => {
		const getMails = vi.fn().mockResolvedValue([makeMail({ folder: 'inbox', account_id: 'acc-2' })]);
		const getMailsCount = vi.fn().mockResolvedValue(1);
		const markMailRead = vi.fn().mockResolvedValue(undefined);
		const accountsStore = writable([
			{ id: 'acc-1', is_active: false },
			{ id: 'acc-2', is_active: true }
		]);

		const store = createMailboxStore({
			db: { getMails, getMailsCount, markMailRead },
			accountsStore
		});

		store.init();
		await store.selectAccount('acc-2');
		getMails.mockClear();

		accountsStore.set([{ id: 'acc-1', is_active: true }]);

		await vi.waitFor(() => {
			expect(get(store.selectedAccountId)).toBe('acc-1');
		});
		expect(getMails).toHaveBeenCalledWith('inbox', 'acc-1', 50, 0);
	});

	it('does not reload the just-deleted active account before accounts store catches up', async () => {
		const getMails = vi.fn().mockResolvedValue([makeMail({ folder: 'inbox', account_id: 'acc-2' })]);
		const getMailsCount = vi.fn().mockResolvedValue(1);
		const markMailRead = vi.fn().mockResolvedValue(undefined);
		const accountsStore = writable([
			{ id: 'acc-1', is_active: true },
			{ id: 'acc-2', is_active: false }
		]);
		const tauriHandlers = new Map<string, (payload?: unknown) => void | Promise<void>>();

		const store = createMailboxStore({
			db: { getMails, getMailsCount, markMailRead },
			accountsStore,
			eventBus: {
				on: vi.fn(),
				onTauri(event, callback) {
					tauriHandlers.set(event, callback);
					return Promise.resolve();
				},
				emit: vi.fn()
			}
		});

		store.init();
		await store.selectAccount('acc-1');
		getMails.mockClear();
		getMailsCount.mockClear();

		await tauriHandlers.get('account:deleted')?.({ id: 'acc-1' });

		expect(get(store.selectedAccountId)).toBe('acc-2');
		expect(getMails).toHaveBeenCalledWith('inbox', 'acc-2', 50, 0);
	});

	it('does not reload the deleted last account from a non-inbox mailbox context', async () => {
		const getMails = vi.fn().mockResolvedValue([]);
		const getMailsCount = vi.fn().mockResolvedValue(0);
		const markMailRead = vi.fn().mockResolvedValue(undefined);
		const accountsStore = writable([{ id: 'acc-1', is_active: true }]);
		const tauriHandlers = new Map<string, (payload?: unknown) => void | Promise<void>>();

		const store = createMailboxStore({
			db: { getMails, getMailsCount, markMailRead },
			accountsStore,
			eventBus: {
				on: vi.fn(),
				onTauri(event, callback) {
					tauriHandlers.set(event, callback);
					return Promise.resolve();
				},
				emit: vi.fn()
			}
		});

		store.init();
		await store.switchFolder('sent');
		getMails.mockClear();
		getMailsCount.mockClear();

		await tauriHandlers.get('account:deleted')?.({ id: 'acc-1' });

		expect(get(store.selectedAccountId)).toBeNull();
		expect(getMails).toHaveBeenCalledWith('sent', null, 50, 0);
		expect(getMails).not.toHaveBeenCalledWith('sent', 'acc-1', 50, 0);
	});

	it('does not reload the current mailbox when an unrelated account is updated', async () => {
		const getMails = vi.fn().mockResolvedValue([makeMail({ folder: 'inbox', account_id: 'acc-1' })]);
		const getMailsCount = vi.fn().mockResolvedValue(1);
		const markMailRead = vi.fn().mockResolvedValue(undefined);
		const accountsStore = writable([
			{ id: 'acc-1', is_active: true },
			{ id: 'acc-2', is_active: false }
		]);
		const tauriHandlers = new Map<string, (payload?: unknown) => void | Promise<void>>();

		const store = createMailboxStore({
			db: { getMails, getMailsCount, markMailRead },
			accountsStore,
			eventBus: {
				on: vi.fn(),
				onTauri(event, callback) {
					tauriHandlers.set(event, callback);
					return Promise.resolve();
				},
				emit: vi.fn()
			}
		});

		store.init();
		await store.selectAccount('acc-1');
		getMails.mockClear();
		getMailsCount.mockClear();

		await tauriHandlers.get('account:updated')?.({ id: 'acc-2' });

		expect(get(store.selectedAccountId)).toBe('acc-1');
		expect(getMails).not.toHaveBeenCalled();
		expect(getMailsCount).not.toHaveBeenCalled();
	});

	it('does not reload the current mailbox when the current account is updated', async () => {
		const getMails = vi.fn().mockResolvedValue([makeMail({ folder: 'inbox', account_id: 'acc-1' })]);
		const getMailsCount = vi.fn().mockResolvedValue(1);
		const markMailRead = vi.fn().mockResolvedValue(undefined);
		const accountsStore = writable([
			{ id: 'acc-1', is_active: true },
			{ id: 'acc-2', is_active: false }
		]);
		const tauriHandlers = new Map<string, (payload?: unknown) => void | Promise<void>>();

		const store = createMailboxStore({
			db: { getMails, getMailsCount, markMailRead },
			accountsStore,
			eventBus: {
				on: vi.fn(),
				onTauri(event, callback) {
					tauriHandlers.set(event, callback);
					return Promise.resolve();
				},
				emit: vi.fn()
			}
		});

		store.init();
		await store.selectAccount('acc-1');
		getMails.mockClear();
		getMailsCount.mockClear();

		await tauriHandlers.get('account:updated')?.({ id: 'acc-1' });

		expect(get(store.selectedAccountId)).toBe('acc-1');
		expect(getMails).not.toHaveBeenCalled();
		expect(getMailsCount).not.toHaveBeenCalled();
	});

	it('does not reload the current mailbox when an unrelated account is deleted', async () => {
		const getMails = vi.fn().mockResolvedValue([makeMail({ folder: 'inbox', account_id: 'acc-1' })]);
		const getMailsCount = vi.fn().mockResolvedValue(1);
		const markMailRead = vi.fn().mockResolvedValue(undefined);
		const accountsStore = writable([
			{ id: 'acc-1', is_active: true },
			{ id: 'acc-2', is_active: false }
		]);
		const tauriHandlers = new Map<string, (payload?: unknown) => void | Promise<void>>();

		const store = createMailboxStore({
			db: { getMails, getMailsCount, markMailRead },
			accountsStore,
			eventBus: {
				on: vi.fn(),
				onTauri(event, callback) {
					tauriHandlers.set(event, callback);
					return Promise.resolve();
				},
				emit: vi.fn()
			}
		});

		store.init();
		await store.selectAccount('acc-1');
		getMails.mockClear();
		getMailsCount.mockClear();

		await tauriHandlers.get('account:deleted')?.({ id: 'acc-2' });

		expect(get(store.selectedAccountId)).toBe('acc-1');
		expect(getMails).not.toHaveBeenCalled();
		expect(getMailsCount).not.toHaveBeenCalled();
	});
});
