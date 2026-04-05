# Interaction Optimization Implementation Plan

> **Status note (2026-04-05):** This plan captured the interaction-optimization rollout, but it no longer defines the active refactor path for mailbox scope, refresh orchestration, or read-state correctness. Use the 2026-04-05 receive/sync baseline refactor docs for current work.

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Optimize four key interaction pain points: read status sync, collapsible account list, eliminate switching delay, and refine active item styling.

**Architecture:**
1. Rust backend adds IMAP flag storage capability
2. Frontend uses optimistic UI updates with background sync
3. CSS transitions minimized to 150ms for instant perceived performance
4. Svelte 5 reactive stores handle state changes without blocking

**Tech Stack:**
- Rust (Tauri v2) - IMAP client, Tauri commands
- Svelte 5 with runes - Frontend components
- Tailwind CSS v4 - Styling
- SQLite - Local database

---

## Task 1: Add IMAP Flag Storage to Rust Backend

**Files:**
- Modify: `src-tauri/src/imap_client.rs`

**Step 1: Add store_flags method to ImapClient**

Add this method after the `fetch_emails_blocking` method (around line 371):

```rust
/// Store FLAGS on the IMAP server (e.g., mark as read/unread)
pub async fn store_flags(&self, folder: &str, uid: u32, flags: &str) -> Result<()> {
    let config = self.config.clone();
    let email = self.email.clone();
    let password = self.password.clone();
    let folder = folder.to_string();
    let flags = flags.to_string();

    tokio::task::spawn_blocking(move || {
        Self::store_flags_blocking(config, email, password, &folder, uid, &flags)
    })
    .await
    .map_err(|e| ImapError::FetchFailed(format!("Store flags task panicked: {}", e)))?
}

/// Store flags using blocking IMAP
fn store_flags_blocking(
    config: ImapConfig,
    email: String,
    password: String,
    folder: &str,
    uid: u32,
    flags: &str,
) -> Result<()> {
    let mut session = Self::connect_and_login(&config, &email, &password)?;

    println!("[IMAP] Selecting folder '{}' for flag store...", folder);
    session
        .select(folder)
        .map_err(|e| ImapError::Protocol(format!("Failed to select folder '{}': {}", folder, e)))?;

    println!("[IMAP] Storing flags '{}' for UID {}...", flags, uid);
    let uid_str = uid.to_string();
    session
        .store(&uid_str, flags)
        .map_err(|e| ImapError::Protocol(format!("Failed to store flags: {}", e)))?;

    println!("[IMAP] Flags stored successfully for UID {}", uid);
    let _ = session.logout();
    Ok(())
}
```

**Step 2: Compile check**

Run: `cargo check --manifest-path src-tauri/Cargo.toml`
Expected: No errors

**Step 3: Commit**

```bash
git add src-tauri/src/imap_client.rs
git commit -m "feat: add IMAP flag storage capability"
```

---

## Task 2: Add Tauri Command for Server-Side Read Status

**Files:**
- Modify: `src-tauri/src/commands.rs`
- Modify: `src-tauri/src/lib.rs` (to register the command)

**Step 1: Add mark_mail_read_on_server command**

Add this function after the `mark_mail_read` function (after line 84):

```rust
/// Mark a mail as read on the IMAP server
#[tauri::command]
pub async fn mark_mail_read_on_server(
    id: String,
    account_id: String,
    db: State<'_, Database>,
    account_manager: State<'_, Arc<AccountManager>>,
    credential_manager: State<'_, Arc<CredentialManager>>,
) -> Result<(), String> {
    // Get the mail from database to retrieve UID
    let mail = db
        .inner()
        .get_mail(&id)
        .map_err(|e| format!("Failed to get mail: {}", e))?
        .ok_or_else(|| format!("Mail with id '{}' not found", id))?;

    // Get account credentials
    let account = account_manager
        .get(&account_id)
        .map_err(|e| format!("Failed to get account: {}", e))?;

    let password = credential_manager
        .get_password(&account_id)
        .map_err(|e| format!("Failed to get password: {}", e))?;

    let imap_config = account_manager
        .get_imap_config(&account_id)
        .map_err(|e| format!("Failed to get IMAP config: {}", e))?;

    // Extract UID from mail ID (reverse of generate_id)
    // For simplicity, we'll store the UID in the database or derive it
    // For now, we need to add a uid field to the Mail struct
    // This is a limitation - we'll need to track UID separately

    // Update local database
    db.inner()
        .mark_mail_read(&id, true)
        .map_err(|e| format!("Failed to mark mail as read locally: {}", e))?;

    Ok(())
}
```

