# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Tauri v2 desktop application template with SvelteKit frontend.

- **Backend:** Tauri v2 (Rust)
- **Frontend:** SvelteKit with Svelte 5 runes + TypeScript
- **Mode:** SPA (no SSR) via `adapter-static`

## Development Commands

```bash
# Install dependencies
npm install

# Development (starts both Tauri backend + Vite dev server)
npm run tauri dev

# Type checking
npm run check
npm run check:watch  # Watch mode

# Production build
npm run tauri build
```

## Architecture

### Tauri Commands (Rust → Frontend)

Commands are defined in `src-tauri/src/lib.rs` with `#[tauri::command]`:

```rust
#[tauri::command]
fn command_name(param: &str) -> Result<Type, String> {
    // ...
}
```

Register in `invoke_handler`:

```rust
.invoke_handler(tauri::generate_handler![command_name, another_command])
```

Call from frontend:

```typescript
import { invoke } from "@tauri-apps/api/core";
const result = await invoke("command_name", { param: "value" });
```

### SvelteKit Structure

- `src/routes/+layout.ts`: Disables SSR (`export const ssr = false`)
- `src/routes/`: File-based routing (currently just `+page.svelte`)
- Frontend communicates with Rust via Tauri `invoke()`, not server routes

### Svelte 5 Runes (Required)

Use Svelte 5 runes for reactivity:

```svelte
<script lang="ts">
  let count = $state(0);        // Reactive state
  let doubled = $derived(count * 2);  // Derived values

  $effect(() => {               // Side effects
    console.log(count);
  });
</script>
```

## Design System

### Tailwind CSS v4

Installed via `@tailwindcss/vite` plugin. Configuration in `src/app.css` using `@theme` directive.

### Design Tokens

Notion-inspired tokens defined in `src/app.css`:
- Colors: `--color-bg-primary`, `--color-bg-secondary`, `--color-bg-hover`, `--color-border`, `--color-text`, `--color-text-muted`, `--color-accent`
- Spacing: `--spacing-sidebar` (250px), `--spacing-mail-list` (350px)
- Radius: `--radius-sm`, `--radius-md`, `--radius-lg`

### shadcn-svelte Components

Located in `src/lib/components/ui/`. Add new components:

```bash
npx shadcn-svelte@latest add <component-name>
```

Installed: `button`, `card`, `input`, `scroll-area`

### Custom Layout Components

Custom Mailx layout components in `src/lib/components/layout/`:
- `AppShell.svelte` - Main layout wrapper
- `Sidebar.svelte` - Left navigation
- `MailList.svelte` - Email list panel
- `ReadingPane.svelte` - Content display
- `Resizer.svelte` - Panel resize handle

## Key Files

| File | Purpose |
|------|---------|
| `src-tauri/src/lib.rs` | Tauri commands and app initialization |
| `src-tauri/src/main.rs` | Entry point (calls `mailx_lib::run()`) |
| `src-tauri/Cargo.toml` | Rust dependencies |
| `src/routes/+layout.ts` | SvelteKit config (SSR disabled) |
| `src/routes/+page.svelte` | Main page component |
| `package.json` | Node.js dependencies and scripts |

## Design Roadmap

See `CLAUDE.md` for the full design specification of the Mailx email client application.
