# Receive/Sync Baseline Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish a trustworthy receive/sync pipeline with explicit mailbox scope, single-owner state transitions, and TDD coverage for account, folder, refresh, and read-state workflows.

**Architecture:** Introduce a pure mailbox-scope module, move receive-side query state into a dedicated mailbox store, split optimistic mail actions from query state, and extract sync triggering into a dedicated orchestrator. Keep the current UI mostly intact by turning `src/lib/stores/mailStore.ts` into a compatibility facade.

**Tech Stack:** Svelte 5, Svelte stores, Vitest, Testing Library, Tauri v2, TypeScript, Rust IMAP commands

> **Status update (2026-04-05):** Core mailbox/sync extraction is in place, `AppShell`, `ReadingPane`, and `Sidebar` have been thinned further through dedicated helpers, `npm run check` is green, and the focused frontend regression suite currently passes at 34 files / 130 tests. Workflow integration coverage now includes settings entry, primary mobile mailbox flows, sidebar-driven mailbox transitions, the refresh-to-reload receive path, desktop mailbox-context selection clearing on folder/account switches, and desktop continuous-reading selection after list-side delete, ReadingPane delete, ReadingPane archive, and last-visible fallback mutations, with remaining work focused on broader workflow-level coverage and any hardening that emerges from it.

---

## File Structure

### New Files

- `src/lib/mailbox/mailboxScope.ts`
- `src/lib/mailbox/mailboxScope.test.ts`
- `src/lib/mailbox/mailboxStore.ts`
- `src/lib/mailbox/mailboxStore.test.ts`
- `src/lib/mailbox/mailboxActions.ts`
- `src/lib/mailbox/mailboxActions.test.ts`
- `src/lib/sync/syncOrchestrator.ts`
- `src/lib/sync/syncOrchestrator.test.ts`
- `src/lib/components/layout/AppShell.test.ts`
- `src/lib/components/layout/readingPaneComposeState.ts`
- `src/lib/components/layout/readingPaneComposeState.test.ts`
- `src/lib/components/layout/appShellStoreMirrors.ts`
- `src/lib/components/layout/appShellStoreMirrors.test.ts`
- `src/lib/components/layout/sidebarStoreMirrors.ts`
- `src/lib/components/layout/sidebarStoreMirrors.test.ts`
- `src/lib/components/layout/sidebarRefresh.ts`
- `src/lib/components/layout/sidebarRefresh.test.ts`
- `src/lib/components/layout/sidebarComposeState.ts`
- `src/lib/components/layout/sidebarComposeState.test.ts`
- `src/lib/components/layout/sidebarNavigation.ts`
- `src/lib/components/layout/sidebarNavigation.test.ts`
- `src/lib/components/layout/sidebarDisabledFeedback.ts`
- `src/lib/components/layout/sidebarDisabledFeedback.test.ts`
- `src/lib/components/layout/sidebarAccountsCollapse.ts`
- `src/lib/components/layout/sidebarAccountsCollapse.test.ts`
- `src/lib/components/layout/sidebarComposeEvents.ts`
- `src/lib/components/layout/sidebarComposeEvents.test.ts`

### Modified Files

- `src/lib/stores/mailStore.ts`
- `src/lib/components/layout/AppShell.svelte`
- `src/lib/components/layout/ReadingPane.svelte`
- `src/lib/components/layout/Sidebar.svelte`
- `src/lib/events/syncHandlers.ts`
- `src/lib/events/index.ts`
- `docs/plans/2026-03-17-event-driven-sync-design.md`
- `docs/plans/2026-03-17-event-driven-sync-implementation.md`
- `docs/plans/2026-03-19-interaction-optimization-design.md`
- `docs/plans/2026-03-19-interaction-optimization.md`

### Verification Commands