**Step 2: Register the command in lib.rs**

Add the command to the invoke_handler in `src-tauri/src/lib.rs`:

Find the invoke_handler block and add:
```rust
mark_mail_read_on_server,
```

**Step 3: Compile check**

Run: `cargo check --manifest-path src-tauri/Cargo.toml`
Expected: No errors

**Step 4: Commit**

```bash
git add src-tauri/src/commands.rs src-tauri/src/lib.rs
git commit -m "feat: add mark_mail_read_on_server Tauri command"
```

---

## Task 3: Add UID Field to Mail Struct for Flag Sync

**Files:**
- Modify: `src-tauri/src/database.rs`

**Step 1: Add uid field to Mail struct**

Find the Mail struct definition and add the uid field:

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Mail {
    pub id: String,
    pub uid: Option<u32>,  // Add this line - IMAP UID for flag operations
    pub from_name: String,
    pub from_email: String,
    pub subject: String,
    pub preview: String,
    pub body: String,
    pub html_body: Option<String>,
    pub timestamp: i64,
    pub folder: String,
    pub unread: bool,
    pub account_id: Option<String>,
    pub to: Option<Vec<EmailAddress>>,
    pub cc: Option<Vec<EmailAddress>>,
    pub bcc: Option<Vec<EmailAddress>>,
    pub reply_to: Option<Vec<EmailAddress>>,
    pub attachments: Option<Vec<Attachment>>,
    pub starred: Option<bool>,
    pub has_attachments: Option<bool>,
}
```

**Step 2: Update insert_mail to include uid**

Modify the insert_mail function to handle the uid field. Update all INSERT statements to include `uid` column.

**Step 3: Update ImapClient to set uid when parsing**

In `imap_client.rs`, modify the `parse_fetch_response` function to include the uid:

```rust
Ok(Mail {
    id,
    uid: Some(uid),  // Add this line
    from_name,
    from_email,
    // ... rest of fields
})
```

**Step 4: Update mark_mail_read_on_server to use uid**

Go back to `commands.rs` and update the function:

```rust
/// Mark a mail as read on the IMAP server
#[tauri::command]
pub async fn mark_mail_read_on_server(
    id: String,
    account_id: String,
    db: State<'_, Database>,
    account_manager: State<'_, Arc<AccountManager>>,
    credential_manager: State<'_, Arc<CredentialManager>>,
) -> Result<(), String> {
    // Get the mail from database
    let mail = db
        .inner()
        .get_mail(&id)
        .map_err(|e| format!("Failed to get mail: {}", e))?
        .ok_or_else(|| format!("Mail with id '{}' not found", id))?;

    let uid = mail.uid.ok_or_else(|| format!("Mail {} has no UID", id))?;

    // Get account credentials
    let account = account_manager
        .get(&account_id)
        .map_err(|e| format!("Failed to get account: {}", e))?;

    let password = credential_manager
        .get_password(&account_id)
        .map_err(|e| format!("Failed to get password: {}", e))?;

    let imap_config = account_manager
        .get_imap_config(&account_id)
        .map_err(|e| format!("Failed to get IMAP config: {}", e))?;

    // Create IMAP client and store the flag
    let imap_client = ImapClient::new(imap_config, account.email, password);
    imap_client
        .store_flags(&mail.folder, uid, "+FLAGS (\\Seen)")
        .await
        .map_err(|e| format!("Failed to store flags on server: {}", e))?;

    // Update local database
    db.inner()
        .mark_mail_read(&id, true)
        .map_err(|e| format!("Failed to mark mail as read locally: {}", e))?;

    Ok(())
}
```

**Step 5: Update TypeScript types**

**File:** `src/lib/types.ts`

Add uid field to Mail interface:

```typescript
export interface Mail {
	id: string;
	uid?: number;  // Add this line
	from_name: string;
	from_email: string;
	subject: string;
	preview: string;
	body: string;
	html_body?: string;
	timestamp: number;
	folder: Folder;
	unread: boolean;
	account_id?: string;
	to?: EmailAddress[];
	cc?: EmailAddress[];
	bcc?: EmailAddress[];
	reply_to?: EmailAddress[];
	attachments?: Attachment[];
	starred?: boolean;
	has_attachments?: boolean;
}
```

**Step 6: Compile check**

Run: `npm run check`
Expected: No type errors

**Step 7: Commit**

```bash
git add src-tauri/src/database.rs src-tauri/src/commands.rs src-tauri/src/imap_client.rs src/lib/types.ts
git commit -m "feat: add uid field to Mail for IMAP flag sync"
```

---

## Task 4: Add Frontend Function for Server-Side Read Sync

**Files:**
- Modify: `src/lib/db/index.ts`

**Step 1: Add markMailReadOnServer function**

Add this function after the `markMailRead` function:

```typescript
/**
 * Mark a mail as read on the IMAP server (syncs \Seen flag)
 */
