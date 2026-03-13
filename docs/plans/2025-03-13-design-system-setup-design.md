# Design System Setup Design

**Date:** 2025-03-13
**Project:** Mailx - Tauri Mail Client

## Overview

Set up the foundational design system for the Mailx email client using Tailwind CSS v4 and shadcn-svelte, with Notion-inspired design tokens.

## Tech Stack

- **Tailwind CSS v4** - Utility-first CSS with new Vite plugin
- **shadcn-svelte** - Accessible Svelte component library
- **Design Tokens** - Notion-inspired color palette and spacing

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Svelte 5 App                         │
├─────────────────────────────────────────────────────────┤
│  src/                                                   │
│  ├── app.css           # Tailwind v4 + design tokens    │
│  ├── lib/              # shadcn-svelte components       │
│  │   └── components/   # + custom Mailx components      │
│  └── routes/           # Pages using components         │
├─────────────────────────────────────────────────────────┤
│  tailwind.config.js    # shadcn-svelte content config   │
│  components.json       # shadcn-svelte CLI config       │
└─────────────────────────────────────────────────────────┘
```

## Setup Steps

### 1. Install Tailwind CSS v4

```bash
npm install -D tailwindcss@next @tailwindcss/vite
```

Update `vite.config.js`:

```js
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [sveltekit(), tailwindcss()],
})
```

### 2. Initialize shadcn-svelte

```bash
npx shadcn-svelte@latest init
```

Configuration options:
- Style: Default (Tailwind)
- Base color: Slate
- CSS variables: Yes

### 3. Configure Design Tokens

Update `src/app.css`:

```css
@import "tailwindcss";

@theme {
  /* Notion-inspired colors */
  --color-bg-primary: #FFFFFF;
  --color-bg-secondary: #F7F7F5;
  --color-bg-hover: #EFEFEF;
  --color-border: #E0E0E0;
  --color-text: #37352F;
  --color-text-muted: #787774;
  --color-accent: #2EAADC;

  /* Layout spacing */
  --spacing-sidebar: 250px;
  --spacing-mail-list: 350px;

  /* Border radius */
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
}
```

### 4. Add Initial Components

```bash
npx shadcn-svelte@latest add button
npx shadcn-svelte@latest add card
npx shadcn-svelte@latest add input
npx shadcn-svelte@latest add scroll-area
```

## Directory Structure

```
src/
├── lib/
│   ├── components/
│   │   ├── ui/              # shadcn-svelte components
│   │   │   ├── button/
│   │   │   ├── card/
│   │   │   ├── input/
│   │   │   └── scroll-area/
│   │   └── layout/          # Custom Mailx layout components
│   │       ├── AppShell.svelte
│   │       ├── Sidebar.svelte
│   │       └── Resizer.svelte
│   └── styles/
│       └── tokens.css       # Additional design tokens (optional)
├── routes/
│   └── +page.svelte
└── app.css                  # Tailwind v4 + design tokens

components.json               # shadcn-svelte config
tailwind.config.js           # Tailwind content paths
```

## Design Token Reference

### Colors

| Token | Value | Usage |
|-------|-------|-------|
| `--color-bg-primary` | `#FFFFFF` | Main background |
| `--color-bg-secondary` | `#F7F7F5` | Secondary background |
| `--color-bg-hover` | `#EFEFEF` | Hover states |
| `--color-border` | `#E0E0E0` | Borders, dividers |
| `--color-text` | `#37352F` | Primary text |
| `--color-text-muted` | `#787774` | Secondary text |
| `--color-accent` | `#2EAADC` | Accent color |

### Layout

| Token | Value | Usage |
|-------|-------|-------|
| `--spacing-sidebar` | `250px` | Sidebar width (collapsed: 64px) |
| `--spacing-mail-list` | `350px` | Mail list panel width |

## Component Usage Example

```svelte
<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { Card } from '$lib/components/ui/card';
</script>

<Card>
  <h1>Mailx</h1>
  <Button>Compose</Button>
</Card>
```

## Next Steps

After design system setup:
1. Build custom layout components (AppShell, Sidebar, MailList, ReadingPane)
2. Implement 3-column Notion-style layout
3. Add panel resize functionality
4. Implement sidebar collapse/expand
