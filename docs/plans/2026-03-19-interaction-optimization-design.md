# Interaction Optimization Design

**Date:** 2026-03-19
**Status:** Approved
**Priority:** High

## Overview

Optimize four key interaction pain points in the Mailx email client:
1. Read status synchronization with IMAP server
2. Collapsible account list in sidebar
3. Eliminate account switching delay
4. Refine mail list active item styling

## Design Principles

- **UI fluidity first**: All UI updates must be immediate, optimistic
- **Async background work**: Server sync and DB queries must not block the UI
- **Progressive enhancement**: Local state updates immediately, server sync happens in background

---

## 1. Read Status Synchronization

### Current State

- IMAP sync uses `BODY.PEEK[]` (correct - doesn't mark as read)
- `mark_mail_read` command only updates local SQLite
- No IMAP `\Seen` flag sync to server

### Proposed Solution

```
User clicks email
    ↓
Immediate UI update (optimistic)
    ↓
Parallel async operations:
  1. Call Rust: mark_read_on_server(mailId) → sends +FLAGS (\Seen) to IMAP
  2. Update SQLite: unread = false
  3. Refresh unread count badge
```

### Implementation Details

**Rust (`imap_client.rs`):**
```rust
/// Store FLAGS on the IMAP server (e.g., mark as read/unread)
pub async fn store_flags(&self, folder: &str, uid: u32, flags: &str) -> Result<()> {
    // Send STORE command to set flags
    // Example: STORE uid +FLAGS (\Seen)
}
```

**Tauri Command (`commands.rs`):**
```rust
#[tauri::command]
pub async fn mark_mail_read_on_server(
    id: String,
    account_id: String,
    db: State<'_, Database>,
    account_manager: State<'_, Arc<AccountManager>>,
    credential_manager: State<'_, Arc<CredentialManager>>,
) -> Result<(), String> {
    // Get mail from DB to retrieve UID
    // Get account credentials
    // Connect to IMAP and store +FLAGS (\Seen)
    // Update local DB
}
```

**Frontend:**
- Call `mark_mail_read_on_server` when user clicks mail
- Use `$effect` to update UI immediately, don't await the async call

---

## 2. Collapsible Account List

### Current State

- "All Inboxes" and account list are always visible
- Takes up significant sidebar space with multiple accounts

### Proposed Solution

```
Expanded State:
┌─────────────────────┐
│ [▼] All Inboxes     │  ← Click to collapse
├─────────────────────┤
│   👤 Account 1      │
│   👤 Account 2      │
│   👤 Account 3      │
└─────────────────────┘

Collapsed State:
┌─────────────────────┐
│ [▶] All Inboxes     │  ← Click to expand
└─────────────────────┘
```

### Implementation Details

**State (`Sidebar.svelte`):**
```typescript
let accountsCollapsed = $state(false);

function toggleAccountsCollapse() {
    accountsCollapsed = !accountsCollapsed;
}
```

**UI Changes:**
- Add collapse/expand icon (ChevronDown/ChevronRight)
- Wrap account list in collapsible container
- Add `max-h-0 overflow-hidden` transition for collapsed state
- Persist collapse state to localStorage

---

## 3. Eliminate Account Switching Delay

### Current State

```typescript
// mailStore.ts - CURRENT (blocking)
export function setSelectedAccount(accountId: string | null): void {
  _selectedAccountId.set(accountId);
  // This blocks UI!
  loadMails(currentFolder).catch(...);
}
```

- `loadMails()` is async but called synchronously
- Database query delays highlight state update
- User sees ~1s delay before visual feedback

### Proposed Solution

```typescript
// mailStore.ts - OPTIMIZED
export function setSelectedAccount(accountId: string | null): void {
  // 1. Immediate state update (UI responds instantly)
  _selectedAccountId.set(accountId);

  // 2. Async data load (doesn't block UI)
  loadMails(get(_activeFolder)).catch(e => {
    console.error('Failed to reload mails:', e);
  });
}
```

**Key Insight:** Svelte's reactive store already handles this correctly. The issue is likely:
1. CSS transitions slowing down visual feedback
2. Unnecessary re-renders during state change

### CSS Optimization

**Remove:**
- `transition-all duration-200` on sidebar items

**Replace with:**
- `transition-[background-color] duration-150` (only animate background)

**Sidebar Item:**
```svelte
<button
    class={cn(
        "flex items-center gap-2 px-3 py-2 rounded-md",
        "transition-[background-color] duration-150",  // precise transition
        selectedAccountId === account.id
            ? "bg-zinc-100 text-zinc-900"
            : "hover:bg-zinc-50 text-zinc-600"
    )}
>
```

---

## 4. Mail List Active Item Styling

### Current State

```svelte
mail.id === selectedMailId
    ? 'bg-zinc-100/80 shadow-inner'  // ← Too heavy
    : 'hover:bg-zinc-50'
```

- Semi-transparent background looks muddy
- `shadow-inner` adds unnecessary visual weight

### Proposed Solution

```svelte
<div class={cn(
    'relative flex w-full items-start gap-3',
    'border-b border-zinc-50',           // subtle bottom border
    'transition-[background-color] duration-150',  // precise transition
    mail.id === selectedMailId
        ? 'bg-zinc-100 border-transparent'  // solid bg, no border when selected
        : 'hover:bg-zinc-50',
    'px-5 py-4'
)}>
    <!-- Left indicator with vertical margin -->
    {#if mail.id === selectedMailId}
        <div class="absolute left-0 top-2 bottom-2 w-[2px] bg-blue-500 rounded-full"></div>
    {/if}
    <!-- content -->
</div>
```

**Key Changes:**
1. `bg-zinc-100/80` → `bg-zinc-100` (pure, solid color)
2. Remove `shadow-inner` entirely
3. Add `top-2 bottom-2` to left indicator (vertical breathing room)
4. Add `border-transparent` when selected (seamless look)
5. Use `transition-[background-color] duration-150` instead of generic `transition-colors`

---

## Files to Modify

### Rust Backend
- `src-tauri/src/imap_client.rs` - Add `store_flags()` method
- `src-tauri/src/commands.rs` - Add `mark_mail_read_on_server` command

### Frontend State
- `src/lib/stores/mailStore.ts` - Verify `setSelectedAccount` is non-blocking
- `src/lib/db/index.ts` - Add `markMailReadOnServer` function

### Components
- `src/lib/components/layout/Sidebar.svelte` - Collapsible account list
- `src/lib/components/layout/MailList.svelte` - Active item styling

---

## Testing Checklist

- [ ] Clicking mail immediately shows selected state
- [ ] Unread dot disappears immediately when mail is opened
- [ ] IMAP server receives `\Seen` flag (verify with another client)
- [ ] Account list collapses/expands smoothly
- [ ] Account switching highlight is instant (<100ms perceived)
- [ ] Mail list active item has clean, lightweight appearance
- [ ] All transitions complete within 150ms

---

## Migration Notes

- No database migration required
- New Tauri command is additive (no breaking changes)
- CSS changes are visual-only (safe to deploy)