export async function markMailReadOnServer(id: string, accountId: string): Promise<void> {
	await invoke('mark_mail_read_on_server', { id, account_id: accountId });
}
```

**Step 2: Type check**

Run: `npm run check`
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/db/index.ts
git commit -m "feat: add markMailReadOnServer frontend function"
```

---

## Task 5: Integrate Server Read Sync into Mail List Click Handler

**Files:**
- Modify: `src/lib/components/layout/MailList.svelte` (or wherever mail selection is handled)

**Step 1: Update onSelectMail handler**

Find the component that handles mail selection and update it to call the server sync:

```svelte
<script lang="ts">
import { markMailReadOnServer } from '$lib/db/index.js';

// ... existing code

async function handleSelectMail(mailId: string) {
    const mail = displayedMails.find(m => m.id === mailId);
    if (!mail) return;

    // Immediate UI update - select the mail
    onSelectMail(mailId);

    // If mail is unread and has an account, sync to server in background
    if (mail.unread && mail.account_id) {
        markMailReadOnServer(mailId, mail.account_id).catch(e => {
            console.error('Failed to mark as read on server:', e);
            // Silent fail - UI already updated, will sync on next full sync
        });
    }
}
</script>
```

**Step 2: Update onclick to use new handler**

```svelte
<button onclick={() => handleSelectMail(mail.id)}>
```

**Step 3: Type check**

Run: `npm run check`
Expected: No errors

**Step 4: Commit**

```bash
git add src/lib/components/layout/MailList.svelte
git commit -m "feat: sync read status to IMAP server on mail open"
```

---

## Task 6: Add Collapsible State to Sidebar Account List

**Files:**
- Modify: `src/lib/components/layout/Sidebar.svelte`

**Step 1: Add collapse state**

Add after the existing state declarations (around line 58):

```svelte
let accountsCollapsed = $state(false);

function toggleAccountsCollapse() {
    accountsCollapsed = !accountsCollapsed;
}
```

**Step 2: Persist collapse state to localStorage**

Add effect after the existing effects:

```svelte
// Load collapse state from localStorage
$effect(() => {
    const saved = localStorage.getItem('sidebar-accounts-collapsed');
    if (saved !== null) {
        accountsCollapsed = saved === 'true';
    }
});

// Save collapse state to localStorage
$effect(() => {
    localStorage.setItem('sidebar-accounts-collapsed', String(accountsCollapsed));
});
```

**Step 3: Update "All Inboxes" button to be clickable**

Replace the "All Inboxes" button (lines 266-287):

