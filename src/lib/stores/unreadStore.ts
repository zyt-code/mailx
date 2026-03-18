import { writable } from 'svelte/store';
import { eventBus } from '$lib/events/index.js';
import { getUnreadCount } from '$lib/db/index.js';

const inboxUnread = writable<number>(0);
let _initialized = false;

/**
 * Initialize the unread count store.
 * Call once at app startup. Safe to call multiple times (idempotent).
 */
export function initUnreadStore(): void {
	if (_initialized) return;
	_initialized = true;

	// Refresh unread count when mails are updated
	eventBus.onTauri('mails:updated', () => {
		refreshUnread();
	});

	// Initial load
	refreshUnread();
}

/**
 * Refresh the unread count from the database.
 */
async function refreshUnread(): Promise<void> {
	try {
		const count = await getUnreadCount('inbox');
		inboxUnread.set(count);
	} catch (e) {
		console.error('[unreadStore] Failed to get unread count:', e);
	}
}

// Export the inbox unread store
export { inboxUnread };
