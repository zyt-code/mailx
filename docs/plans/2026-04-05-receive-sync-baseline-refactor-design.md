# Receive/Sync Baseline Refactor Design

**Date:** 2026-04-05
**Status:** Implementation In Progress
**Owner:** Codex + User Collaboration
**Supersedes in Part:** `2026-03-17-event-driven-sync-design.md`, `2026-03-17-event-driven-sync-implementation.md`, `2026-03-19-interaction-optimization-design.md`, `2026-03-19-interaction-optimization.md`

---

## Why This Refactor Exists

Mailx already contains working pieces for account management, sync, unread counters, IMAP read-state updates, and mailbox rendering, but the receive-side architecture is not strong enough for a professional mail client baseline.

The current implementation mixes four concerns in the same runtime path:

1. View orchestration in `AppShell.svelte`
2. Mail query state and fallback logic in `mailStore.ts`
3. Sync trigger wiring and notifications in `syncHandlers.ts`
4. Background persistence and optimistic updates inside ad-hoc component flows

That coupling produces behavior that is hard to reason about:

- Account scope is implicit in too many places
- Folder transitions and mailbox transitions are not modeled as one state change
- Refresh and sync can be triggered from multiple layers
- Read-state updates are optimistic, but failure handling is not clearly owned
- TDD at the workflow level is hard because the state boundaries are blurry

This design makes the receive/sync path explicit before any additional feature work continues.

---

## Goals

1. Establish one authoritative mailbox-view model for `folder + account selection + effective account scope`.
2. Make account switching, folder switching, refresh, and unread/read transitions deterministic.
3. Separate sync orchestration from sync notifications.
4. Preserve the current UI surface where possible so the refactor can land incrementally.
5. Add workflow-oriented TDD coverage that protects the professional baseline.

## Non-Goals

1. Rewrite compose, draft, send, or attachment flows in this phase.
2. Redesign the visual system or replace existing Svelte component structure wholesale.
3. Replace the current Rust sync backend architecture.
4. Solve every notification concern beyond the receive/sync boundaries.

---

## Current Root-Cause Findings

### 1. `AppShell.svelte` owns too much behavior

`AppShell.svelte` currently initializes stores, runs account-change auto-sync, manages timers, applies mailbox selection logic, handles refresh behavior, and coordinates keyboard shortcuts. It is acting as a layout component and a workflow controller at the same time.

### 2. `mailStore.ts` is both query state and command layer

`mailStore.ts` currently owns:

- mailbox query state
- folder/account fallback rules
- pagination
- Tauri event subscriptions
- optimistic read/unread updates
- DB persistence side effects

That makes the module difficult to test at the behavior-contract level.

### 3. Sync orchestration and sync UX are coupled

`syncHandlers.ts` currently wires `sync:trigger` to backend commands and also handles toast/system notification behavior. A professional client needs the sync trigger path to be reliable even if notification behavior changes.

### 4. Aggregate inbox behavior is under-modeled

`selectedAccountId = null` is overloaded today. The intended rule is "All Inboxes only for Inbox", but the code still relies on fallback logic in multiple places instead of an explicit mailbox-scope contract.

---

## Target Architecture

The refactor introduces four explicit layers.

### 1. `mailboxScope`

**Purpose:** Pure mailbox scope rules with no side effects.

**Planned file:**
- `src/lib/mailbox/mailboxScope.ts`

**Responsibilities:**
- resolve fallback account
- resolve effective account for a given folder
- normalize illegal aggregate states when leaving inbox

This layer is pure and gets the first TDD coverage because it defines the contract for the rest of the receive-side stack.

### 2. `mailboxStore`

**Purpose:** Query-state owner for the currently visible mailbox.

**Planned files:**
- `src/lib/mailbox/mailboxStore.ts`
- `src/lib/stores/mailStore.ts` as compatibility facade during migration