```svelte
<!-- "All Inboxes" option with collapse toggle -->
<button
    onclick={() => {
        if (selectedAccountId !== null) {
            handleAccountClick(null);
        }
        toggleAccountsCollapse();
    }}
    class={cn(
        "flex items-center gap-2 px-3 py-2 rounded-md mx-2 mt-1 relative z-10",
        "transition-[background-color] duration-150",
        selectedAccountId === null
            ? "bg-zinc-100 text-zinc-900"
            : "hover:bg-zinc-50 text-zinc-600"
    )}
    title="All Inboxes"
>
    <div class="flex size-7 items-center justify-center rounded-md bg-zinc-200 text-zinc-600 relative">
        <Layers class="size-[15px]" strokeWidth={1.5} />
        <!-- Collapse/expand chevron -->
        {#if hasMultipleAccounts}
            <div class="absolute -bottom-0.5 -right-0.5 size-3 bg-white rounded-full flex items-center justify-center shadow-sm">
                {#if accountsCollapsed}
                    <span class="text-[8px] text-zinc-500 leading-none">▶</span>
                {:else}
                    <span class="text-[8px] text-zinc-500 leading-none">▼</span>
                {/if}
            </div>
        {/if}
    </div>
    <div class="flex-1 min-w-0 text-left">
        <p class="text-sm font-medium truncate">All Inboxes</p>
        {#if formattedLastSync && selectedAccountId === null}
            <p class="text-[10px] text-zinc-400">
                {formattedLastSync}
            </p>
        {/if}
    </div>
</button>
```

**Step 4: Wrap account list in collapsible container**

Wrap the individual accounts section (lines 289-315):

```svelte
<!-- Individual accounts - collapsible -->
<div
    class={cn(
        "overflow-hidden transition-[max-height] duration-200 ease-in-out",
        accountsCollapsed ? "max-h-0" : "max-h-[500px]"
    )}
>
    {#each allAccounts as account}
        <button
            onclick={() => handleAccountClick(account.id)}
            class={cn(
                "flex items-center gap-2 px-3 py-2 rounded-md mx-1 relative z-10",
                "transition-[background-color] duration-150",
                selectedAccountId === account.id
                    ? "bg-zinc-100 text-zinc-900"
                    : "hover:bg-zinc-50 text-zinc-600"
            )}
            title={account.email}
        >
            <!-- existing account button content -->
        </button>
    {/each}
</div>
```

**Step 5: Type check**

Run: `npm run check`
Expected: No errors

**Step 6: Commit**

```bash
git add src/lib/components/layout/Sidebar.svelte
git commit -m "feat: add collapsible account list to sidebar"
```

---

## Task 7: Optimize Sidebar Item Transitions

**Files:**
- Modify: `src/lib/components/layout/Sidebar.svelte`

**Step 1: Replace all transition-all with specific transitions**

Find and replace all instances of `transition-colors` or `transition-all` in the sidebar:

1. Account buttons (line 269, 294):
   - Change: `"transition-colors"`
   - To: `"transition-[background-color] duration-150"`

2. Navigation items (line 366):
   - Already has no transition class, keep as is

3. Settings button (line 395, 457):
   - Keep `transition-all duration-200` for the rotate animation (this is fine)

4. Compose button (line 246):
   - Keep `transition-all duration-200` for the hover effect (this is fine)

**Step 2: Type check**

Run: `npm run check`
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/components/layout/Sidebar.svelte
git commit -m "perf: optimize sidebar item transitions to 150ms"
```

---

## Task 8: Update MailList Active Item Styling

**Files:**
- Modify: `src/lib/components/layout/MailList.svelte`

**Step 1: Update mail item button styling**

Replace the button class (lines 218-224):

```svelte
<button
    class={cn(
        'group relative flex w-full items-start gap-3 border-b border-zinc-50',
        'transition-[background-color] duration-150',
        'px-5 py-4',
        mail.id === selectedMailId
            ? 'bg-zinc-100 border-transparent'
            : 'hover:bg-zinc-50'
    )}
    onclick={() => onSelectMail(mail.id)}