- `npm install`
- `npx vitest run src/lib/mailbox/mailboxScope.test.ts`
- `npx vitest run src/lib/mailbox/mailboxStore.test.ts`
- `npx vitest run src/lib/mailbox/mailboxActions.test.ts`
- `npx vitest run src/lib/sync/syncOrchestrator.test.ts`
- `npx vitest run src/lib/components/layout/AppShell.test.ts src/lib/components/layout/Sidebar.refresh.test.ts src/lib/components/layout/MailList.test.ts`
- `npx vitest run src/lib/components/layout/readingPaneComposeState.test.ts src/lib/components/layout/appShellStoreMirrors.test.ts src/lib/components/layout/AppShell.mailbox.test.ts`
- `npx vitest run src/lib/components/layout/sidebarStoreMirrors.test.ts src/lib/components/layout/Sidebar.refresh.test.ts src/lib/components/layout/Sidebar.test.ts`
- `npx vitest run src/lib/components/layout/sidebarRefresh.test.ts src/lib/components/layout/Sidebar.refresh.test.ts src/lib/components/layout/sidebarStoreMirrors.test.ts src/lib/components/layout/Sidebar.test.ts`
- `npx vitest run src/lib/components/layout/sidebarComposeState.test.ts src/lib/components/layout/sidebarRefresh.test.ts src/lib/components/layout/Sidebar.refresh.test.ts src/lib/components/layout/sidebarStoreMirrors.test.ts src/lib/components/layout/Sidebar.test.ts`
- `npx vitest run src/lib/components/layout/sidebarNavigation.test.ts src/lib/components/layout/sidebarComposeState.test.ts src/lib/components/layout/sidebarRefresh.test.ts src/lib/components/layout/Sidebar.refresh.test.ts src/lib/components/layout/sidebarStoreMirrors.test.ts src/lib/components/layout/Sidebar.test.ts`
- `npx vitest run src/lib/components/layout/sidebarDisabledFeedback.test.ts src/lib/components/layout/Sidebar.test.ts src/lib/components/layout/sidebarNavigation.test.ts src/lib/components/layout/sidebarComposeState.test.ts src/lib/components/layout/sidebarRefresh.test.ts`
- `npx vitest run src/lib/components/layout/sidebarAccountsCollapse.test.ts src/lib/components/layout/sidebarDisabledFeedback.test.ts src/lib/components/layout/Sidebar.test.ts`
- `npx vitest run src/lib/components/layout/sidebarComposeEvents.test.ts src/lib/components/layout/sidebarAccountsCollapse.test.ts src/lib/components/layout/sidebarDisabledFeedback.test.ts src/lib/components/layout/Sidebar.test.ts`
- `npx vitest run src/lib/events/eventBus.test.ts src/lib/mailbox/mailboxScope.test.ts src/lib/mailbox/mailboxStore.test.ts src/lib/mailbox/mailboxActions.test.ts src/lib/mailbox/mailboxContextActions.test.ts src/lib/stores/mailStore.scope.test.ts src/lib/stores/unreadStore.test.ts src/lib/sync/syncOrchestrator.test.ts src/lib/sync/autoSyncLifecycle.test.ts src/lib/components/layout/Sidebar.refresh.test.ts src/lib/components/layout/AppShell.mailbox.test.ts src/lib/components/layout/appShellShortcuts.test.ts src/lib/components/layout/appShellRuntime.test.ts src/lib/components/layout/appShellMailboxNavigation.test.ts src/lib/components/layout/appShellLayout.test.ts src/lib/components/layout/appShellMailSelection.test.ts src/lib/components/layout/appShellSelectedMail.test.ts src/lib/components/layout/appShellReadState.test.ts src/lib/components/layout/appShellSelectedMailLifecycle.test.ts src/lib/components/layout/readingPaneMailActions.test.ts src/lib/components/layout/readingPaneComposeState.test.ts src/lib/components/layout/appShellStoreMirrors.test.ts`
- `npx vitest run src/lib/events/eventBus.test.ts src/lib/mailbox/mailboxScope.test.ts src/lib/mailbox/mailboxStore.test.ts src/lib/mailbox/mailboxActions.test.ts src/lib/mailbox/mailboxContextActions.test.ts src/lib/stores/mailStore.scope.test.ts src/lib/stores/unreadStore.test.ts src/lib/sync/syncOrchestrator.test.ts src/lib/sync/autoSyncLifecycle.test.ts src/lib/components/layout/Sidebar.refresh.test.ts src/lib/components/layout/Sidebar.test.ts src/lib/components/layout/AppShell.mailbox.test.ts src/lib/components/layout/appShellShortcuts.test.ts src/lib/components/layout/appShellRuntime.test.ts src/lib/components/layout/appShellMailboxNavigation.test.ts src/lib/components/layout/appShellLayout.test.ts src/lib/components/layout/appShellMailSelection.test.ts src/lib/components/layout/appShellSelectedMail.test.ts src/lib/components/layout/appShellReadState.test.ts src/lib/components/layout/appShellSelectedMailLifecycle.test.ts src/lib/components/layout/readingPaneMailActions.test.ts src/lib/components/layout/readingPaneComposeState.test.ts src/lib/components/layout/appShellStoreMirrors.test.ts src/lib/components/layout/sidebarStoreMirrors.test.ts`
- `npx vitest run src/lib/events/eventBus.test.ts src/lib/mailbox/mailboxScope.test.ts src/lib/mailbox/mailboxStore.test.ts src/lib/mailbox/mailboxActions.test.ts src/lib/mailbox/mailboxContextActions.test.ts src/lib/stores/mailStore.scope.test.ts src/lib/stores/unreadStore.test.ts src/lib/sync/syncOrchestrator.test.ts src/lib/sync/autoSyncLifecycle.test.ts src/lib/components/layout/Sidebar.refresh.test.ts src/lib/components/layout/Sidebar.test.ts src/lib/components/layout/sidebarRefresh.test.ts src/lib/components/layout/AppShell.mailbox.test.ts src/lib/components/layout/appShellShortcuts.test.ts src/lib/components/layout/appShellRuntime.test.ts src/lib/components/layout/appShellMailboxNavigation.test.ts src/lib/components/layout/appShellLayout.test.ts src/lib/components/layout/appShellMailSelection.test.ts src/lib/components/layout/appShellSelectedMail.test.ts src/lib/components/layout/appShellReadState.test.ts src/lib/components/layout/appShellSelectedMailLifecycle.test.ts src/lib/components/layout/readingPaneMailActions.test.ts src/lib/components/layout/readingPaneComposeState.test.ts src/lib/components/layout/appShellStoreMirrors.test.ts src/lib/components/layout/sidebarStoreMirrors.test.ts`
- `npx vitest run src/lib/events/eventBus.test.ts src/lib/mailbox/mailboxScope.test.ts src/lib/mailbox/mailboxStore.test.ts src/lib/mailbox/mailboxActions.test.ts src/lib/mailbox/mailboxContextActions.test.ts src/lib/stores/mailStore.scope.test.ts src/lib/stores/unreadStore.test.ts src/lib/sync/syncOrchestrator.test.ts src/lib/sync/autoSyncLifecycle.test.ts src/lib/components/layout/Sidebar.refresh.test.ts src/lib/components/layout/Sidebar.test.ts src/lib/components/layout/sidebarRefresh.test.ts src/lib/components/layout/sidebarComposeState.test.ts src/lib/components/layout/AppShell.mailbox.test.ts src/lib/components/layout/appShellShortcuts.test.ts src/lib/components/layout/appShellRuntime.test.ts src/lib/components/layout/appShellMailboxNavigation.test.ts src/lib/components/layout/appShellLayout.test.ts src/lib/components/layout/appShellMailSelection.test.ts src/lib/components/layout/appShellSelectedMail.test.ts src/lib/components/layout/appShellReadState.test.ts src/lib/components/layout/appShellSelectedMailLifecycle.test.ts src/lib/components/layout/readingPaneMailActions.test.ts src/lib/components/layout/readingPaneComposeState.test.ts src/lib/components/layout/appShellStoreMirrors.test.ts src/lib/components/layout/sidebarStoreMirrors.test.ts`
- `npx vitest run src/lib/events/eventBus.test.ts src/lib/mailbox/mailboxScope.test.ts src/lib/mailbox/mailboxStore.test.ts src/lib/mailbox/mailboxActions.test.ts src/lib/mailbox/mailboxContextActions.test.ts src/lib/stores/mailStore.scope.test.ts src/lib/stores/unreadStore.test.ts src/lib/sync/syncOrchestrator.test.ts src/lib/sync/autoSyncLifecycle.test.ts src/lib/components/layout/Sidebar.refresh.test.ts src/lib/components/layout/Sidebar.test.ts src/lib/components/layout/sidebarRefresh.test.ts src/lib/components/layout/sidebarComposeState.test.ts src/lib/components/layout/sidebarNavigation.test.ts src/lib/components/layout/AppShell.mailbox.test.ts src/lib/components/layout/appShellShortcuts.test.ts src/lib/components/layout/appShellRuntime.test.ts src/lib/components/layout/appShellMailboxNavigation.test.ts src/lib/components/layout/appShellLayout.test.ts src/lib/components/layout/appShellMailSelection.test.ts src/lib/components/layout/appShellSelectedMail.test.ts src/lib/components/layout/appShellReadState.test.ts src/lib/components/layout/appShellSelectedMailLifecycle.test.ts src/lib/components/layout/readingPaneMailActions.test.ts src/lib/components/layout/readingPaneComposeState.test.ts src/lib/components/layout/appShellStoreMirrors.test.ts src/lib/components/layout/sidebarStoreMirrors.test.ts`
- `npx vitest run src/lib/events/eventBus.test.ts src/lib/mailbox/mailboxScope.test.ts src/lib/mailbox/mailboxStore.test.ts src/lib/mailbox/mailboxActions.test.ts src/lib/mailbox/mailboxContextActions.test.ts src/lib/stores/mailStore.scope.test.ts src/lib/stores/unreadStore.test.ts src/lib/sync/syncOrchestrator.test.ts src/lib/sync/autoSyncLifecycle.test.ts src/lib/components/layout/Sidebar.refresh.test.ts src/lib/components/layout/Sidebar.test.ts src/lib/components/layout/sidebarRefresh.test.ts src/lib/components/layout/sidebarComposeState.test.ts src/lib/components/layout/sidebarNavigation.test.ts src/lib/components/layout/sidebarDisabledFeedback.test.ts src/lib/components/layout/AppShell.mailbox.test.ts src/lib/components/layout/appShellShortcuts.test.ts src/lib/components/layout/appShellRuntime.test.ts src/lib/components/layout/appShellMailboxNavigation.test.ts src/lib/components/layout/appShellLayout.test.ts src/lib/components/layout/appShellMailSelection.test.ts src/lib/components/layout/appShellSelectedMail.test.ts src/lib/components/layout/appShellReadState.test.ts src/lib/components/layout/appShellSelectedMailLifecycle.test.ts src/lib/components/layout/readingPaneMailActions.test.ts src/lib/components/layout/readingPaneComposeState.test.ts src/lib/components/layout/appShellStoreMirrors.test.ts src/lib/components/layout/sidebarStoreMirrors.test.ts`
- `npx vitest run src/lib/events/eventBus.test.ts src/lib/mailbox/mailboxScope.test.ts src/lib/mailbox/mailboxStore.test.ts src/lib/mailbox/mailboxActions.test.ts src/lib/mailbox/mailboxContextActions.test.ts src/lib/stores/mailStore.scope.test.ts src/lib/stores/unreadStore.test.ts src/lib/sync/syncOrchestrator.test.ts src/lib/sync/autoSyncLifecycle.test.ts src/lib/components/layout/Sidebar.refresh.test.ts src/lib/components/layout/Sidebar.test.ts src/lib/components/layout/sidebarRefresh.test.ts src/lib/components/layout/sidebarComposeState.test.ts src/lib/components/layout/sidebarNavigation.test.ts src/lib/components/layout/sidebarDisabledFeedback.test.ts src/lib/components/layout/sidebarAccountsCollapse.test.ts src/lib/components/layout/AppShell.mailbox.test.ts src/lib/components/layout/appShellShortcuts.test.ts src/lib/components/layout/appShellRuntime.test.ts src/lib/components/layout/appShellMailboxNavigation.test.ts src/lib/components/layout/appShellLayout.test.ts src/lib/components/layout/appShellMailSelection.test.ts src/lib/components/layout/appShellSelectedMail.test.ts src/lib/components/layout/appShellReadState.test.ts src/lib/components/layout/appShellSelectedMailLifecycle.test.ts src/lib/components/layout/readingPaneMailActions.test.ts src/lib/components/layout/readingPaneComposeState.test.ts src/lib/components/layout/appShellStoreMirrors.test.ts src/lib/components/layout/sidebarStoreMirrors.test.ts`
- `npx vitest run src/lib/events/eventBus.test.ts src/lib/mailbox/mailboxScope.test.ts src/lib/mailbox/mailboxStore.test.ts src/lib/mailbox/mailboxActions.test.ts src/lib/mailbox/mailboxContextActions.test.ts src/lib/stores/mailStore.scope.test.ts src/lib/stores/unreadStore.test.ts src/lib/sync/syncOrchestrator.test.ts src/lib/sync/autoSyncLifecycle.test.ts src/lib/components/layout/Sidebar.refresh.test.ts src/lib/components/layout/Sidebar.test.ts src/lib/components/layout/sidebarRefresh.test.ts src/lib/components/layout/sidebarComposeState.test.ts src/lib/components/layout/sidebarNavigation.test.ts src/lib/components/layout/sidebarDisabledFeedback.test.ts src/lib/components/layout/sidebarAccountsCollapse.test.ts src/lib/components/layout/sidebarComposeEvents.test.ts src/lib/components/layout/AppShell.mailbox.test.ts src/lib/components/layout/appShellShortcuts.test.ts src/lib/components/layout/appShellRuntime.test.ts src/lib/components/layout/appShellMailboxNavigation.test.ts src/lib/components/layout/appShellLayout.test.ts src/lib/components/layout/appShellMailSelection.test.ts src/lib/components/layout/appShellSelectedMail.test.ts src/lib/components/layout/appShellReadState.test.ts src/lib/components/layout/appShellSelectedMailLifecycle.test.ts src/lib/components/layout/readingPaneMailActions.test.ts src/lib/components/layout/readingPaneComposeState.test.ts src/lib/components/layout/appShellStoreMirrors.test.ts src/lib/components/layout/sidebarStoreMirrors.test.ts`
- `npm run check`
- `cargo test --manifest-path src-tauri/Cargo.toml`

