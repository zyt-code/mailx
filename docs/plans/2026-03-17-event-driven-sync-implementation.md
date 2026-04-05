# Event-Driven Mail Sync System Implementation Plan

> **Status note (2026-04-05):** This plan reflects the first event-driven sync rollout. It is no longer the authoritative implementation path for receive-side architecture. Use `2026-04-05-receive-sync-baseline-refactor-design.md` and the matching implementation plan for current refactor work.

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform mailx from static demo to dynamic app by implementing event-driven email synchronization with real-time updates and non-blocking UI.

**Architecture:** Event-driven architecture with central EventBus coordinating between AccountStore, SyncStore, and MailStore. Backend Rust SyncManager emits Tauri events that frontend stores consume and react to.

**Tech Stack:** Svelte 5 runes, Tauri v2, Rust (imap/mail-parser), SQLite, TypeScript

---

## Task 1: Create EventBus Core

**Files:**
- Create: `src/lib/events/eventBus.ts`
- Create: `src/lib/events/index.ts`

**Step 1: Write EventBus implementation**

Create `src/lib/events/eventBus.ts`:

```typescript
import { listen, type UnlistenFn } from '@tauri-apps/api/event';

type EventCallback<T = any> = (payload: T) => void;

/**
 * Central event bus for coordinating app state
 * Handles both Tauri backend events and internal frontend events
 */
class EventBus {
  private listeners: Map<string, Set<EventCallback>> = new Map();
  private tauriUnlisteners: UnlistenFn[] = [];

  /**
   * Listen to events from Tauri backend
   */
  async onTauri<T>(event: string, callback: EventCallback<T>): Promise<void> {
    const unlisten = await listen<T>(event, (event) => callback(event.payload));
    this.tauriUnlisteners.push(unlisten);
  }

  /**
   * Listen to internal frontend events
   */
  on(event: string, callback: EventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  /**
   * Emit an internal frontend event
   */
  emit(event: string, payload?: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(cb => cb(payload));
    }
  }

  /**
   * Remove all listeners (cleanup)
   */
  destroy(): void {
    this.tauriUnlisteners.forEach(unlisten => unlisten());
    this.listeners.clear();
  }
}

// Singleton instance
export const eventBus = new EventBus();
```

**Step 2: Create barrel export**

Create `src/lib/events/index.ts`:

```typescript
export { eventBus } from './eventBus.js';
```

**Step 3: Verify TypeScript compilation**

Run: `npm run check`
Expected: 0 errors (file count increases by 2)

**Step 4: Commit**

```bash
git add src/lib/events/
git commit -m "feat: add EventBus for event-driven architecture"
```

---

## Task 2: Create Sync Types and API

**Files:**
- Create: `src/lib/sync/types.ts`
- Create: `src/lib/sync/index.ts`

**Step 1: Write sync types**

Create `src/lib/sync/types.ts`:

```typescript
/**
 * Sync state enumeration
 */
export type SyncState = 'Idle' | 'Syncing' | 'Failed' | 'Cancelled';

/**
 * Sync status for tracking account synchronization
 */
export interface SyncStatus {
  account_id: string;
  account_email: string;
  status: SyncState;
  last_sync: number | null;
  error_message: string | null;
  retry_count: number;
}

/**
 * Sync progress for UI feedback
 */
export interface SyncProgress {
  current: number;
  total: number;
  message?: string;
}
```

**Step 2: Write sync API wrapper**

Create `src/lib/sync/index.ts`:

```typescript
import { invoke } from '@tauri-apps/api/core';
import type { SyncStatus } from './types.js';

/**
 * Trigger sync for a specific account
 */
export async function syncAccount(accountId: string): Promise<SyncStatus> {
  return invoke<SyncStatus>('sync_account', { id: accountId });
}

/**
 * Trigger sync for all active accounts
 */
export async function syncAllAccounts(): Promise<SyncStatus[]> {
  return invoke<SyncStatus[]>('sync_all_accounts');
}

/**
 * Get current sync status for all accounts
 */
export async function getSyncStatus(): Promise<SyncStatus[]> {
  return invoke<SyncStatus[]>('get_sync_status');
}

// Export types
export * from './types.js';
```

**Step 3: Verify TypeScript compilation**

