import { derived, writable } from 'svelte/store';
import type { Folder } from '$lib/types.js';
import type { Mail } from '$lib/types.js';
import { selectedAccountId } from '$lib/stores/mailStore.js';
import { eventBus } from '$lib/events/index.js';
import * as db from '$lib/db/index.js';

function isMailUnread(mail: Mail): boolean {
	if (typeof mail.is_read === 'boolean') {
		return !mail.is_read;
	}
	return mail.unread ?? true;
}

const EMPTY_UNREAD_COUNTS: Record<Folder, number> = {
	inbox: 0,
	sent: 0,
	drafts: 0,
	archive: 0,
	trash: 0
};

const FOLDERS: Folder[] = ['inbox', 'sent', 'drafts', 'archive', 'trash'];
const _folderUnreadCounts = writable<Record<Folder, number>>({ ...EMPTY_UNREAD_COUNTS });

let initialized = false;
let currentAccountId: string | null = null;
let refreshVersion = 0;

export const folderUnreadCounts = {
	subscribe: _folderUnreadCounts.subscribe
};

export const inboxUnread = derived(_folderUnreadCounts, ($counts) => $counts.inbox);

type MailUpdatedPayload = {
	accountId?: string | null;
	folder: Folder;
	read: boolean;
};

export async function refreshUnreadCounts(accountId: string | null = currentAccountId): Promise<void> {
	const version = ++refreshVersion;

	try {
		const counts = await Promise.all(
			FOLDERS.map(async (folder) => [folder, await db.getUnreadCount(folder, accountId)] as const)
		);

		if (version !== refreshVersion) return;

		_folderUnreadCounts.set(
			counts.reduce(
				(acc, [folder, count]) => {
					acc[folder] = count;
					return acc;
				},
				{ ...EMPTY_UNREAD_COUNTS }
			)
		);
	} catch (error) {
		console.error('[UnreadStore] Failed to refresh unread counts:', error);
	}
}

export function initUnreadStore(): void {
	if (initialized) return;
	initialized = true;

	selectedAccountId.subscribe((accountId) => {
		currentAccountId = accountId;
		void refreshUnreadCounts(accountId);
	});

	eventBus.on('mails:loaded', () => {
		void refreshUnreadCounts();
	});

	eventBus.on('mail:updated', (payload?: MailUpdatedPayload) => {
		if (!payload) return;
		if (currentAccountId !== null && payload.accountId !== currentAccountId) return;

		_folderUnreadCounts.update((counts) => {
			const delta = payload.read ? -1 : 1;
			return {
				...counts,
				[payload.folder]: Math.max(0, counts[payload.folder] + delta)
			};
		});
	});

	eventBus.on('mail:counts:refresh', () => {
		void refreshUnreadCounts();
	});

	void refreshUnreadCounts();
}
