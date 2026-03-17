import { derived, writable } from 'svelte/store';
import * as db from '$lib/db/index.js';
import { eventBus } from '$lib/events/index.js';
import type { Mail, Folder } from '$lib/types.js';

const _mails = writable<Mail[]>([]);
const _isLoading = writable(false);
const _activeFolder = writable<Folder>('inbox');

export const mails = derived(_mails, $mails => $mails);
export const isLoading = derived(_isLoading, $loading => $loading);
export const activeFolder = derived(_activeFolder, $f => $f);

export const folderMails = derived(
  [_mails, _activeFolder],
  ([$mails, $activeFolder]) => $mails.filter(m => m.folder === $activeFolder)
);

/**
 * Initialize MailStore with event listeners.
 * Call once at app startup.
 */
export function initMailStore(): void {
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
  try {
    const targetFolder = folder || 'inbox';
    const data = await db.getMails(targetFolder);
    _mails.set(data);
  } catch (e) {
    console.error('Failed to load mails:', e);
    throw e;
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