---

### Task 1: Restore Frontend Test Tooling Baseline

**Files:**
- Modify: `package-lock.json` or local `node_modules/` state only

- [ ] **Step 1: Install frontend dependencies**

Run: `npm install`
Expected: local `node_modules` is restored and `node_modules/.bin/svelte-kit.cmd` plus `node_modules/.bin/vitest.cmd` exist

- [ ] **Step 2: Capture the current frontend baseline**

Run: `npx vitest run src/lib/components/layout/Sidebar.refresh.test.ts src/lib/components/layout/MailList.test.ts src/App.test.ts`
Expected: current baseline output is recorded before refactor work begins

- [ ] **Step 3: Commit dependency metadata only if it changed**

```bash
git add package-lock.json
git commit -m "chore: refresh frontend test tooling baseline"
```

---

### Task 2: Extract Pure Mailbox Scope Rules With TDD

**Files:**
- Create: `src/lib/mailbox/mailboxScope.ts`
- Create: `src/lib/mailbox/mailboxScope.test.ts`

- [ ] **Step 1: Write the failing scope-contract tests**

```ts
import { describe, expect, it } from 'vitest';
import {
  resolveFallbackAccountId,
  resolveMailboxScope,
  normalizeMailboxSelection
} from './mailboxScope.js';

const accounts = [
  { id: 'acc-1', is_active: false },
  { id: 'acc-2', is_active: true }
];

describe('mailboxScope', () => {
  it('keeps aggregate scope only for inbox', () => {
    expect(resolveMailboxScope('inbox', null, accounts).effectiveAccountId).toBeNull();
    expect(resolveMailboxScope('sent', null, accounts).effectiveAccountId).toBe('acc-2');
  });

  it('keeps explicit account selection when present', () => {
    expect(resolveMailboxScope('archive', 'acc-1', accounts).effectiveAccountId).toBe('acc-1');
  });

  it('normalizes aggregate selection when leaving inbox', () => {
    expect(normalizeMailboxSelection('sent', null, accounts)).toBe('acc-2');
  });

  it('falls back to the first account when no active account exists', () => {
    expect(resolveFallbackAccountId([{ id: 'acc-9', is_active: false }])).toBe('acc-9');
  });
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npx vitest run src/lib/mailbox/mailboxScope.test.ts`
Expected: FAIL because `mailboxScope.ts` does not exist yet

