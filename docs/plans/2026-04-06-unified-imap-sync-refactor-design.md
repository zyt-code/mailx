# Unified IMAP Sync Refactor Design

## Goal

Replace the current full-body, per-folder reconnect sync path with a provider-aware but unified IMAP pipeline that is fast for iCloud and scalable across all supported providers.

## Current Problems

- Sync opens a new IMAP connection for every folder.
- Folder sync fetches whole message bodies even when only the list view needs metadata.
- Large folders such as trash/archive dominate sync time and can time out.
- The local mail identity is derived from `from_email + uid`, which is unsafe across accounts and folders.
- The existing `imap_folders` and `sync_state` tables are not used to drive incremental sync.

## Target Architecture

### Unified Sync Pipeline

All IMAP providers use the same stages:

1. Resolve the provider profile.
2. Resolve the remote folder backing each local folder.
3. Reuse one IMAP session for the account sync pass.
4. Select each remote folder and perform UID-based incremental metadata sync.
5. Persist metadata rows locally with explicit content-cache state.
6. Load full message bodies only when the user opens a message.

### Provider Profile Boundary

Providers keep only capability and naming differences:

- candidate remote folder names per local folder
- whether IMAP ID is required before login
- metadata fetch command
- full-body fetch command
- fallback commands for broken responses
- sync priority defaults

The orchestration, persistence, and lazy body loading remain shared.

## Data Model Changes

### `mails`

Keep the existing local primary key `id`, but make sync identity explicit:

- `account_id`
- `folder` (local folder)
- `uid`
- `remote_uid_validity`
- `content_state` (`metadata_only`, `snippet_cached`, `body_cached`, `body_failed`)

Behavior:

- existing rows are matched by `(account_id, folder, uid)` during upsert so legacy rows are upgraded in place
- `preview` is no longer derived from `body`
- `body` and `html_body` may be empty until the message body is fetched on demand

### `imap_folders`

Use this table to persist the resolved backing remote folder per account/local folder:

- `account_id`
- `local_name`
- `name` (actual remote folder name)
- `remote_uid_validity`
- `remote_last_uid`
- `local_count`
- `last_synced_at`

This removes repeated folder probing on later syncs and gives remote folder resolution to flag updates and lazy body fetches.

## Sync Flow

### Fast Path

- `INBOX`, `sent`, and `drafts` sync first.
- Sync fetches only metadata, flags, and a lightweight preview snippet.
- UID ranges come from `imap_folders.remote_last_uid`.
- If `uid_validity` changes, local rows for that account/local folder are purged and the folder is re-seeded.

### Background Path

- `trash`, `archive`, and low-priority folders still sync through the same metadata path.
- They no longer block the first useful mailbox load.

## Lazy Body Loading

- `get_mail(id)` remains local-only.
- New command `ensure_mail_content(id)` loads the full body only when required.
- Reading pane detects `content_state != body_cached`, requests the body, and updates the displayed message without forcing a full mailbox reload.

## Identity Strategy

For synced mail, the generated local `id` must include account and local folder context so that identical UIDs from different accounts or folders do not collide.

Near-term implementation:

- generate sync ids from `account_id + folder + uid`
- preserve existing ids when an older row already exists for the same `(account_id, folder, uid)`

Longer-term, a dedicated local primary key plus separate remote identity columns can be introduced without changing the lazy-loading architecture.

## Testing Strategy

- Rust unit tests for mail identity generation, provider folder resolution, and remote-identity upsert behavior.
- Rust verification through `cargo test`.
- Frontend unit tests for reading pane lazy body loading.
- Frontend verification through targeted `vitest` and `npm run check`.

## Non-Goals For This Pass

- IMAP IDLE push updates
- attachment body-part download and persistence
- QRESYNC / CONDSTORE
- full replacement of every legacy sync helper in one shot

## Migration Notes

- Existing rows with cached bodies are upgraded to `body_cached`.
- Existing rows without body/html become `metadata_only`.
- Old rows are reused where possible instead of duplicated.