Run: `npm run check`
Expected: 0 errors (file count increases by 2)

**Step 4: Commit**

```bash
git add src/lib/sync/
git commit -m "feat: add sync API wrapper and types"
```

---

## Task 3: Create SyncStore

**Files:**
- Create: `src/lib/stores/syncStore.ts`

**Step 1: Write SyncStore**

Create `src/lib/stores/syncStore.ts`:

```typescript
import { derived, writable } from 'svelte/store';
import { eventBus } from '$lib/events/index.js';
import type { SyncStatus, SyncProgress } from '$lib/sync/types.js';

/**
 * Internal sync state
 */
interface SyncState {
  isSyncing: boolean;
  currentAccount: string | null;
  currentAccountEmail: string | null;
  progress: SyncProgress | null;
  error: string | null;
}

const _state = writable<SyncState>({
  isSyncing: false,
  currentAccount: null,
  currentAccountEmail: null,
  progress: null,
  error: null
});

/**
 * Derived stores for UI consumption
 */
export const syncState = derived(_state, $state => $state);
export const isSyncing = derived(_state, $state => $state.isSyncing);
export const syncProgress = derived(_state, $state => $state.progress);
export const syncError = derived(_state, $state => $state.error);

/**
 * Initialize SyncStore with Tauri event listeners
 * Call once at app startup
 */
export function initSyncStore(): void {
  // Sync started
  eventBus.onTauri<{ account_id: string; email: string }>('sync:started', ({ account_id, email }) => {
    _state.update(s => ({
      ...s,
      isSyncing: true,
      currentAccount: account_id,
      currentAccountEmail: email,
      error: null
    }));
  });

  // Sync progress (optional enhancement for future)
  eventBus.onTauri<{ account_id: string; current: number; total: number }>('sync:progress', ({ current, total }) => {
    _state.update(s => ({
      ...s,
      progress: { current, total }
    }));
  });

  // Sync completed
  eventBus.onTauri<SyncStatus>('sync:completed', (status) => {
    _state.update(s => ({
      ...s,
      isSyncing: false,
      currentAccount: null,
      currentAccountEmail: null,
      progress: null,
      error: null
    }));
  });

  // Sync failed
  eventBus.onTauri<{ account_id: string; error: string }>('sync:failed', ({ error }) => {
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

/**
 * Manual trigger for sync (for testing/fallback)
 */
export function triggerSync(accountId: string): void {
  eventBus.emit('sync:trigger', { accountId });
}
```

**Step 2: Verify TypeScript compilation**

Run: `npm run check`
Expected: 0 errors

**Step 3: Commit**

```bash
git add src/lib/stores/syncStore.ts
git commit -m "feat: add SyncStore for sync state management"
```

---

## Task 4: Create MailStore

**Files:**
- Create: `src/lib/stores/mailStore.ts`

**Step 1: Write MailStore**

Create `src/lib/stores/mailStore.ts`:

```typescript
import { derived, writable } from 'svelte/store';
import * as db from '$lib/db/index.js';
import { eventBus } from '$lib/events/index.js';
import type { Mail, Folder } from '$lib/types.js';

// Internal state
const _mails = writable<Mail[]>([]);
const _isLoading = writable(false);
const _activeFolder = writable<Folder>('inbox');

// Public derived stores
export const mails = derived(_mails, $mails => $mails);
export const isLoading = derived(_isLoading, $loading => $loading);

/**
 * Mails filtered by active folder
 */
export const folderMails = derived(
  [_mails, _activeFolder],
  ([$mails, $activeFolder]) => $mails.filter(m => m.folder === $activeFolder)
);

/**
 * Active folder
 */
export const activeFolder = derived(_activeFolder, $f => $f);

/**
 * Initialize MailStore with event listeners
 * Call once at app startup
 */
export function initMailStore(): void {
  // Listen for mail updates from backend
  eventBus.onTauri('mails:updated', async () => {
    await loadMails();
  });

  // Listen for folder change events
  eventBus.on('folder:change', async ({ folder }: { folder: Folder }) => {
    _activeFolder.set(folder);
    await loadMails(folder);
  });
}

/**
 * Load mails from database
 */
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

/**
 * Refresh mails (triggers sync)
 */
export function refreshMails(): void {
  eventBus.emit('sync:trigger');
}

/**
 * Switch folder
 */
export function switchFolder(folder: Folder): void {
  eventBus.emit('folder:change', { folder });
}
```

