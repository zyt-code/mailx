# Tauri Mail Client - Layout Design

**Date:** 2025-03-13
**Status:** Approved

## Overview

A modern desktop email client built with Tauri and Svelte 5, featuring a Notion-inspired 3-column layout for efficient mail management.

## Tech Stack

- **Backend:** Tauri v2 (Rust)
- **Frontend:** Svelte 5 + Vite
- **UI Library:** Skeleton UI / shadcn-svelte
- **Styling:** Tailwind CSS
- **Icons:** Lucide Svelte
- **Language:** TypeScript

## Layout Architecture

### 3-Column Shell

```
┌─────────────────────────────────────────────────────────────┐
│                           Header                            │
│  Logo    Search                    Compose    Settings     │
├──────────┬──────────────────────────┬───────────────────────┤
│  Left    │      Mail List           │    Reading Pane       │
│ Sidebar  │  (scrollable)            │   (content view)      │
│          │                          │                       │
│ - Inbox  │  Mail Item 1             │  Mail Content         │
│ - Sent   │  Mail Item 2             │                       │
│ - Drafts │  Mail Item 3             │                       │
│ - Labels │                          │                       │
│          │                          │                       │
│ 250px    │         350px            │      flexible         │
│ (collapsible)  (resizable)          │                       │
└──────────┴──────────────────────────┴───────────────────────┘
```

### Panel Specifications

| Panel | Default Width | Min Width | Features |
|-------|--------------|-----------|----------|
| Sidebar | 250px (64px collapsed) | 64px | Collapsible, navigation items |
| Mail List | 350px | 280px | Resizable, scrollable |
| Reading Pane | flexible | 400px | Full content display |

### Responsive Behavior

- **Desktop (>1024px):** Full 3-column layout
- **Tablet (768-1024px):** Sidebar becomes collapsible icons
- **Mobile (<768px):** Stacked layout with slide-in navigation

## Component Structure

```
src/lib/components/
├── layout/
│   ├── AppShell.svelte          # Main layout wrapper
│   ├── Header.svelte            # Top app bar
│   ├── Sidebar.svelte           # Left navigation (collapsible)
│   ├── MailList.svelte          # Email list panel
│   ├── ReadingPane.svelte       # Content display panel
│   └── Resizer.svelte           # Panel resize handle
├── ui/                          # Reusable UI components (Skeleton)
│   ├── Button.svelte
│   ├── Input.svelte
│   ├── Avatar.svelte
│   └── Separator.svelte
└── mail/
    ├── MailItem.svelte          # Single mail list item
    └── MailContent.svelte       # Mail body display
```

## State Management (Svelte 5 Runes)

```typescript
// Global app state
let selectedMail = $state<Mail | null>(null);
let sidebarCollapsed = $state(false);
let panelWidths = $state({ sidebar: 250, list: 350 });

// Local storage persistence for panel widths
function savePanelWidths() {
  localStorage.setItem('panelWidths', JSON.stringify(panelWidths));
}
```

## Design Tokens (Tailwind)

```css
/* Notion-inspired color palette */
--bg-primary: #FFFFFF;
--bg-secondary: #F7F7F5;
--bg-hover: #EFEFEF;
--border-color: #E0E0E0;
--text-primary: #37352F;
--text-secondary: #787774;
--accent: #2EAADC;
```

## Accessibility

- Keyboard navigation for all panels
- ARIA labels for icon buttons
- Focus management on panel resize
- Minimum touch target: 44px
- Semantic HTML structure

## Next Steps

1. Initialize Tauri + Svelte 5 project
2. Configure Tailwind CSS and Skeleton UI
3. Implement AppShell with 3-column layout
4. Build resizable panel system
5. Add responsive behavior
