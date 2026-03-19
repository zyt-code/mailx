import { derived } from 'svelte/store';
import type { Mail } from '$lib/types.js';
import { mails } from '$lib/stores/mailStore.js';

function isMailUnread(mail: Mail): boolean {
	if (typeof mail.is_read === 'boolean') {
		return !mail.is_read;
	}
	return mail.unread ?? true;
}

export const inboxUnread = derived(mails, ($mails) =>
	$mails.filter((mail) => mail.folder === 'inbox' && isMailUnread(mail)).length
);

export function initUnreadStore(): void {
	// Derived store updates automatically; keep exported function for compatibility.
}