- [ ] **Step 3: Write the minimal mailbox-scope implementation**

```ts
import type { Folder } from '$lib/types.js';

type AccountLike = { id: string; is_active: boolean };

export function resolveFallbackAccountId(accounts: AccountLike[]): string | null {
  return accounts.find((account) => account.is_active)?.id ?? accounts[0]?.id ?? null;
}

export function normalizeMailboxSelection(
  folder: Folder,
  selectedAccountId: string | null,
  accounts: AccountLike[]
): string | null {
  if (folder === 'inbox') return selectedAccountId;
  return selectedAccountId ?? resolveFallbackAccountId(accounts);
}

export function resolveMailboxScope(
  folder: Folder,
  selectedAccountId: string | null,
  accounts: AccountLike[]
): { selectedAccountId: string | null; effectiveAccountId: string | null } {
  const normalizedSelection = normalizeMailboxSelection(folder, selectedAccountId, accounts);
  return {
    selectedAccountId: normalizedSelection,
    effectiveAccountId: folder === 'inbox' && normalizedSelection === null
      ? null
      : normalizedSelection
  };
}
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `npx vitest run src/lib/mailbox/mailboxScope.test.ts`
Expected: PASS

- [ ] **Step 5: Commit the pure mailbox contract**

```bash
git add src/lib/mailbox/mailboxScope.ts src/lib/mailbox/mailboxScope.test.ts
git commit -m "test: define mailbox scope contract"
```

---

### Task 3: Build a Dedicated Mailbox Store With Contract Tests

**Files:**
- Create: `src/lib/mailbox/mailboxStore.ts`
- Create: `src/lib/mailbox/mailboxStore.test.ts`
- Modify: `src/lib/stores/mailStore.ts`

- [ ] **Step 1: Write failing store-contract tests**

```ts
import { describe, expect, it, vi } from 'vitest';
import { get } from 'svelte/store';
import { createMailboxStore } from './mailboxStore.js';