>
```

**Step 2: Update left indicator bar styling**

Replace the left indicator div (lines 228-230):

```svelte
{#if mail.id === selectedMailId}
    <div class="absolute left-0 top-2 bottom-2 w-[2px] bg-blue-500 rounded-full"></div>
{/if}
```

**Step 3: Type check**

Run: `npm run check`
Expected: No errors

**Step 4: Commit**

```bash
git add src/lib/components/layout/MailList.svelte
git commit -m "style: refine mail list active item appearance"
```

---

## Task 9: Verify mailStore setSelectedAccount is Non-Blocking

**Files:**
- Modify: `src/lib/stores/mailStore.ts`

**Step 1: Review current implementation**

The current implementation should already be non-blocking. Verify:

```typescript
export function setSelectedAccount(accountId: string | null): void {
  _selectedAccountId.set(accountId);  // Immediate state update
  const currentFolder = get(_activeFolder);
  loadMails(currentFolder).catch(e => {  // Async, doesn't block
    console.error('Failed to reload mails after account switch:', e);
  });
}
```

If this is already the case, no changes needed. The `.catch()` ensures the async operation doesn't block.

**Step 2: If needed, update to be non-blocking**

If the current implementation has `await` or blocks, update it:

```typescript
export function setSelectedAccount(accountId: string | null): void {
  // 1. Immediate state update (UI responds instantly)
  _selectedAccountId.set(accountId);

  // 2. Async data load (doesn't block UI)
  const currentFolder = get(_activeFolder);
  loadMails(currentFolder).catch(e => {
    console.error('Failed to reload mails after account switch:', e);
  });
}
```

**Step 3: Type check**

Run: `npm run check`
Expected: No errors

**Step 4: Commit (if changes made)**

```bash
git add src/lib/stores/mailStore.ts
git commit -m "perf: ensure account switching is non-blocking"
```

---

## Task 10: Final Testing and Verification

**Step 1: Build and run the application**

Run: `npm run tauri dev`

**Step 2: Test read status sync**

1. Open an unread email
2. Verify the unread dot disappears immediately
3. Check with another email client that the \Seen flag was set on the server

**Step 3: Test collapsible account list**

1. Click the chevron on "All Inboxes"
2. Verify the account list collapses smoothly
3. Click again to expand
4. Refresh page - verify collapse state persists

**Step 4: Test account switching performance**

1. Click between different accounts
2. Verify the highlight appears instantly (<100ms)
3. Verify the mail list updates smoothly

**Step 5: Test mail list active item styling**

1. Select different emails
2. Verify the active item has clean bg-zinc-100 appearance
3. Verify the left indicator has proper vertical margin
4. Verify no heavy shadow

**Step 6: Create final commit**

```bash
git add -A
git commit -m "chore: complete interaction optimization implementation"
```

---

## Summary of Changes

### Rust Backend
1. Added `store_flags()` method to `ImapClient` for IMAP flag operations
2. Added `mark_mail_read_on_server` Tauri command
3. Added `uid` field to `Mail` struct for tracking IMAP UIDs

### Frontend State
1. Verified `mailStore.setSelectedAccount` is non-blocking
2. Added `markMailReadOnServer` function to db API

### Components
1. **Sidebar.svelte**: Added collapsible account list with chevron indicator
2. **Sidebar.svelte**: Optimized transitions to 150ms for background-color only
3. **MailList.svelte**: Updated active item styling to remove shadow-inner and use solid bg-zinc-100
4. **MailList.svelte**: Added left indicator vertical margin (top-2 bottom-2)
5. **MailList.svelte**: Integrated server-side read sync on mail selection

### TypeScript Types
1. Added `uid?: number` field to Mail interface

---

## Dependencies

- None required - uses existing dependencies

---

## Rollback Plan

If issues arise:
1. Revert commits: `git reset --hard HEAD~10`
2. All changes are additive except the uid field addition
3. Database migration may be needed if uid field was added to existing schema
