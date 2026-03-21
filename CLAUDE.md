# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Tech Stack

- **Backend:** Tauri v2 (Rust) — SQLite (rusqlite), async-imap, lettre (SMTP), keyring (OS keychain)
- **Frontend:** Svelte 5 + SvelteKit + TypeScript (SPA mode, SSR disabled)
- **Styling:** Tailwind CSS v4, class-based dark mode, shadcn-svelte CSS variable pattern
- **Icons:** Lucide Svelte
- **State:** Svelte 5 runes (`$state`, `$derived`, `$effect`) for new code; legacy stores use `writable`/`derived`
- **i18n:** `svelte-i18n` v4 with lazy-loaded locales (10 languages), custom type-safe translation keys
- **Rich text:** TipTap v3
- **Virtualization:** virtua

## Commands

```bash
# Install dependencies (uses pnpm)
pnpm install

# Development (starts both Vite + Tauri)
npm run tauri dev

# Production build
npm run tauri build

# Type checking
npm run check

# Frontend tests (Vitest)
npx vitest                         # run all
npx vitest run src/lib/stores/     # run tests in a directory
npx vitest run path/to/file.test.ts  # single file

# Rust backend tests
cargo test --manifest-path src-tauri/Cargo.toml
cargo test --manifest-path src-tauri/Cargo.toml test_name  # single test

# Gate check (run before committing)
cargo test --manifest-path src-tauri/Cargo.toml && npm run check
```

## Architecture

### Layout: 3-Column Notion-Style

```
┌──────────┬──────────────────┬──────────────┐
│ Sidebar  │    Mail List     │ Reading Pane │
│ 250px    │     350px        │   flexible   │
│ (nav)    │   (resizable)    │  (content)   │
└──────────┴──────────────────┴──────────────┘
```

Root layout (`src/routes/+layout.svelte`) conditionally renders:
- Paths starting with `/settings` → renders slot directly (settings has its own 2-column layout)
- Everything else → wraps content in `<AppShell>` (the 3-column mail layout)

### Frontend-Backend Communication

- **Request/Response:** Tauri commands (28+ commands in `src-tauri/src/commands.rs`)
- **Push events:** Tauri `Emitter` sends events from Rust → Svelte: `sync:*`, `mails:updated`, `account:*`, `mail:sent`, `navigate`
- **Frontend event bus** bridges Tauri events and internal app events

### Rust Backend Modules

| Module | Purpose |
|--------|---------|
| `lib.rs` | Tauri builder, plugin registration, menu, state management |
| `commands.rs` | All Tauri invoke handlers |
| `database.rs` | SQLite schema, migrations, WAL mode, mail/attachment CRUD |
| `accounts.rs` | Account CRUD, IMAP/SMTP config extraction |
| `imap_client.rs` | IMAP connection, email fetching, provider-specific handling |
| `smtp_client.rs` | Email sending via lettre, multipart/attachments |
| `sync_manager.rs` | Background sync orchestration with `AtomicBool` lock |
| `credentials.rs` | OS keychain storage via `keyring` crate |
| `html_sanitize.rs` | XSS prevention via `ammonia` |
| `mail_provider.rs` | Provider detection (Netease163, iCloud, Generic) with provider-specific IMAP quirks |

State is managed via `app.manage()` — commands receive `Database`, `AccountManager`, `CredentialManager`, `SyncManager` as `State<'_>`.

### Stores

| Store | Pattern | Purpose |
|-------|---------|---------|
| `i18nStore.svelte.ts` | Svelte 5 `$state` runes | i18n initialization, locale management |
| `preferencesStore.ts` | Svelte 4 `writable` | User preferences (appearance, notifications, keyboard, privacy, language), persisted to localStorage under `mailx-preferences` |
| `themeStore.ts` | Svelte 4 `writable` | Theme management |
| `mailStore.ts` | Svelte 4 `writable`/`derived` | Mail data, folder filtering, connects to Tauri events and DB |
| `accountStore.ts` | Svelte 4 `writable`/`derived` | Account management, auto-loads on import |
| `syncStore.ts` | Svelte 4 `writable`/`derived` | Sync state tracking via Tauri events |
| `unreadStore.ts` | Svelte 4 `derived` | Derived from mailStore |

**Note:** Only `i18nStore` uses Svelte 5 runes (requires `.svelte.ts` extension). Other stores still use the classic `writable`/`derived` pattern.

### i18n System

- Powered by `svelte-i18n` v4 with lazy-loaded locale imports
- 10 locales: en, zh-CN, zh-TW, ja, ko, es, fr, de, pt, ru
- Locale files in `src/lib/i18n/locales/` with namespaces: common, titlebar, sidebar, nav, mail, settings, language, theme, account, form, datetime
- Type-safe keys derived from the `en` locale via `typeof` + recursive `TranslationKey` type
- Components consume translations via `$_('namespace.key')` from `svelte-i18n`
- Store wrapper at `src/lib/stores/i18nStore.svelte.ts` handles init, locale switching, loading state
- Barrel re-export at `src/lib/i18n/index.ts`

### Routing

SPA mode (`ssr = false`, `adapter-static`). Settings pages live under `/settings/*` with sub-routes: `language`, `appearance`, `notifications`, `privacy`, `keyboard`, `accounts/new`, `accounts/[id]`.

## Code Style

### Svelte 5 Runes (Required for new code)

```svelte
<script lang="ts">
  let count = $state(0);
  let doubled = $derived(count * 2);
  $effect(() => { console.log(count); });
</script>
```

Do not use `writable`/`derived` from `svelte/store` in new code. Files using `$state` runes must have `.svelte.ts` extension.

### TypeScript

Strict mode. Always type component props with an interface.

### Styling

Use Tailwind classes exclusively — no inline styles or custom CSS.

### Design Tokens

```css
--bg-primary: #FFFFFF;    --bg-secondary: #F7F7F5;   --bg-hover: #EFEFEF;
--border: #E0E0E0;        --text: #37352F;            --text-muted: #787774;
--accent: #2EAADC;
```

## Testing

### Strict TDD Process (Required)

1. **Red:** Write the test first, verify it fails for the correct reason
2. **Green:** Implement minimal code to pass the test
3. **Refactor:** Improve structure while keeping tests green
4. **Gate:** `cargo test --manifest-path src-tauri/Cargo.toml && npm run check`

### Test Organization

- **Frontend:** Vitest v4 with jsdom, globals enabled. Tests co-located with source as `*.test.ts`. Integration tests in `tests/i18n/`. Setup file `tests/setup.ts` mocks Tauri APIs, SvelteKit modules, and polyfills `$state` for test compatibility.
- **Rust:** Tests in `src-tauri/test/*_tests.rs`, linked via `#[cfg(test)]` + `#[path]` attributes in each module.
- **Governance:** Tests and mock utilities live under `tests/`. Keep `src/` and `src-tauri/src/` strictly production-ready.

## Key Behaviors

- Panel widths persist in localStorage
- Sidebar collapses to 64px (icons only)
- Compose modal auto-saves drafts every 30 seconds
- Drafts stored in SQLite with `folder='drafts'`; sent mail moves to `folder='sent'`; discarded drafts move to `folder='trash'`
- Separate SQLite connections for main DB and sync (WAL mode for concurrent reads)
- IMAP uses `tokio::task::spawn_blocking` (the `imap` crate is blocking)
- `SyncManager` uses `AtomicBool` to prevent concurrent syncs
