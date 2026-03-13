# Design System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Set up Tailwind CSS v4 and shadcn-svelte with Notion-inspired design tokens for the Mailx email client.

**Architecture:** Install Tailwind v4 with new Vite plugin, initialize shadcn-svelte for accessible UI components, configure Notion-inspired design tokens in app.css.

**Tech Stack:** Tailwind CSS v4, shadcn-svelte, Svelte 5, Vite

---

## Task 1: Install Tailwind CSS v4

**Files:**
- Modify: `package.json`
- Create: `vite.config.js` (update existing)

**Step 1: Install Tailwind v4 dependencies**

Run:
```bash
npm install -D tailwindcss@next @tailwindcss/vite
```

Expected: Packages added to devDependencies

**Step 2: Update Vite config**

Read current `vite.config.js` then add Tailwind plugin:

```js
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
	plugins: [sveltekit(), tailwindcss()]
});
```

**Step 3: Commit**

```bash
git add package.json package-lock.json vite.config.js
git commit -m "feat: install Tailwind CSS v4 with Vite plugin"
```

---

## Task 2: Configure Tailwind v4 in app.css

**Files:**
- Modify: `src/app.css` (create if doesn't exist)

**Step 1: Create/update app.css with Tailwind import**

```css
@import "tailwindcss";

/* Notion-inspired design tokens will be added in next task */
```

**Step 2: Verify app.css is imported in app.html**

Check `src/app.html` contains:
```html
<link rel="stylesheet" href="%app.css%" />
```

**Step 3: Test Tailwind is working**

Add test class to `src/routes/+page.svelte`:
```svelte
<div class="p-4 bg-blue-500 text-white">
  Tailwind is working!
</div>
```

Run: `npm run tauri dev`

Expected: Blue box with white text visible

**Step 4: Remove test code and commit**

```bash
git add src/app.css src/routes/+page.svelte
git commit -m "feat: configure Tailwind CSS v4 base import"
```

---

## Task 3: Add Notion Design Tokens

**Files:**
- Modify: `src/app.css`

**Step 1: Add design tokens to app.css**

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

/* Base styles */
body {
  background-color: var(--color-bg-primary);
  color: var(--color-text);
}
```

**Step 2: Test design tokens**

Update `src/routes/+page.svelte`:
```svelte
<div class="p-4" style="background-color: var(--color-bg-secondary); border: 1px solid var(--color-border);">
  <h1 style="color: var(--color-accent);">Mailx</h1>
  <p style="color: var(--color-text-muted);">Design tokens working!</p>
</div>
```

Run: `npm run tauri dev`

Expected: Styled box with Notion colors visible

**Step 3: Remove test code and commit**

```bash
git add src/app.css src/routes/+page.svelte
git commit -m "feat: add Notion-inspired design tokens"
```

---

## Task 4: Initialize shadcn-svelte

**Files:**
- Create: `components.json`
- Create: `src/lib/components/ui/` directory
- Create: `tailwind.config.js`

**Step 1: Run shadcn-svelte init**

Run:
```bash
npx shadcn-svelte@latest init
```

Interactive prompts:
- Style: Default (Tailwind)
- Base color: Slate
- CSS variables: Yes
- utils.dart: Yes

Expected: `components.json` created, `src/lib/components/ui/` directory created

**Step 2: Verify components.json structure**

Should contain:
```json
{
  "$schema": "https://shadcn-svelte.com/schema.json",
  "style": "default",
  "tailwind": {
    "css": "src/app.css",
    "baseColor": "slate"
  },
  "aliases": {
    "components": "$lib/components",
    "utils": "$lib/utils"
  }
}
```

**Step 3: Commit**

```bash
git add components.json src/lib/components/ui/ src/lib/utils.ts tailwind.config.js
git commit -m "feat: initialize shadcn-svelte"
```

---

## Task 5: Add Initial shadcn-svelte Components

**Files:**
- Create: `src/lib/components/ui/button/`
- Create: `src/lib/components/ui/card/`
- Create: `src/lib/components/ui/input/`
- Create: `src/lib/components/ui/scroll-area/`

**Step 1: Add button component**

Run:
```bash
npx shadcn-svelte@latest add button
```

Expected: `src/lib/components/ui/button/` directory created with index.ts and Button.svelte

**Step 2: Add card component**

Run:
```bash
npx shadcn-svelte@latest add card
```

**Step 3: Add input component**

Run:
```bash
npx shadcn-svelte@latest add input
```

**Step 4: Add scroll-area component**

Run:
```bash
npx shadcn-svelte@latest add scroll-area
```

**Step 5: Test components work**

Update `src/routes/+page.svelte`:
```svelte
<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { Card } from '$lib/components/ui/card';
  import * as Card from '$lib/components/ui/card';
</script>

<Card.Root class="p-4">
  <Card.Header>
    <Card.Title>Mailx</Card.Title>
    <Card.Description>Design system setup complete</Card.Description>
  </Card.Header>
  <Card.Content>
    <Button>Compose</Button>
  </Card.Content>
</Card.Root>
```

Run: `npm run tauri dev`

Expected: Styled card and button visible

**Step 6: Remove test code and commit**

```bash
git add src/lib/components/ui/ src/routes/+page.svelte
git commit -m "feat: add shadcn-svelte base components"
```

---

## Task 6: Create Layout Component Directory

**Files:**
- Create: `src/lib/components/layout/`

**Step 1: Create directory structure**

Run:
```bash
mkdir -p src/lib/components/layout
```

**Step 2: Create placeholder files for future components**

Create `src/lib/components/layout/.gitkeep`:
```bash
touch src/lib/components/layout/.gitkeep
```

**Step 3: Commit**

```bash
git add src/lib/components/layout/.gitkeep
git commit -m "feat: create layout component directory"
```

---

## Task 7: Update Documentation

**Files:**
- Modify: `SETUP.md`

**Step 1: Update SETUP.md with design system info**

Add section after "Svelte 5 Runes":

```markdown
## Design System

### Tailwind CSS v4

Installed via `@tailwindcss/vite` plugin. Configuration in `src/app.css`.

### Design Tokens

Notion-inspired tokens defined in `src/app.css`:
- Colors: `--color-bg-primary`, `--color-text`, `--color-accent`, etc.
- Spacing: `--spacing-sidebar`, `--spacing-mail-list`
- Radius: `--radius-sm`, `--radius-md`, `--radius-lg`

### shadcn-svelte Components

Located in `src/lib/components/ui/`. Add new components:

```bash
npx shadcn-svelte@latest add <component-name>
```

### Custom Layout Components

Custom Mailx layout components in `src/lib/components/layout/`:
- `AppShell.svelte` - Main layout wrapper
- `Sidebar.svelte` - Left navigation
- `MailList.svelte` - Email list panel
- `ReadingPane.svelte` - Content display
- `Resizer.svelte` - Panel resize handle
```

**Step 2: Commit**

```bash
git add SETUP.md
git commit -m "docs: update SETUP.md with design system info"
```

---

## Task 8: Verify Setup Complete

**Step 1: Run type check**

Run:
```bash
npm run check
```

Expected: No TypeScript errors

**Step 2: Build test**

Run:
```bash
npm run tauri build
```

Expected: Build completes successfully

**Step 3: Final verification**

Run:
```bash
npm run tauri dev
```

Verify:
- App launches without errors
- Tailwind classes work
- shadcn components render correctly
- Design tokens are applied

**Step 4: Tag completion**

```bash
git tag -a v0.1.0-design-system -m "Design system setup complete"
```

---

## Next Steps

After design system setup:
1. Build custom layout components (AppShell, Sidebar, MailList, ReadingPane)
2. Implement 3-column Notion-style layout
3. Add panel resize functionality
4. Implement sidebar collapse/expand

---

## Summary

This plan sets up:
- ✅ Tailwind CSS v4 with Vite plugin
- ✅ Notion-inspired design tokens
- ✅ shadcn-svelte component library
- ✅ Base UI components (Button, Card, Input, ScrollArea)
- ✅ Foundation for custom Mailx components