**Responsibilities:**
- hold mailbox view state
- load/reload paginated mail data
- expose displayed mails, loading flags, errors, total counts
- react to account-created/account-updated/account-deleted and `mails:updated`
- own state transitions for folder/account changes through explicit entry points

It does **not** own sync command invocation and does **not** own notification UX.

### 3. `mailboxActions`

**Purpose:** Side-effecting mail actions for the receive-side view.

**Planned file:**
- `src/lib/mailbox/mailboxActions.ts`

**Responsibilities:**
- optimistic read/unread transitions
- local DB persistence
- optional remote IMAP read sync entry point
- rollback or reload behavior on persistence failure

This isolates command behavior from the query store.

### 4. `syncOrchestrator`

**Purpose:** Single owner of receive-side sync triggering.

**Planned file:**
- `src/lib/sync/syncOrchestrator.ts`

**Responsibilities:**
- translate frontend intent (`sync:trigger`) into `syncAccount` / `syncAllAccounts`
- choose active-account sync versus all-account sync
- keep notification behavior out of the trigger path

`syncHandlers.ts` remains as a notification adapter only, or becomes a thinner UX-only wrapper if still needed.

---

## State Contracts

### Mailbox View Contract

The receive-side UI will be driven by one explicit state shape:

```ts
interface MailboxViewState {
  folder: Folder;
  selectedAccountId: string | null;
  effectiveAccountId: string | null;
  items: Mail[];
  totalCount: number;
  hasMore: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
}
```

### Mailbox Scope Rules

These rules become source-of-truth behavior:

1. `selectedAccountId = null` is valid only for the `inbox` aggregate view.
2. If the user leaves `inbox` while in aggregate mode, the state normalizes to an explicit fallback account.
3. `effectiveAccountId` is always explicit for `sent`, `drafts`, `archive`, and `trash`.
4. Deleted-account fallback is handled centrally by mailbox state, not by arbitrary component logic.

### Sync Contract

1. UI components emit intent; they do not decide sync strategy.
2. Sync state remains in `syncStore.ts`.
3. Sync notifications are not allowed to own sync trigger behavior.

### Read-State Contract

1. Read/unread changes update the local mailbox state immediately.
2. Local persistence is attempted in the background.
3. Persistence failure must produce deterministic correction:
   - either rollback the local state
   - or trigger a scoped reload
4. Unread counters must stay consistent with the final corrected state.

---

## Migration Strategy

The refactor is intentionally incremental.

### Stage 1: Build new receive-side primitives

- add `mailboxScope.ts`
- add `mailboxStore.ts`
- add `mailboxActions.ts`
- add `syncOrchestrator.ts`

### Stage 2: Convert existing public store surface

`src/lib/stores/mailStore.ts` remains temporarily as a compatibility facade so the rest of the app does not need a big-bang rename.

The compatibility facade will continue exporting:

- `displayedEmails`
- `activeFolder`
- `selectedAccountId`
- `loadMails`
- `loadMoreMails`
- `switchFolder`
- `setSelectedAccount`
- `markMailReadLocally`
- `markMailUnreadLocally`

Internally, those exports will delegate to the new mailbox modules.

### Stage 3: Thin `AppShell.svelte`

`AppShell.svelte` will stop owning mailbox business logic and will instead:

- render layout
- dispatch user intent
- subscribe to mailbox/sync state

### Stage 4: Thin sync UX adapter

`syncHandlers.ts` will keep user-facing notification behavior only. Sync trigger plumbing moves to `syncOrchestrator.ts`.

---

## TDD Strategy

This phase uses workflow-first TDD, not only unit TDD.

### Test Layer 1: Pure Contract Tests

Add pure tests for mailbox scope rules:

- aggregate inbox resolves to all accounts
- non-inbox aggregate normalizes to active/fallback account
- explicit account selection is preserved
- deleted-account fallback is deterministic

### Test Layer 2: Store Contract Tests

Add store-level tests for mailbox state transitions:

