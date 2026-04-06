# Unified IMAP Sync Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a unified metadata-first IMAP sync flow with lazy message body loading for all providers, making iCloud fast without creating a provider-specific sync fork.

**Architecture:** The backend will reuse a single IMAP session per sync pass, persist UID-based folder state, and store metadata rows with explicit content-cache state. The frontend will treat mailbox rows as metadata-first records and request full message content only when the reading pane needs it.

**Tech Stack:** Rust, Tauri v2, rusqlite, imap, Svelte 5, Vitest

---

### Task 1: Document And Lock The New Data Model

**Files:**
- Modify: `docs/plans/2026-04-06-unified-imap-sync-refactor-design.md`
- Modify: `docs/plans/2026-04-06-unified-imap-sync-refactor-implementation.md`

- [ ] **Step 1: Verify the design doc covers sync pipeline, DB state, and lazy loading**

Run: no command; read the design doc and confirm it names `content_state`, `imap_folders`, metadata-first sync, and `ensure_mail_content`.
Expected: the design doc matches the intended implementation boundary.

- [ ] **Step 2: Keep implementation phased**

Implementation rule:

```text
Phase A = schema + local types + provider helpers
Phase B = metadata-first sync + incremental folder state
Phase C = lazy body loading in commands + reading pane
Phase D = verification
```

- [ ] **Step 3: Continue without widening scope**

Implementation rule:

```text
Do not add IMAP IDLE, attachments-on-demand, or QRESYNC in this pass.
```

### Task 2: Add Failing Backend Tests For New Identity And Upsert Rules

**Files:**
- Modify: `src-tauri/test/imap_client_tests.rs`
- Create: `src-tauri/test/database_sync_state_tests.rs`
- Modify: `src-tauri/src/database.rs`

- [ ] **Step 1: Write the failing identity test**

```rust
#[test]
fn test_generate_sync_id_uses_account_and_folder_scope() {
    let inbox = ImapClient::generate_sync_id("acc-a", "inbox", 42);
    let sent = ImapClient::generate_sync_id("acc-a", "sent", 42);
    let other_account = ImapClient::generate_sync_id("acc-b", "inbox", 42);

    assert_ne!(inbox, sent);
    assert_ne!(inbox, other_account);
}
```

- [ ] **Step 2: Write the failing remote-identity upsert test**

```rust
#[test]
fn test_upsert_mail_reuses_existing_row_for_same_account_folder_and_uid() {
    // Arrange an existing legacy row.
    // Upsert a new metadata-first mail with a different generated id.
    // Assert row count stays 1 and the original local id is preserved.
}
```

- [ ] **Step 3: Run the focused Rust tests to verify they fail**

Run: `cargo test --manifest-path src-tauri/Cargo.toml imap_client_tests database_sync_state_tests`
Expected: failures because the new helpers and upsert behavior do not exist yet.

### Task 3: Add Schema And Database Support

**Files:**
- Modify: `src-tauri/src/database.rs`

- [ ] **Step 1: Add the new mail metadata columns and folder-state columns**

```rust
conn.execute("ALTER TABLE mails ADD COLUMN remote_uid_validity INTEGER", []).ok();
conn.execute("ALTER TABLE mails ADD COLUMN content_state TEXT", []).ok();
conn.execute("ALTER TABLE imap_folders ADD COLUMN local_name TEXT", []).ok();
conn.execute("ALTER TABLE imap_folders ADD COLUMN last_synced_at INTEGER", []).ok();
```

- [ ] **Step 2: Normalize existing rows during migration**

```rust
conn.execute(
    "UPDATE mails
     SET content_state = CASE
         WHEN COALESCE(body, '') != '' OR COALESCE(html_body, '') != '' THEN 'body_cached'
         ELSE 'metadata_only'
     END
     WHERE content_state IS NULL OR content_state = ''",
    [],
)?;
```

- [ ] **Step 3: Teach mail queries and writes about `content_state` and `remote_uid_validity`**