describe('createMailboxStore', () => {
  it('normalizes aggregate inbox selection to the active account when switching to sent', async () => {
    const getMails = vi.fn().mockResolvedValue([]);
    const getMailsCount = vi.fn().mockResolvedValue(0);
    const store = createMailboxStore({
      db: { getMails, getMailsCount },
      accounts: [{ id: 'acc-2', is_active: true }]
    });

    await store.selectMailboxFolder('sent');

    expect(get(store.selectedAccountId)).toBe('acc-2');
    expect(get(store.activeFolder)).toBe('sent');
    expect(getMails).toHaveBeenCalledWith('sent', 'acc-2', 50, 0);
  });

  it('switches to an explicit account and reloads once when account selection changes', async () => {
    const getMails = vi.fn().mockResolvedValue([]);
    const getMailsCount = vi.fn().mockResolvedValue(0);
    const store = createMailboxStore({
      db: { getMails, getMailsCount },
      accounts: [{ id: 'acc-1', is_active: true }]
    });

    await store.selectMailboxAccount('acc-1');

    expect(getMails).toHaveBeenCalledTimes(1);
    expect(get(store.selectedAccountId)).toBe('acc-1');
  });
});
```

- [ ] **Step 2: Run the store test and verify RED**

Run: `npx vitest run src/lib/mailbox/mailboxStore.test.ts`
Expected: FAIL because `createMailboxStore` does not exist yet

- [ ] **Step 3: Write the minimal mailbox store**

```ts
import { derived, get, writable } from 'svelte/store';
import { resolveMailboxScope } from './mailboxScope.js';
import type { Folder, Mail } from '$lib/types.js';

export function createMailboxStore(deps: {
  db: {
    getMails: (folder: Folder, accountId: string | null, limit: number, offset: number) => Promise<Mail[]>;
    getMailsCount: (folder: Folder, accountId: string | null) => Promise<number>;
  };
  accounts: { id: string; is_active: boolean }[];
}) {
  const PAGE_SIZE = 50;
  const activeFolder = writable<Folder>('inbox');
  const selectedAccountId = writable<string | null>(null);
  const effectiveAccountId = writable<string | null>(null);
  const mails = writable<Mail[]>([]);
  const isLoading = writable(false);
  const isLoadingMore = writable(false);
  const mailError = writable<string | null>(null);
  const totalCount = writable(0);
  const hasMore = writable(true);
  let currentOffset = 0;

  async function loadMails(): Promise<void> {
    isLoading.set(true);
    mailError.set(null);
    const folder = get(activeFolder);
    const scope = resolveMailboxScope(folder, get(selectedAccountId), deps.accounts);
    selectedAccountId.set(scope.selectedAccountId);
    effectiveAccountId.set(scope.effectiveAccountId);
    const [items, count] = await Promise.all([
      deps.db.getMails(folder, scope.effectiveAccountId, PAGE_SIZE, 0),
      deps.db.getMailsCount(folder, scope.effectiveAccountId)
    ]);
    mails.set(items);
    totalCount.set(count);
    hasMore.set(items.length < count);
    currentOffset = items.length;
    isLoading.set(false);
  }

  async function loadMoreMails(): Promise<void> {
    if (get(isLoadingMore) || !get(hasMore)) return;
    isLoadingMore.set(true);
    const folder = get(activeFolder);
    const accountId = get(effectiveAccountId);
    const nextPage = await deps.db.getMails(folder, accountId, PAGE_SIZE, currentOffset);
    mails.update((current) => [...current, ...nextPage]);
    currentOffset += nextPage.length;
    hasMore.set(nextPage.length === PAGE_SIZE);
    isLoadingMore.set(false);
  }

  async function selectMailboxFolder(folder: Folder): Promise<void> {
    activeFolder.set(folder);
    await loadMails();
  }

  async function selectMailboxAccount(accountId: string | null): Promise<void> {
    selectedAccountId.set(accountId);
    await loadMails();
  }

  return {
    displayedEmails: derived(mails, ($mails) => $mails),
    activeFolder: derived(activeFolder, ($folder) => $folder),
    selectedAccountId: derived(selectedAccountId, ($id) => $id),
    effectiveAccountId: derived(effectiveAccountId, ($id) => $id),
    isLoading: derived(isLoading, ($loading) => $loading),
    isLoadingMore: derived(isLoadingMore, ($loading) => $loading),
    mailError: derived(mailError, ($error) => $error),
    hasMore: derived(hasMore, ($value) => $value),
    totalCount: derived(totalCount, ($count) => $count),
    loadMails,
    loadMoreMails,
    reload: loadMails,
    switchFolder: selectMailboxFolder,
    setSelectedAccount: selectMailboxAccount,
    selectMailboxFolder,
    selectMailboxAccount
  };
}
```

- [ ] **Step 4: Convert `src/lib/stores/mailStore.ts` into a compatibility facade**

```ts
export {
  activeFolder,
  displayedEmails,
  hasMore,
  isLoading,
  isLoadingMore,
  loadMails,
  loadMoreMails,
  mailError,
  markMailReadLocally,
  markMailUnreadLocally,
  selectedAccountId,
  setSelectedAccount,
  switchFolder,
  totalCount
} from '$lib/mailbox/mailboxStore.js';
```

- [ ] **Step 5: Run the store test and impacted existing tests**

Run: `npx vitest run src/lib/mailbox/mailboxStore.test.ts src/lib/stores/unreadStore.test.ts`
Expected: PASS

- [ ] **Step 6: Commit the mailbox store extraction**

```bash
git add src/lib/mailbox/mailboxStore.ts src/lib/mailbox/mailboxStore.test.ts src/lib/stores/mailStore.ts
git commit -m "refactor: extract mailbox query store"
```

---

### Task 4: Extract Mailbox Actions With Optimistic-Update TDD

**Files:**
- Create: `src/lib/mailbox/mailboxActions.ts`
- Create: `src/lib/mailbox/mailboxActions.test.ts`
- Modify: `src/lib/mailbox/mailboxStore.ts`
- Modify: `src/lib/stores/mailStore.ts`

- [ ] **Step 1: Write failing optimistic-action tests**

```ts
import { describe, expect, it, vi } from 'vitest';
import { createMailboxActions } from './mailboxActions.js';

