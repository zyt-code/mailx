import { derived, writable } from 'svelte/store';
import { eventBus } from '$lib/events/index.js';
import type { SyncStatus } from '$lib/types.js';
import type { SyncProgress } from '$lib/sync/types.js';

interface SyncStoreState {
  isSyncing: boolean;
  currentAccount: string | null;
  currentAccountEmail: string | null;
  progress: SyncProgress | null;
  error: string | null;
  lastSyncTime: number | null;
}

const _state = writable<SyncStoreState>({
  isSyncing: false,
  currentAccount: null,
  currentAccountEmail: null,
  progress: null,
  error: null,
  lastSyncTime: null
});

export const isSyncing = derived(_state, $state => $state.isSyncing);
export const lastSyncTime = derived(_state, $state => $state.lastSyncTime);
export const syncingAccountId = derived(_state, $state => $state.currentAccount);

let _initialized = false;
let _syncSafetyTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Initialize SyncStore with Tauri event listeners.
 * Call once at app startup. Safe to call multiple times (idempotent).
 */
export function initSyncStore(): void {
  if (_initialized) return;
  _initialized = true;
  eventBus.onTauri<{ account_id: string; email: string }>('sync:started', ({ account_id, email }) => {
    _state.update(s => ({
      ...s,
      isSyncing: true,
      currentAccount: account_id,
      currentAccountEmail: email,
      error: null
    }));
    // Safety timeout: force-clear syncing state after 120s
    if (_syncSafetyTimer) clearTimeout(_syncSafetyTimer);
    _syncSafetyTimer = setTimeout(() => {
      _state.update(s => ({
        ...s,
        isSyncing: false,
        currentAccount: null,
        currentAccountEmail: null,
        progress: null,
        error: 'Sync timed out'
      }));
    }, 120_000);
  });

  eventBus.onTauri<{ account_id: string; current: number; total: number }>('sync:progress', ({ current, total }) => {
    _state.update(s => ({
      ...s,
      progress: { current, total }
    }));
  });

  eventBus.onTauri<SyncStatus>('sync:completed', () => {
    if (_syncSafetyTimer) { clearTimeout(_syncSafetyTimer); _syncSafetyTimer = null; }
    _state.update(s => ({
      ...s,
      isSyncing: false,
      currentAccount: null,
      currentAccountEmail: null,
      progress: null,
      error: null,
      lastSyncTime: Date.now()
    }));
  });

  eventBus.onTauri<{ account_id: string; error: string }>('sync:failed', ({ error }) => {
    if (_syncSafetyTimer) { clearTimeout(_syncSafetyTimer); _syncSafetyTimer = null; }
    _state.update(s => ({
      ...s,
      isSyncing: false,
      currentAccount: null,
      currentAccountEmail: null,
      progress: null,
      error
    }));
  });
}