```rust
pub struct Mail {
    // ...
    pub remote_uid_validity: Option<u32>,
    pub content_state: String,
}
```

- [ ] **Step 4: Add helpers for folder-state lookup and persistence**

```rust
pub fn get_imap_folder_state(&self, account_id: &str, local_name: &str) -> SqliteResult<Option<ImapFolderState>>;
pub fn upsert_imap_folder_state(&self, state: &ImapFolderState) -> SqliteResult<()>;
```

- [ ] **Step 5: Make `upsert_mail_preserving_read_status` match by remote identity**

```rust
SELECT id, unread, created_at, folder, starred
FROM mails
WHERE account_id = ?1 AND folder = ?2 AND uid = ?3
LIMIT 1
```

- [ ] **Step 6: Run the focused Rust tests**

Run: `cargo test --manifest-path src-tauri/Cargo.toml database_sync_state_tests`
Expected: pass once the schema helpers and upsert behavior exist.

### Task 4: Add Provider Helpers And Metadata Fetch Support

**Files:**
- Modify: `src-tauri/src/mail_provider.rs`
- Modify: `src-tauri/src/imap_client.rs`
- Modify: `src-tauri/test/imap_client_tests.rs`

- [ ] **Step 1: Add provider helpers for metadata fetch and reverse folder resolution**

```rust
pub fn get_metadata_fetch_command(&self) -> &'static str;
pub fn preferred_remote_folder_for_local(&self, local_folder: &str) -> Option<&'static str>;
```

- [ ] **Step 2: Add metadata parsing support in `ImapClient`**

```rust
fn parse_metadata_fetch_response(fetch: &imap::types::Fetch, folder: &str) -> Result<Mail>;
pub(crate) fn generate_sync_id(account_id: &str, folder: &str, uid: u32) -> String;
```

- [ ] **Step 3: Add a single-session folder metadata sync entry point**

```rust
pub async fn sync_folders_metadata(&self, requests: Vec<SyncFolderRequest>) -> Result<Vec<SyncFolderResult>>;
```

- [ ] **Step 4: Run the focused Rust tests**

Run: `cargo test --manifest-path src-tauri/Cargo.toml imap_client_tests`
Expected: pass with the new provider helpers and sync-id behavior.

### Task 5: Replace The Old Full-Body Folder Sync Path

**Files:**
- Modify: `src-tauri/src/sync_manager.rs`
- Modify: `src-tauri/src/database.rs`
- Modify: `src-tauri/src/mail_provider.rs`
- Modify: `src-tauri/src/imap_client.rs`

- [ ] **Step 1: Build folder sync requests from saved folder state**

```rust
let requests = vec![
    SyncFolderRequest {
        local_folder: "inbox".to_string(),
        candidate_remote_folders: vec!["INBOX".to_string()],
        last_seen_uid: saved.remote_last_uid,
        known_uid_validity: Some(saved.remote_uid_validity),
    }
];
```

- [ ] **Step 2: Sync metadata with one IMAP connection**

```rust
let results = imap_client.sync_folders_metadata(requests).await?;
```

- [ ] **Step 3: Persist folder state and metadata rows**

```rust
for result in results {
    if result.uid_validity_changed {
        self.database.clear_account_folder(account_id, &result.local_folder)?;
    }
    self.database.upsert_imap_folder_state(&result.folder_state)?;
    for mail in result.mails {
        self.database.upsert_mail_preserving_read_status(&mail)?;
    }
}
```

- [ ] **Step 4: Keep low-priority folders from blocking useful mail**

```text
Sync requests are ordered inbox -> sent -> drafts -> trash -> archive.
```

- [ ] **Step 5: Run backend tests**

Run: `cargo test --manifest-path src-tauri/Cargo.toml`
Expected: all Rust tests pass.

### Task 6: Add Lazy Body Loading Command

**Files:**
- Modify: `src-tauri/src/commands.rs`
- Modify: `src-tauri/src/lib.rs`
- Modify: `src-tauri/src/imap_client.rs`
- Modify: `src-tauri/src/database.rs`