**Step 2: Verify TypeScript compilation**

Run: `npm run check`
Expected: 0 errors

**Step 3: Commit**

```bash
git add src/lib/stores/mailStore.ts
git commit -m "feat: add MailStore for mail data management"
```

---

## Task 5: Create Notification Component

**Files:**
- Create: `src/lib/components/ui/notification/notification.svelte`
- Create: `src/lib/components/ui/notification/index.ts`

**Step 1: Write Notification component**

Create `src/lib/components/ui/notification/notification.svelte`:

```svelte
<script lang="ts">
  import { fly } from 'svelte/transition';
  import { X, CheckCircle, AlertCircle, Info } from 'lucide-svelte';
  import { cn } from '$lib/utils.js';

  export type NotificationType = 'success' | 'error' | 'info' | 'warning';

  export interface Notification {
    id: string;
    type: NotificationType;
    title: string;
    message?: string;
    duration?: number;
  }

  let notifications = $state<Notification[]>([]);

  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    info: Info,
    warning: AlertCircle
  };

  const colors = {
    success: 'text-green-600',
    error: 'text-red-600',
    info: 'text-blue-600',
    warning: 'text-amber-600'
  };

  /**
   * Show a notification
   */
  export function show(notification: Omit<Notification, 'id'>): void {
    const id = crypto.randomUUID();
    notifications = [...notifications, { id, ...notification }];

    const duration = notification.duration ?? 5000;
    if (duration > 0) {
      setTimeout(() => dismiss(id), duration);
    }
  }

  /**
   * Dismiss a notification
   */
  export function dismiss(id: string): void {
    notifications = notifications.filter(n => n.id !== id);
  }

  // Expose globally for easy access
  if (typeof window !== 'undefined') {
    (window as any).notification = { show, dismiss };
  }
</script>

<div class="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
  {#each notifications as notification (notification.id)}
    {@const Icon = icons[notification.type]}
    <div
      transition:fly={{ y: 50, duration: 300 }}
      class={cn(
        "pointer-events-auto min-w-[320px] max-w-[400px] bg-white rounded-lg shadow-lg border border-zinc-200",
        "p-4 flex items-start gap-3",
        colors[notification.type]
      )}
      role="alert"
    >
      <Icon class="size-5 shrink-0 mt-0.5" strokeWidth={1.5} />
      <div class="flex-1 min-w-0">
        <p class="text-sm font-medium text-zinc-900">{notification.title}</p>
        {#if notification.message}
          <p class="text-sm text-zinc-500 mt-0.5">{notification.message}</p>
        {/if}
      </div>
      <button
        onclick={() => dismiss(notification.id)}
        class="shrink-0 text-zinc-400 hover:text-zinc-600 transition-colors"
        aria-label="Dismiss"
      >
        <X class="size-4" strokeWidth={1.5} />
      </button>
    </div>
  {/each}
</div>
```

**Step 2: Create barrel export**

Create `src/lib/components/ui/notification/index.ts`:

```typescript
export { default as Notification } from './notification.svelte';
export type { NotificationType, Notification } from './notification.svelte';
```

**Step 3: Verify TypeScript compilation**

Run: `npm run check`
Expected: 0 errors

**Step 4: Commit**

```bash
git add src/lib/components/ui/notification/
git commit -m "feat: add bottom-right notification component"
```

---

## Task 6: Integrate Stores in AppShell

**Files:**
- Modify: `src/lib/components/layout/AppShell.svelte`

**Step 1: Update imports**

Add to existing imports:

```typescript
import { Notification } from '$lib/components/ui/notification/index.js';
import { eventBus } from '$lib/events/index.js';
import { initMailStore, loadMails, folderMails, switchFolder } from '$lib/stores/mailStore.js';
import { initSyncStore, isSyncing } from '$lib/stores/syncStore.js';
```

**Step 2: Initialize stores**

Add after `isAccountConfigured` state declaration (around line 36):