- switching folders updates explicit effective account scope
- switching accounts reloads the mailbox once through one state transition
- `mails:updated` reloads the current mailbox view
- deleted-account events clear illegal selections

### Test Layer 3: Action Contract Tests

Add tests for optimistic read/unread transitions:

- local state changes immediately
- DB persistence is called with correct arguments
- failure restores or corrects mailbox state
- unread count refresh stays coherent

### Test Layer 4: UI Workflow Tests

Add integration tests around:

1. account switch -> mailbox reload -> list matches selected account
2. leaving aggregate inbox for `sent`/`archive` -> fallback account becomes explicit
3. refresh button -> sync orchestration path -> mailbox reload on `mails:updated`

### Test Layer 5: Rust Contract Coverage

Retain and extend Rust tests only where frontend behavior depends on a backend contract:

- IMAP read flag command path
- UID-based mail lookup
- account-scoped mail retrieval helpers if adjusted

---

## Success Criteria

This phase is complete when all of the following are true:

1. There is one explicit mailbox-scope contract with dedicated tests.
2. `AppShell.svelte` no longer owns mailbox workflow logic.
3. Sync trigger wiring is isolated from notification UX.
4. The receive-side flow is covered by red-green-refactor tests at pure, store, and UI workflow layers.
5. Old sync/interaction docs are clearly marked as historical context rather than the current source of truth.

---

## Risks And Mitigations

### Risk: Compatibility breakage across many imports

**Mitigation:** keep `src/lib/stores/mailStore.ts` as a facade in phase 1.

### Risk: Frontend tests are currently not runnable without local dependencies

**Mitigation:** restore `node_modules` before implementation and make dependency installation the first plan task.

### Risk: Hidden assumptions in unread counters and account fallback

**Mitigation:** write pure contract tests first and only then move store logic behind them.

---

## Documentation Status Note

After this document lands, the following files remain useful for historical context but are no longer authoritative for receive/sync architecture:

- `docs/plans/2026-03-17-event-driven-sync-design.md`
- `docs/plans/2026-03-17-event-driven-sync-implementation.md`
- `docs/plans/2026-03-19-interaction-optimization-design.md`
- `docs/plans/2026-03-19-interaction-optimization.md`

## Implementation Notes

**Updated:** 2026-04-05

Completed in the first refactor pass:

- `mailboxScope` pure contract module and tests
- `mailboxActions` extraction and tests
- `mailboxContextActions` extraction and tests for delete, archive, move, and failure handling
- `syncOrchestrator` extraction and tests
- frontend `sync:trigger` intent is now awaitable, so UI and lifecycle code can wait for orchestration without importing sync commands
- `autoSyncLifecycle` extraction and tests for initial sync, periodic sync gating, and cleanup behavior
- runtime `mailStore` scope normalization when leaving aggregate inbox
- `src/lib/stores/mailStore.ts` migrated into a compatibility facade over `src/lib/mailbox/mailboxStore.ts`
- `AppShell.svelte` no longer forces an extra `loadMails()` on account selection
- `Sidebar` refresh and `AppShell` keyboard refresh now emit `sync:trigger` intent instead of directly invoking sync commands, and the AppShell shortcut now scopes refresh to the currently selected mailbox account when one is explicit
- AppShell runtime initialization now goes through a dedicated `appShellRuntime` entry point
- `AppShell` single-key shortcut binding moved into a dedicated module with focused shortcut tests
- mailbox selection, folder selection, and account-switch resets now go through a dedicated `appShellMailboxNavigation` controller
- AppShell layout persistence, responsive width handling, and resize clamping now go through a dedicated `appShellLayout` controller
- selected-mail stepping now goes through a dedicated `appShellMailSelection` helper
- selected-mail resolution, stale-selection cleanup, and read/unread wiring now go through dedicated AppShell helpers
- AppShell store subscription bridging for `displayedEmails`, `hasAccounts`, and `isSyncing` now goes through a dedicated `appShellStoreMirrors` binder
- ReadingPane archive, delete, and star actions now go through a dedicated mail-action helper
- ReadingPane reply, reply-all, forward, close, and sent-refresh compose state now goes through a dedicated `readingPaneComposeState` helper
- Sidebar store subscription bridging now goes through a dedicated `sidebarStoreMirrors` binder
- Sidebar refresh intent and pending-state gating now go through a dedicated `sidebarRefresh` helper
- Sidebar compose state and navigation gating now go through dedicated `sidebarComposeState` and `sidebarNavigation` helpers
- Sidebar compose and folder affordances now route unavailable-account clicks into onboarding feedback instead of dead disabled controls
- Sidebar onboarding tooltip timing and cleanup now go through a dedicated `sidebarDisabledFeedback` helper
- Sidebar account-list collapse initialization and persistence now go through a dedicated `sidebarAccountsCollapse` helper
- Sidebar compose-open event binding now goes through a dedicated `sidebarComposeEvents` helper
- AppShell workflow integration coverage now verifies both settings-entry routes: `GetStarted -> /settings/accounts/new` when no accounts exist and `Sidebar -> /settings` when accounts are configured
- AppShell mailbox workflow integration coverage now verifies that the keyboard refresh and compose shortcuts are ignored while the app is in a no-account `GetStarted` state
- AppShell mobile workflow integration coverage now verifies `list -> reading -> back`, stale-selected-mail recovery, mobile folder/account navigation back into the mailbox list, ReadingPane delete/archive actions returning mobile users to the mailbox list, and the mobile no-account state rendering `GetStarted` instead of a mailbox shell
- Sidebar refresh workflow integration coverage now verifies `refresh -> sync:trigger -> sync orchestrator -> mails:updated -> mailbox reload` for both aggregate and explicit-account mailbox scopes
- AppShell keyboard refresh workflow integration coverage now verifies `shortcut -> sync:trigger -> sync orchestrator -> mails:updated -> mailbox reload` for both aggregate inbox and explicit-account mailbox scopes
- Sync orchestrator contract coverage now verifies that no-account `sync:trigger` intents are ignored instead of falling through to all-account sync
- Sync orchestrator contract coverage now also verifies that stale explicit `accountId` payloads for deleted accounts are ignored instead of syncing the wrong mailbox
- AppShell auto-sync workflow integration coverage now verifies `active account -> autoSyncLifecycle -> sync:trigger -> sync orchestrator -> mails:updated -> mailbox reload` during initial account activation
- AppShell auto-sync workflow integration coverage now also verifies that when the active account changes during an in-flight sync, the newest account still gets its deferred initial sync once syncing settles
- Mailbox store contract coverage now verifies that deleting the active selected account falls back using the post-delete account set instead of briefly reloading the removed mailbox
- Mailbox scope/store contract coverage now also verifies that stale explicit selected-account ids are normalized back to a real configured account before mailbox reload
- AppShell account lifecycle workflow coverage now verifies desktop selection reset on `account:deleted`, mobile reading fallback to list on `account:deleted`, and `GetStarted -> mailbox list` recovery on `account:created`
- AppShell desktop mailbox workflow coverage now verifies that switching folders or accounts clears stale list selection and Reading Pane state instead of carrying a message across mailbox contexts
- AppShell desktop selection workflow coverage now verifies continuous-reading behavior for list-side delete, ReadingPane delete, ReadingPane archive, the fallback-to-previous case when the removed selection was the last visible mail, and external mailbox updates removing the current selection
- ReadingPane delete and archive continuity now use the same selected-mail removal strategy, so desktop reading actions and list-side actions keep the next visible message selected when possible and fall back to the previous visible message when necessary
- focused frontend regression coverage now verifies 36 Vitest files / 153 tests plus `npm run check`

Still pending in a follow-up pass:

- expanding UI workflow coverage beyond the focused receive-side regressions
- continuing to reduce remaining high-level workflow ownership in `AppShell.svelte` as new seams become obvious under test
