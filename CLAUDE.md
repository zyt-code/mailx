# Mailx - Tauri Mail Client

> Modern desktop email client with Notion-inspired UI

## Tech Stack

```
Tauri v2 (Rust)  ←→  Svelte 5 + Vite  ←→  Tailwind CSS + Skeleton UI
```

- **Backend:** Tauri v2 (Rust)
- **Frontend:** Svelte 5 (with runes) + TypeScript
- **UI Library:** Skeleton UI / shadcn-svelte
- **Styling:** Tailwind CSS v4
- **Icons:** Lucide Svelte
- **State:** Svelte 5 runes (`$state`, `$derived`, `$effect`)

## Quick Start

```bash
# Install dependencies
npm install

# Development mode
npm run tauri dev

# Build for production
npm run tauri build

# Type checking
npm run check
```

## Project Structure

```
mailx/
├── src-tauri/          # Tauri Rust backend
│   ├── src/
│   │   ├── main.rs     # Entry point
│   │   ├── lib.rs      # Core modules
│   │   └── commands/   # Tauri commands
│   └── Cargo.toml
├── src/                # Svelte 5 frontend
│   ├── lib/
│   │   └── components/ # UI components
│   ├── routes/         # File-based routing
│   ├── app.css         # Global styles
│   └── app.d.ts        # Type declarations
├── static/             # Static assets
├── docs/               # Design documents
├── CLAUDE.md           # This file
└── package.json
```

## Layout Architecture

**3-Column Notion-Style Layout:**
```
┌──────────┬──────────────────┬──────────────┐
│ Sidebar  │    Mail List     │ Reading Pane │
│ 250px    │     350px        │   flexible   │
│ (nav)    │   (resizable)    │  (content)   │
└──────────┴──────────────────┴──────────────┘
```

### Key Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `AppShell.svelte` | `src/lib/components/layout/` | Main layout wrapper |
| `Sidebar.svelte` | `src/lib/components/layout/` | Left navigation (collapsible) |
| `MailList.svelte` | `src/lib/components/layout/` | Email list panel |
| `ReadingPane.svelte` | `src/lib/components/layout/` | Content display |
| `Resizer.svelte` | `src/lib/components/layout/` | Panel resize handle |

## Code Style

### Svelte 5 Runes (Required)

```svelte
<script lang="ts">
  // ✅ Use Svelte 5 runes
  let count = $state(0);
  let doubled = $derived(count * 2);

  $effect(() => {
    console.log(count);
  });

  // ❌ Don't use old stores
  // import { writable } from 'svelte/store';
</script>
```

### TypeScript (Strict)

```typescript
// Always type props
interface Props {
  mail: Mail;
  onSelect: (id: string) => void;
}

// Use generics for reusable components
interface ListProps<T> {
  items: T[];
  render: (item: T) => snipped;
}
```

### Tailwind CSS Patterns

```svelte
<!-- ✅ Use Tailwind classes -->
<div class="flex items-center gap-4 p-4 border-b">

<!-- ❌ Don't write custom CSS -->
<div style="display: flex; padding: 16px;">
```

## Development Guidelines

1. **UI Priority:** Notion-inspired clean, minimal design
2. **Modular Components:** Small, reusable, composable
3. **Type Safety:** Always use TypeScript types
4. **Accessibility:** WCAG AA compliant by default
5. **Performance:** Lazy load routes, optimize assets

## Key Files to Edit

| Task | File |
|------|------|
| Add new route | `src/routes/+page.svelte` |
| Create component | `src/lib/components/` |
| Global styles | `src/app.css` |
| Tauri commands | `src-tauri/src/commands/` |
| Tailwind config | `tailwind.config.js` |

## Common Tasks

```bash
# Add a dependency
npm install <package>

# Add Tauri API
npm install @tauri-apps/api

# Run type checker
npm run check

# Format code
npm run format
```

## Design Tokens

```css
/* Notion-inspired colors */
--bg-primary: #FFFFFF;      /* Main background */
--bg-secondary: #F7F7F5;    /* Secondary background */
--bg-hover: #EFEFEF;        /* Hover state */
--border: #E0E0E0;          /* Border color */
--text: #37352F;            /* Primary text */
--text-muted: #787774;      /* Secondary text */
--accent: #2EAADC;          /* Accent color */
```

## Notes

- Panel widths persist in localStorage
- Sidebar collapses to 64px (icons only)
- Mobile: stacked layout with slide-in nav
- All icons from Lucide Svelte