describe('createMailboxActions', () => {
  it('updates local state immediately and persists read state in background', async () => {
    const markMailRead = vi.fn().mockResolvedValue(undefined);
    const updateMail = vi.fn();
    const actions = createMailboxActions({
      db: { markMailRead },
      updateMail,
      emit: vi.fn()
    });

    await actions.markRead({ id: 'mail-1', folder: 'inbox', account_id: 'acc-1', unread: true, is_read: false });

    expect(updateMail).toHaveBeenCalled();
    expect(markMailRead).toHaveBeenCalledWith('mail-1', true);
  });

  it('restores state when persistence fails', async () => {
    const markMailRead = vi.fn().mockRejectedValue(new Error('db down'));
    const updateMail = vi.fn();
    const actions = createMailboxActions({
      db: { markMailRead },
      updateMail,
      emit: vi.fn()
    });

    await actions.markUnread({ id: 'mail-1', folder: 'inbox', account_id: 'acc-1', unread: false, is_read: true });

    expect(updateMail).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 2: Run the action test and verify RED**

Run: `npx vitest run src/lib/mailbox/mailboxActions.test.ts`
Expected: FAIL because `mailboxActions.ts` does not exist yet

- [ ] **Step 3: Write the minimal mailbox actions implementation**

```ts
import type { Mail } from '$lib/types.js';

function applyReadState(mail: Mail, read: boolean): Mail {
  return { ...mail, is_read: read, unread: !read };
}

export function createMailboxActions(deps: {
  db: { markMailRead: (id: string, read: boolean) => Promise<void> };
  updateMail: (mailId: string, updater: (mail: Mail) => Mail) => Mail | null;
  emit: (event: string, payload?: unknown) => void;
}) {
  async function persist(mail: Mail, read: boolean): Promise<void> {
    try {
      await deps.db.markMailRead(mail.id, read);
      deps.emit('mail:counts:refresh');
    } catch {
      deps.updateMail(mail.id, () => applyReadState(mail, !read));
      deps.emit('mail:counts:refresh');
    }
  }

  async function markRead(mail: Mail): Promise<void> {
    deps.updateMail(mail.id, (current) => applyReadState(current, true));
    deps.emit('mail:updated', { mailId: mail.id, accountId: mail.account_id ?? null, folder: mail.folder, read: true });
    await persist(mail, true);
  }

  async function markUnread(mail: Mail): Promise<void> {
    deps.updateMail(mail.id, (current) => applyReadState(current, false));
    deps.emit('mail:updated', { mailId: mail.id, accountId: mail.account_id ?? null, folder: mail.folder, read: false });
    await persist(mail, false);
  }

  return { markRead, markUnread };
}
```

- [ ] **Step 4: Wire mailbox actions into `mailboxStore.ts` and re-export them through the facade**

```ts
const actions = createMailboxActions({
  db,
  updateMail: updateMailInStore,
  emit: eventBus.emit
});

export const markMailReadLocally = actions.markRead;
export const markMailUnreadLocally = actions.markUnread;
```

- [ ] **Step 5: Run action tests and unread regression tests**

Run: `npx vitest run src/lib/mailbox/mailboxActions.test.ts src/lib/stores/unreadStore.test.ts src/lib/mailbox/mailboxStore.test.ts`
Expected: PASS

- [ ] **Step 6: Commit the action extraction**

```bash
git add src/lib/mailbox/mailboxActions.ts src/lib/mailbox/mailboxActions.test.ts src/lib/mailbox/mailboxStore.ts src/lib/stores/mailStore.ts
git commit -m "refactor: extract mailbox actions"
```

---

### Task 5: Extract Sync Trigger Orchestration With TDD

**Files:**
- Create: `src/lib/sync/syncOrchestrator.ts`
- Create: `src/lib/sync/syncOrchestrator.test.ts`
- Modify: `src/lib/events/syncHandlers.ts`
- Modify: `src/lib/events/index.ts`

- [ ] **Step 1: Write failing sync-orchestrator tests**

```ts
import { describe, expect, it, vi } from 'vitest';
import { initSyncOrchestrator } from './syncOrchestrator.js';

describe('initSyncOrchestrator', () => {
  it('syncs a requested account id directly', async () => {
    const on = vi.fn((event, handler) => {
      if (event === 'sync:trigger') {
        void handler({ accountId: 'acc-7' });
      }
    });
    const syncAccount = vi.fn().mockResolvedValue(undefined);
    initSyncOrchestrator({
      eventBus: { on },
      syncAccount,
      syncAllAccounts: vi.fn(),
      getActiveAccount: () => null
    });

    expect(syncAccount).toHaveBeenCalledWith('acc-7');
  });
});
```

- [ ] **Step 2: Run the orchestrator test and verify RED**

Run: `npx vitest run src/lib/sync/syncOrchestrator.test.ts`
Expected: FAIL because `syncOrchestrator.ts` does not exist yet

- [ ] **Step 3: Write the minimal orchestrator**

```ts
export function initSyncOrchestrator(deps: {
  eventBus: { on: (event: string, callback: (payload?: { accountId?: string }) => void) => void };
  syncAccount: (accountId: string) => Promise<unknown>;
  syncAllAccounts: () => Promise<unknown>;
  getActiveAccount: () => { id: string } | null;
}): void {
  deps.eventBus.on('sync:trigger', async (payload) => {
    if (payload?.accountId) {
      await deps.syncAccount(payload.accountId);
      return;
    }

    const active = deps.getActiveAccount();
    if (active) {
      await deps.syncAccount(active.id);
      return;
    }

    await deps.syncAllAccounts();
  });
}
```

- [ ] **Step 4: Trim `syncHandlers.ts` to notification-only behavior**

```ts
// Remove sync:trigger ownership from this module.
// Keep only sync:failed and sync:completed user-notification logic here.
```

- [ ] **Step 5: Run sync orchestration and sidebar refresh tests**

Run: `npx vitest run src/lib/sync/syncOrchestrator.test.ts src/lib/components/layout/Sidebar.refresh.test.ts`
Expected: PASS

- [ ] **Step 6: Commit the sync extraction**

```bash
git add src/lib/sync/syncOrchestrator.ts src/lib/sync/syncOrchestrator.test.ts src/lib/events/syncHandlers.ts src/lib/events/index.ts
git commit -m "refactor: isolate sync trigger orchestration"
```

---

### Task 6: Thin AppShell And Prove The Main Workflow

**Files:**
- Create: `src/lib/components/layout/AppShell.test.ts`
- Modify: `src/lib/components/layout/AppShell.svelte`
- Modify: `src/lib/components/layout/Sidebar.svelte`

- [ ] **Step 1: Write the failing workflow test**

```ts
import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import AppShell from './AppShell.svelte';

const selectMailboxFolderMock = vi.fn().mockResolvedValue(undefined);
const selectMailboxAccountMock = vi.fn().mockResolvedValue(undefined);

vi.mock('$lib/stores/mailStore.js', async () => {
  const actual = await vi.importActual<object>('$lib/stores/mailStore.js');
  return {
    ...actual,
    switchFolder: selectMailboxFolderMock,
    setSelectedAccount: selectMailboxAccountMock
  };
});

describe('AppShell mailbox workflow', () => {
  it('routes folder and account changes through mailbox intents instead of local reload logic', async () => {
    render(AppShell);

    await fireEvent.click(screen.getByText('Sent'));
    await fireEvent.click(screen.getByText('Primary'));

    await waitFor(() => {
      expect(selectMailboxFolderMock).toHaveBeenCalledWith('sent');
      expect(selectMailboxAccountMock).toHaveBeenCalledWith('acc-1');
    });
  });
});
```

- [ ] **Step 2: Run the workflow test and verify RED**

Run: `npx vitest run src/lib/components/layout/AppShell.test.ts`
Expected: FAIL because the new mailbox workflow seams are not wired yet

- [ ] **Step 3: Slim `AppShell.svelte` to consume store/intents only**

```ts
function handleSelectAccount(accountId: string | null) {
  void setSelectedAccount(accountId);
  selectedMailId = null;
  mobileView = 'list';
}

function selectFolder(folder: Folder) {
  void switchFolder(folder);
  selectedMailId = null;
  mobileView = 'list';
}
```

- [ ] **Step 4: Update `Sidebar.svelte` to emit user intent instead of triggering mailbox reload logic directly**

```ts
function handleAccountClick(accountId: string | null): void {
  onSelectAccount(accountId);
}
```

- [ ] **Step 5: Run workflow, regression, and type-check suites**

Run: `npx vitest run src/lib/components/layout/AppShell.test.ts src/lib/components/layout/Sidebar.refresh.test.ts src/lib/components/layout/MailList.test.ts`
Expected: PASS

Run: `npm run check`
Expected: PASS

- [ ] **Step 6: Commit the UI workflow integration**

```bash
git add src/lib/components/layout/AppShell.svelte src/lib/components/layout/AppShell.test.ts src/lib/components/layout/Sidebar.svelte
git commit -m "refactor: thin AppShell mailbox workflow"
```

---

### Task 7: Final Verification And Documentation Sync

**Files:**
- Modify: `docs/plans/2026-04-05-receive-sync-baseline-refactor-design.md`
- Modify: `docs/plans/2026-04-05-receive-sync-baseline-refactor-implementation.md`

- [ ] **Step 1: Run the full receive/sync verification suite**

Run: `npx vitest run src/lib/mailbox/mailboxScope.test.ts src/lib/mailbox/mailboxStore.test.ts src/lib/mailbox/mailboxActions.test.ts src/lib/sync/syncOrchestrator.test.ts src/lib/components/layout/AppShell.test.ts src/lib/components/layout/Sidebar.refresh.test.ts src/lib/components/layout/MailList.test.ts`
Expected: PASS

Run: `cargo test --manifest-path src-tauri/Cargo.toml`
Expected: PASS

- [ ] **Step 2: Update docs with implementation notes if the plan changed**

```md
## Status Update

- Completed tasks:
- Deviations from original design:
- Follow-up work for compose/send baseline:
```

- [ ] **Step 3: Commit the completed receive-side refactor**

```bash
git add src docs/plans
git commit -m "refactor: establish receive and sync baseline"
```

---

## Implementation Notes

**Updated:** 2026-04-05

Completed so far:

- dependency baseline restored with `npm install`
- `mailboxScope` implemented with dedicated Vitest coverage
- `mailboxActions` implemented and wired into `mailStore.ts`
- `mailboxContextActions` extracted from `AppShell.svelte` for delete, archive, move, and failure handling
- `syncOrchestrator` implemented and wired into `AppShell.svelte`
- internal `eventBus.emitAsync()` added so sync intent callers can await orchestrated sync completion
- `autoSyncLifecycle` extracted from `AppShell.svelte` with dedicated lifecycle regression coverage
- `mailStore.ts` now normalizes aggregate inbox selection when switching to non-inbox folders
- `src/lib/mailbox/mailboxStore.ts` is now the runtime owner for mailbox query state
- `src/lib/stores/mailStore.ts` is now a facade over `src/lib/mailbox/mailboxStore.ts`
- `AppShell.svelte` account selection no longer forces an extra direct `loadMails()` call
- `Sidebar` refresh now emits `sync:trigger` intent, including explicit account-scoped refresh
- `AppShell.svelte` keyboard refresh shortcut now emits `sync:trigger` instead of directly calling `syncAllAccounts()`
- `AppShell` runtime bootstrap extracted into `src/lib/components/layout/appShellRuntime.ts`
- `AppShell` single-key shortcut binding extracted into `src/lib/components/layout/appShellShortcuts.ts` with focused Vitest coverage
- `AppShell` mailbox navigation handlers extracted into `src/lib/components/layout/appShellMailboxNavigation.ts`
- `AppShell` layout state extracted into `src/lib/components/layout/appShellLayout.ts`
- keyboard mail stepping extracted into `src/lib/components/layout/appShellMailSelection.ts`
- selected-mail resolution extracted into `src/lib/components/layout/appShellSelectedMail.ts`
- stale selected-mail cleanup extracted into `src/lib/components/layout/appShellSelectedMailLifecycle.ts`
- read/unread action wiring extracted into `src/lib/components/layout/appShellReadState.ts`
- ReadingPane archive/delete/star action wiring extracted into `src/lib/components/layout/readingPaneMailActions.ts`
- ReadingPane compose/reply lifecycle extracted into `src/lib/components/layout/readingPaneComposeState.ts`
- AppShell store subscription mirroring extracted into `src/lib/components/layout/appShellStoreMirrors.ts`
- Sidebar store subscription mirroring extracted into `src/lib/components/layout/sidebarStoreMirrors.ts`
- Sidebar refresh intent extracted into `src/lib/components/layout/sidebarRefresh.ts`
- Sidebar compose state extracted into `src/lib/components/layout/sidebarComposeState.ts`
- Sidebar navigation gating extracted into `src/lib/components/layout/sidebarNavigation.ts`
- Sidebar unavailable-account interactions now surface onboarding feedback for compose and folder clicks instead of becoming dead disabled controls
- Sidebar disabled-feedback timing extracted into `src/lib/components/layout/sidebarDisabledFeedback.ts`
- Sidebar accounts collapse persistence extracted into `src/lib/components/layout/sidebarAccountsCollapse.ts`
- Sidebar compose-open event binding extracted into `src/lib/components/layout/sidebarComposeEvents.ts`
- `AppShell.mailbox.test.ts` now covers settings-entry workflow integration for both `GetStarted` and `Sidebar`
- `AppShell.mailbox.test.ts` now also covers desktop mailbox-context switching clearing stale list selection and ReadingPane state when the user changes folders or accounts
- `AppShell.mobile-workflow.test.ts` now covers `list -> reading -> back`, the stale-selected-mail return-to-list flow on mobile, and mobile sidebar folder/account transitions back into the mailbox list
- `Sidebar.sync-workflow.test.ts` now covers `refresh -> sync:trigger -> sync orchestrator -> mails:updated -> mailbox reload` for aggregate and explicit-account mailbox scopes
- `AppShell.selection-workflow.test.ts` now covers desktop continuous-reading selection for list-side delete, ReadingPane delete, ReadingPane archive, and the fallback-to-previous path when the removed selection was the last visible mail
- `ReadingPane` delete and archive actions now share the same selected-mail continuity hint path, and the workflow tests verify that desktop reading either advances to the next visible mail or falls back to the previous visible mail when it was the last item
- focused frontend regression suite now passes at 34 files / 130 tests

Still open from this plan:

- expand the focused workflow tests into broader UI integration coverage