- [ ] **Step 1: Add a full-body fetch helper**

```rust
pub async fn fetch_mail_content(&self, remote_folder: &str, uid: u32) -> Result<Mail>;
```

- [ ] **Step 2: Add `ensure_mail_content` Tauri command**

```rust
#[tauri::command]
pub async fn ensure_mail_content(id: String, ...) -> Result<Mail, String> {
    // load local mail
    // short-circuit when body already cached
    // resolve remote folder
    // fetch full content
    // persist merged row
    // return updated mail
}
```

- [ ] **Step 3: Route remote read-flag writes through the saved remote folder mapping**

```rust
let remote_folder = db.inner().get_remote_folder_name(&account_id, &mail.folder)?;
imap_client.store_flags(&remote_folder, uid, "+FLAGS (\\Seen)").await?;
```

- [ ] **Step 4: Run backend tests**

Run: `cargo test --manifest-path src-tauri/Cargo.toml`
Expected: pass with the new command registered.

### Task 7: Add Frontend Lazy Loading In The Reading Pane

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/lib/db/index.ts`
- Create: `src/lib/components/layout/ReadingPane.test.ts`
- Modify: `src/lib/components/layout/ReadingPane.svelte`

- [ ] **Step 1: Write the failing frontend test**

```ts
it('loads remote content when the selected mail only has metadata', async () => {
  // render ReadingPane with content_state: 'metadata_only'
  // mock ensureMailContent to resolve body_cached mail
  // assert the loader runs and the fetched content is rendered
});
```

- [ ] **Step 2: Run the focused frontend test and verify it fails**

Run: `npx vitest run src/lib/components/layout/ReadingPane.test.ts`
Expected: fail because the reading pane does not request remote content yet.

- [ ] **Step 3: Add the frontend command wrapper and type support**

```ts
export async function ensureMailContent(id: string): Promise<Mail> {
  return invoke<Mail>('ensure_mail_content', { id });
}
```

- [ ] **Step 4: Implement reading-pane lazy loading**

```ts
$effect(() => {
  if (!mail || mail.content_state === 'body_cached') return;
  void loadRemoteContent(mail.id);
});
```

- [ ] **Step 5: Run the focused frontend test**

Run: `npx vitest run src/lib/components/layout/ReadingPane.test.ts`
Expected: pass.

### Task 8: Final Verification

**Files:**
- Modify: `src-tauri/src/database.rs`
- Modify: `src-tauri/src/imap_client.rs`
- Modify: `src-tauri/src/mail_provider.rs`
- Modify: `src-tauri/src/sync_manager.rs`
- Modify: `src-tauri/src/commands.rs`
- Modify: `src-tauri/src/lib.rs`
- Modify: `src/lib/types.ts`
- Modify: `src/lib/db/index.ts`
- Modify: `src/lib/components/layout/ReadingPane.svelte`
- Create: `src/lib/components/layout/ReadingPane.test.ts`

- [ ] **Step 1: Format Rust code**

Run: `cargo fmt --manifest-path src-tauri/Cargo.toml`
Expected: no errors.

- [ ] **Step 2: Run Rust tests**

Run: `cargo test --manifest-path src-tauri/Cargo.toml`
Expected: all tests pass.

- [ ] **Step 3: Run the focused frontend tests**

Run: `npx vitest run src/lib/components/layout/ReadingPane.test.ts src/lib/components/layout`
Expected: pass.

- [ ] **Step 4: Run type checking**

Run: `npm run check`
Expected: pass.

- [ ] **Step 5: Verify the behavioral outcomes**

Checklist:

```text
- mailbox list loads from metadata rows without full-body sync
- selected metadata-only mail triggers on-demand body fetch
- read-state sync uses the saved remote folder, not the local folder label
- account/folder/uid identity no longer collides across accounts or folders
- folder sync state is persisted in imap_folders
```
