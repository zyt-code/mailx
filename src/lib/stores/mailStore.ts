import { derived, writable, get, type Readable } from 'svelte/store';
import * as db from '$lib/db/index.js';
import { eventBus } from '$lib/events/index.js';
import type { Mail, Folder } from '$lib/types.js';

const PAGE_SIZE = 50;

const _mails = writable<Mail[]>([]);
const _isLoading = writable(false);
const _isLoadingMore = writable(false);
const _activeFolder = writable<Folder>('inbox');
const _selectedAccountId = writable<string | null>(null); // null = 'all' accounts
const _error = writable<string | null>(null);
const _hasMore = writable(true);
const _totalCount = writable(0);

let _currentOffset = 0;

function ensureReadState(mail: Mail, read: boolean): Mail {
	return {
		...mail,
		is_read: read,
		unread: !read
	};
}

function normalizeMail(mail: Mail): Mail {
	if (typeof mail.is_read === 'boolean') {
		return {
			...mail,
			unread: mail.unread ?? !mail.is_read
		};
	}
	return ensureReadState(mail, !(mail.unread ?? true));
}

function updateMailInStore(mailId: string, updater: (mail: Mail) => Mail): Mail | null {
	let updated: Mail | null = null;
	_mails.update((current) => {
		const index = current.findIndex((mail) => mail.id === mailId);
		if (index === -1) return current;
		const next = [...current];
		const mutated = updater(next[index]);
		next[index] = mutated;
		updated = mutated;
		return next;
	});
	return updated;
}

export const mails: Readable<Mail[]> = { subscribe: _mails.subscribe };
export const isLoading: Readable<boolean> = { subscribe: _isLoading.subscribe };
export const isLoadingMore: Readable<boolean> = { subscribe: _isLoadingMore.subscribe };
export const activeFolder: Readable<Folder> = { subscribe: _activeFolder.subscribe };
export const selectedAccountId: Readable<string | null> = { subscribe: _selectedAccountId.subscribe };
export const mailError: Readable<string | null> = { subscribe: _error.subscribe };
export const hasMore: Readable<boolean> = { subscribe: _hasMore.subscribe };
export const totalCount: Readable<number> = { subscribe: _totalCount.subscribe };

// Account-filtered emails: if selectedAccountId is null, show all; otherwise filter by account
export const displayedEmails = derived(
  [_mails, _selectedAccountId, _activeFolder],
  ([$mails, $selectedAccountId, $activeFolder]) => {
    let filtered = $mails.filter(m => m.folder === $activeFolder);
    if ($selectedAccountId !== null) {
      const beforeFilter = filtered.length;
      // Force both to String for comparison to avoid type mismatch (number vs string)
      const selectedStr = String($selectedAccountId);
      filtered = filtered.filter(m => String(m.account_id ?? '') === selectedStr);
    }
    return filtered;
  }
);

/**
 * Set the selected account filter. Pass null for "All Inboxes".
 * Uses Optimistic UI: immediately updates the displayed emails via derived store,
 * then optionally triggers a background sync without blocking the UI.
 */
export function setSelectedAccount(accountId: string | null): void {
  _selectedAccountId.set(accountId);
  // The displayedEmails derived store will immediately update the UI
  // Background sync can happen without blocking the UI
}

let _initialized = false;

/**
 * Initialize MailStore with event listeners.
 * Call once at app startup. Safe to call multiple times (idempotent).
 */
export function initMailStore(): void {
  if (_initialized) return;
  _initialized = true;
  eventBus.onTauri('mails:updated', async () => {
    await loadMails();
  });

  eventBus.on('folder:change', async ({ folder }: { folder: Folder }) => {
    _activeFolder.set(folder);
    await loadMails(folder);
  });

  // Prime the list on first app load so Inbox has data before any folder click.
  void loadMails(get(_activeFolder));
}

export async function loadMails(folder?: Folder): Promise<void> {
  _isLoading.set(true);
  _error.set(null);
  _currentOffset = 0;
  try {
    const targetFolder = folder || 'inbox';
    const accountId = get(_selectedAccountId);
    const [data, count] = await Promise.all([
      db.getMails(targetFolder, accountId, PAGE_SIZE, 0),
      db.getMailsCount(targetFolder, accountId)
    ]);
    _mails.set(data.map(normalizeMail));
    _totalCount.set(count);
    _currentOffset = data.length;
    _hasMore.set(data.length < count);
    eventBus.emit('mails:loaded', { folder: targetFolder, accountId });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('Failed to load mails:', msg);
    _error.set(msg);
  } finally {
    _isLoading.set(false);
  }
}

export async function loadMoreMails(): Promise<void> {
  if (get(_isLoadingMore) || !get(_hasMore)) return;
  _isLoadingMore.set(true);
  try {
    const targetFolder = get(_activeFolder);
    const accountId = get(_selectedAccountId);
    const data = await db.getMails(targetFolder, accountId, PAGE_SIZE, _currentOffset);
    if (data.length > 0) {
      const normalized = data.map(normalizeMail);
      // Deduplicate by id (in case mails arrived during pagination)
      _mails.update((current) => {
        const existingIds = new Set(current.map((m) => m.id));
        const newMails = normalized.filter((m) => !existingIds.has(m.id));
        return [...current, ...newMails];
      });
      _currentOffset += data.length;
    }
    _hasMore.set(data.length >= PAGE_SIZE);
  } catch (e) {
    console.error('Failed to load more mails:', e);
  } finally {
    _isLoadingMore.set(false);
  }
}

export function switchFolder(folder: Folder): void {
  eventBus.emit('folder:change', { folder });
}

export function markMailReadLocally(mailId: string): Mail | null {
	const updated = updateMailInStore(mailId, (mail) => ensureReadState(mail, true));
	if (updated) {
		eventBus.emit('mail:updated', {
			mailId,
			accountId: updated.account_id ?? null,
			folder: updated.folder,
			read: true
		});
	}
	// Persist to database in the background (fire and forget)
	if (updated) {
		db.markMailRead(mailId, true).catch((error) => {
			console.error('[MailStore] Failed to persist read status to DB:', error);
		}).finally(() => {
			eventBus.emit('mail:counts:refresh');
		});
	}
	return updated;
}

export function markMailUnreadLocally(mailId: string): Mail | null {
	const updated = updateMailInStore(mailId, (mail) => ensureReadState(mail, false));
	if (updated) {
		eventBus.emit('mail:updated', {
			mailId,
			accountId: updated.account_id ?? null,
			folder: updated.folder,
			read: false
		});
	}
	// Persist to database in the background (fire and forget)
	if (updated) {
		db.markMailRead(mailId, false).catch((error) => {
			console.error('[MailStore] Failed to persist unread status to DB:', error);
		}).finally(() => {
			eventBus.emit('mail:counts:refresh');
		});
	}
	return updated;
}