```typescript
// Initialize stores
initSyncStore();
initMailStore();

// Sync state
let syncing = $state(false);
$effect(() => {
  const unsub = isSyncing.subscribe(value => {
    syncing = value;
  });
  return unsub;
});
```

**Step 3: Replace local mails with folderMails**

Replace the `let mails: Mail[] = $state([]);` and `loadMails` function with:

```typescript
// Use store-derived mails
let mails = $derived(folderMails);

// Initial load
$effect(async () => {
  if (isAccountConfigured) {
    await loadMails(activeFolder);
  }
});
```

**Step 4: Update selectFolder function**

Replace the existing `selectFolder` function with:

```typescript
function selectFolder(folder: Folder) {
  activeFolder = folder;
  selectedMailId = null;
  mobileView = 'list';
  switchFolder(folder);
}
```

**Step 5: Add Notification component**

Add before the closing `</div>` of AppShell:

```svelte
<!-- Notifications -->
<Notification />
```

**Step 6: Verify TypeScript compilation**

Run: `npm run check`
Expected: 0 errors

**Step 7: Commit**

```bash
git add src/lib/components/layout/AppShell.svelte
git commit -m "feat: integrate stores and notification in AppShell"
```

---

## Task 7: Add Sync Indicator to Sidebar

**Files:**
- Modify: `src/lib/components/layout/Sidebar.svelte`

**Step 1: Add sync state import and subscription**

Add to imports:

```typescript
import { isSyncing } from '$lib/stores/syncStore.js';
import { syncAllAccounts } from '$lib/sync/index.js';
```

Add state after existing declarations:

```typescript
let syncing = $state(false);
$effect(() => {
  const unsub = isSyncing.subscribe(value => {
    syncing = value;
  });
  return unsub;
});
```

**Step 2: Add sync indicator to refresh section**

Find the refresh button area and add the sync indicator next to it. The refresh button should be disabled during sync.

```svelte
<!-- Refresh / Sync status section -->
<div class="flex items-center gap-2 px-3 py-2">
  {#if syncing}
    <div class="flex items-center gap-1.5 text-[11px] text-zinc-400">
      <div class="size-3 border-2 border-zinc-300 border-t-transparent rounded-full animate-spin" />
      <span>Syncing...</span>
    </div>
  {:else}
    <button
      onclick={async () => {
        await syncAllAccounts();
      }}
      class="text-[11px] text-zinc-400 hover:text-zinc-600 transition-colors"
    >
      Refresh
    </button>
  {/if}
</div>
```

**Step 3: Verify TypeScript compilation**

Run: `npm run check`
Expected: 0 errors

**Step 4: Commit**

```bash
git add src/lib/components/layout/Sidebar.svelte
git commit -m "feat: add sync indicator to Sidebar"
```

---

## Task 8: Connect Sync Events to Notification

**Files:**
- Create: `src/lib/events/syncHandlers.ts`

**Step 1: Create sync event handlers**

Create `src/lib/events/syncHandlers.ts`:

```typescript
import { eventBus } from './index.js';

/**
 * Initialize sync event handlers for notifications
 * Call once at app startup
 */
export function initSyncHandlers(): void {
  // Sync failed - show error notification
  eventBus.onTauri<{ account_id: string; error: string }>('sync:failed', ({ error }) => {
    if (typeof window !== 'undefined' && (window as any).notification) {
      (window as any).notification.show({
        type: 'error',
        title: 'Sync Failed',
        message: error,
        duration: 8000
      });
    }
  });

  // Sync completed - show success notification (optional, can be removed if too noisy)
  eventBus.onTauri<{ account_email: string }>('sync:completed', ({ account_email }) => {
    if (typeof window !== 'undefined' && (window as any).notification) {
      (window as any).notification.show({
        type: 'success',
        title: 'Sync Complete',
        message: `${account_email} is up to date`,
        duration: 3000
      });
    }
  });
}
```

**Step 2: Export from events index**

Update `src/lib/events/index.ts`:

```typescript
export { eventBus } from './eventBus.js';
export { initSyncHandlers } from './syncHandlers.js';
```

**Step 3: Initialize handlers in AppShell**

Add to AppShell.svelte after store initialization:

```typescript
import { initSyncHandlers } from '$lib/events/index.js';

// ... after initSyncStore() and initMailStore()
initSyncHandlers();
```

**Step 4: Verify TypeScript compilation**

Run: `npm run check`
Expected: 0 errors

**Step 5: Commit**

```bash
git add src/lib/events/
git commit -m "feat: add sync event handlers with notifications"
```

---

## Task 9: Auto-sync After Account Creation

**Files:**
- Modify: `src/routes/settings/accounts/new/+page.svelte`

**Step 1: Add sync trigger after successful account creation**

Find the success handling in `handleSubmit` and add sync trigger:

```typescript
// After successful account creation
notification.show({
  type: 'success',
  title: 'Account added',
  message: 'Syncing your emails...'
});

// Trigger sync for the new account
import { syncAccount } from '$lib/sync/index.js';
await syncAccount(result.id);

// Redirect to home
goto('/');
```

**Step 2: Verify TypeScript compilation**

Run: `npm run check`
Expected: 0 errors

**Step 3: Commit**

```bash
git add src/routes/settings/accounts/new/+page.svelte
git commit -m "feat: auto-sync after account creation"
```

---

## Task 10: Add Sync Trigger on Account Switch

**Files:**
- Modify: `src/lib/components/layout/Sidebar.svelte` (if it has account switcher)
- OR modify: `src/lib/components/layout/AppShell.svelte`

**Step 1: Add sync trigger when active account changes**

In AppShell.svelte, add effect after activeAccount subscription:

```typescript
import { activeAccount } from '$lib/stores/accountStore.js';
import { syncAccount } from '$lib/sync/index.js';

// Sync when account switches
$effect(async () => {
  const unsub = activeAccount.subscribe(async (acc) => {
    if (acc && isAccountConfigured) {
      // Trigger sync for newly activated account
      await syncAccount(acc.id);
    }
  });
  return unsub;
});
```

**Step 2: Verify TypeScript compilation**

Run: `npm run check`
Expected: 0 errors

**Step 3: Commit**

```bash
git add src/lib/components/layout/AppShell.svelte
git commit -m "feat: auto-sync on account switch"
```

---

## Task 11: Test and Verify

**Files:**
- None (manual testing)

**Step 1: Start development server**

Run: `npm run tauri dev`

**Step 2: Test flow 1 - Add account and sync**

1. Open app
2. Click "Add Account"
3. Enter email credentials
4. Submit form
5. **Expected:**
   - Success notification appears
   - "Syncing..." indicator shows in sidebar
   - After a few seconds, emails appear in list
   - Success notification "Sync Complete"

**Step 3: Test flow 2 - Manual refresh**

1. Click "Refresh" button in sidebar
2. **Expected:**
   - "Syncing..." indicator appears
   - Refresh button disabled during sync
   - Success notification after completion

**Step 4: Test flow 3 - Sync error handling**

1. Add account with wrong password
2. **Expected:**
   - Error notification in bottom-right
   - Clear error message

**Step 5: Test flow 4 - Folder switching**

1. Click different folders (Sent, Drafts, etc.)
2. **Expected:**
   - Mail list updates for each folder
   - Loading state shows during switch

**Step 6: Commit**

If all tests pass, commit final changes:

```bash
git add -A
git commit -m "test: verify event-driven sync system works end-to-end"
```

---

## Task 12: Documentation Update

**Files:**
- Modify: `docs/plans/2026-03-17-event-driven-sync-design.md`

**Step 1: Update design doc with any implementation changes**

Add a section at the end:

```markdown
## Implementation Notes

- Completed: 2026-03-17
- All tasks implemented successfully
- Event-driven architecture working as expected
```

**Step 2: Commit**

```bash
git add docs/plans/2026-03-17-event-driven-sync-design.md
git commit -m "docs: update design doc with implementation notes"
```

---

## Summary

This plan implements a complete event-driven mail sync system:

1. **EventBus** - Central coordination hub
2. **SyncStore** - Sync state management
3. **MailStore** - Mail data management
4. **Notification** - VS Code-style notifications
5. **Auto-sync** - Triggers on account creation and switch
6. **UI feedback** - Sync indicators and error handling

**Total files created:** 8
**Total files modified:** 4
**Estimated time:** 2-3 hours
