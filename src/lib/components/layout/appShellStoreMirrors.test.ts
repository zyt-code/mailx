import { writable } from 'svelte/store';
import { describe, expect, it } from 'vitest';
import type { Mail } from '$lib/types.js';
import { bindAppShellStoreMirrors } from './appShellStoreMirrors.js';

function createMail(id: string): Mail {
	return {
		id,
		from_name: 'Sender',
		from_email: 'sender@example.com',
		subject: `Mail ${id}`,
		preview: 'Preview',
		body: 'Body',
		timestamp: Date.now(),
		folder: 'inbox',
		is_read: false,
		unread: true
	};
}

describe('bindAppShellStoreMirrors', () => {
	it('mirrors the latest store values into local AppShell state', () => {
		const displayedEmailsStore = writable<Mail[]>([createMail('mail-1')]);
		const hasAccountsStore = writable(false);
		const isSyncingStore = writable(false);
		let storeMails: Mail[] = [];
		let isAccountConfigured = true;
		let syncing = true;

		const cleanup = bindAppShellStoreMirrors({
			displayedEmailsStore,
			hasAccountsStore,
			isSyncingStore,
			setStoreMails: (value) => {
				storeMails = value;
			},
			setIsAccountConfigured: (value) => {
				isAccountConfigured = value;
			},
			setSyncing: (value) => {
				syncing = value;
			}
		});

		expect(storeMails.map((mail) => mail.id)).toEqual(['mail-1']);
		expect(isAccountConfigured).toBe(false);
		expect(syncing).toBe(false);

		displayedEmailsStore.set([createMail('mail-2')]);
		hasAccountsStore.set(true);
		isSyncingStore.set(true);

		expect(storeMails.map((mail) => mail.id)).toEqual(['mail-2']);
		expect(isAccountConfigured).toBe(true);
		expect(syncing).toBe(true);

		cleanup();
	});

	it('stops mirroring updates after cleanup', () => {
		const displayedEmailsStore = writable<Mail[]>([createMail('mail-1')]);
		const hasAccountsStore = writable(true);
		const isSyncingStore = writable(false);
		let storeMails: Mail[] = [];
		let isAccountConfigured = false;
		let syncing = true;

		const cleanup = bindAppShellStoreMirrors({
			displayedEmailsStore,
			hasAccountsStore,
			isSyncingStore,
			setStoreMails: (value) => {
				storeMails = value;
			},
			setIsAccountConfigured: (value) => {
				isAccountConfigured = value;
			},
			setSyncing: (value) => {
				syncing = value;
			}
		});

		cleanup();
		displayedEmailsStore.set([createMail('mail-9')]);
		hasAccountsStore.set(false);
		isSyncingStore.set(true);

		expect(storeMails.map((mail) => mail.id)).toEqual(['mail-1']);
		expect(isAccountConfigured).toBe(true);
		expect(syncing).toBe(false);
	});
});
