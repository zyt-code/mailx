# Event-Driven Mail Sync System Design

> **Status note (2026-04-05):** This file is historical context. Receive/sync state boundaries are being superseded by `2026-04-05-receive-sync-baseline-refactor-design.md`. Do not treat this file as the current source of truth for mailbox scope or sync orchestration.

**Date:** 2026-03-17
**Status:** Design Approved
**Author:** Claude + User Collaboration

## Overview

Transform mailx from a static demo to a dynamic application by implementing an event-driven email synchronization system. This design enables real-time email fetching, caching, and status updates with minimal UI disruption.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (Svelte)                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐        │
│  │  AccountStore│   │  SyncStore   │   │  MailStore   │        │
│  │              │   │              │   │              │        │
│  │ - accounts[] │──▶│ - syncStatus │──▶│ - mails[]    │        │
│  │ - activeAcc  │   │ - isSyncing  │   │ - isLoading  │        │
│  └──────────────┘   └──────────────┘   └──────────────┘        │
│         ▲                   ▲                   ▲               │
│         └───────────────────┴───────────────────┘               │
│                           │                                       │
│                  ┌────────▼────────┐                             │
│                  │  EventBus       │                             │
│                  │                 │                             │
│                  │ • account:*     │                             │
│                  │ • sync:*        │                             │
│                  │ • mail:*        │                             │
│                  └────────┬────────┘                             │
└───────────────────────────┼─────────────────────────────────────┘
                            │ Tauri Events
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Backend (Rust/Tauri)                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    SyncManager                            │  │
│  │                                                            │  │
│  │  sync_account()     ──▶  emit("sync:started")             │  │
│  │  fetch emails             emit("sync:progress")            │  │
│  │  store to DB              emit("sync:completed")           │  │
│  │                           emit("mails:updated")            │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌──────────────────┐      ┌──────────────────┐                │
│  │   ImapClient     │      │    Database      │                │
│  │                  │      │                  │                │
│  │  fetch_emails()  │─────▶│  insert_mail()   │                │
│  │  test_conn()     │      │  get_mails()     │                │
│  └──────────────────┘      └──────────────────┘                │
└─────────────────────────────────────────────────────────────────┘
```

## Event Definitions

### Backend → Frontend (Tauri Events)

| Event Name | Payload | Trigger | Frontend Response |
|------------|---------|---------|-------------------|
| `sync:started` | `{ account_id, email }` | Sync begins | Set `isSyncing = true` |
| `sync:progress` | `{ account_id, current, total }` | Fetching | Update progress bar |
| `sync:completed` | `SyncStatus` | Sync success | Refresh mail list, hide loading |
| `sync:failed` | `{ account_id, error }` | Sync failure | Show bottom-right notification |
| `mails:updated` | `{ account_id }` | Mails updated | Reload from DB |
| `mail:created` | `{ mail_id }` | New mail | Insert to list top |
| `account:created` | `{ account_id }` | Account created | Auto-trigger sync |

### Frontend Internal Events

| Event Name | Payload | Purpose |
|------------|---------|---------|
| `sync:trigger` | `{ accountId, folder }` | Manual sync trigger |
| `mail:read` | `{ mailId }` | Mark as read |
| `folder:change` | `{ folder }` | Switch folder |

## File Structure

```
src/lib/
├── events/
│   ├── eventBus.ts          # Event bus implementation
│   └── index.ts             # Exports
├── stores/
│   ├── accountStore.ts      # ✅ Existing
│   ├── syncStore.ts         # ⭐ New - Sync state management
│   └── mailStore.ts         # ⭐ New - Mail data management
├── sync/
│   ├── index.ts             # ⭐ New - Sync API wrapper
│   └── types.ts             # ⭐ New - SyncStatus type
└── components/
    └── ui/
        └── notification/     # ⭐ New - Bottom-right notification
            ├── notification.svelte
            └── index.ts
```

## User Experience Decisions

### 1. Sync Strategy: Hybrid Mode
- Auto-sync after adding account
- User can also manually refresh

### 2. Sync Scope: On-Demand (Current Account)
- Only sync currently selected account
- Switch accounts triggers sync for new account

### 3. Loading Experience: Background Update + Indicator
- Show cached mails during sync
- Small "Syncing..." indicator at top
- No blocking skeleton screens

### 4. Error Handling: Bottom-Right Notification
- VS Code-style notification
- Non-intrusive but visible
- Clear error messages

## Implementation Phases

### Phase 1: Infrastructure (Priority: 🔴 Highest)

1. **EventBus** - `src/lib/events/eventBus.ts`
2. **SyncStore** - `src/lib/stores/syncStore.ts`
3. **MailStore** - `src/lib/stores/mailStore.ts`
4. **Sync API** - `src/lib/sync/index.ts`

### Phase 2: UI Components (Priority: 🟡 Medium)

5. **Notification Component** - `src/lib/components/ui/notification/`
6. **AppShell Integration** - Initialize stores, subscribe to events
7. **Sidebar Sync Indicator** - "Syncing..." status display

### Phase 3: Backend Enhancements (Priority: 🟢 Lower)

8. **Auto-sync after account creation** - Trigger sync in `create_account`
9. **Progress events** - Add `sync:progress` to `SyncManager`

### Phase 4: Testing & Documentation (Priority: 🔵 Required)

10. **Test flows** - Add account → sync → display, manual refresh, error handling
11. **Update this document** - Reflect any implementation changes

## Success Criteria

- [ ] Adding account automatically triggers sync
- [ ] Mail list updates without full page reload
- [ ] "Syncing..." indicator appears during sync
- [ ] Errors show in bottom-right notification
- [ ] Manual refresh button works
- [ ] Switching accounts triggers sync for new account

## Notes

- Backend IMAP client, database, and sync manager are already implemented
- Frontend account management UI is complete
- Main work is connecting frontend stores to backend via event system
- Chinese encoding (GBK/UTF-8) is handled by `mail-parser` crate
