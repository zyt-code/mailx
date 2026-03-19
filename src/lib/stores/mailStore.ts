import { derived, writable, get } from 'svelte/store';
import * as db from '$lib/db/index.js';
import { eventBus } from '$lib/events/index.js';
import type { Mail, Folder } from '$lib/types.js';

const _mails = writable<Mail[]>([]);
const _isLoading = writable(false);
const _activeFolder = writable<Folder>('inbox');
const _selectedAccountId = writable<string | null>(null); // null = 'all' accounts
const _error = writable<string | null>(null);

export const mails = derived(_mails, $mails => $mails);
export const isLoading = derived(_isLoading, $loading => $loading);
export const activeFolder = derived(_activeFolder, $f => $f);
export const selectedAccountId = derived(_selectedAccountId, $id => $id);
export const mailError = derived(_error, $e => $e);

export const folderMails = derived(
  [_mails, _activeFolder],
  ([$mails, $activeFolder]) => $mails.filter(m => m.folder === $activeFolder)
);

// Account-filtered emails: if selectedAccountId is null, show all; otherwise filter by account
export const displayedEmails = derived(
  [_mails, _selectedAccountId, _activeFolder],
  ([$mails, $selectedAccountId, $activeFolder]) => {
    let filtered = $mails.filter(m => m.folder === $activeFolder);
    if ($selectedAccountId !== null) {
      const beforeFilter = filtered.length;
      // Force both to String for comparison to avoid type mismatch (number vs string)
      const selectedStr = String($selectedAccountId);
      filtered = filtered.filter(m => {
        const mailStr = String(m.account_id ?? '');
        const match = mailStr === selectedStr;
        console.log('[MailStore] Filter comparison:', {
          selectedAccountId: $selectedAccountId,
          selectedStr,
          mailAccountId: m.account_id,
          mailStr,
          match
        });
        return match;
      });
      // Debug logging for empty results
      if (filtered.length === 0 && beforeFilter > 0) {
        console.log('[MailStore] Account filter resulted in empty list:', {
          selectedAccountId: $selectedAccountId,
          availableAccountIds: [...new Set($mails.map(m => m.account_id).filter(Boolean))],
          folder: $activeFolder,
          totalMailsInFolder: beforeFilter
        });
      }
    }
    return filtered;
  }
);

/**
 * Set the selected account filter. Pass null for "All Inboxes".
 */
export function setSelectedAccount(accountId: string | null): void {
  _selectedAccountId.set(accountId);
  // Reload mails with the new account filter
  const currentFolder = get(_activeFolder);
  loadMails(currentFolder).catch(e => {
    console.error('Failed to reload mails after account switch:', e);
  });
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
}

export async function loadMails(folder?: Folder): Promise<void> {
  _isLoading.set(true);
  _error.set(null);
  try {
    const targetFolder = folder || 'inbox';
    const accountId = get(_selectedAccountId);
    const data = await db.getMails(targetFolder, accountId);
    _mails.set(data);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('Failed to load mails:', msg);
    _error.set(msg);
  } finally {
    _isLoading.set(false);
  }
}

export function refreshMails(): void {
  eventBus.emit('sync:trigger');
}

export function switchFolder(folder: Folder): void {
  eventBus.emit('folder:change', { folder });
}
