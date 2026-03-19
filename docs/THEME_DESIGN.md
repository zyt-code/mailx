# MailX Theme: Apple Mail + Notion

## Design Philosophy

The **Apple Mail + Notion** theme creates a refined, native-feeling email client that combines the best of Apple's design language with Notion's minimalist approach. Clean, crisp, and purposefully lightweight.

### Key Principles

- **Light & Crisp**: Clean whites and subtle grays, no visual weight
- **Native Feel**: Uses system fonts, native-style shadows, and familiar interactions
- **Subtle Animation**: Smooth 120-150ms transitions, never distracting
- **Generous Whitespace**: Let content breathe with smart spacing
- **Familiar Colors**: Apple blue (#007aff) as primary accent

---

## Color Palette

### Background Colors

| Variable | Value | Usage |
|----------|-------|-------|
| `--bg-primary` | `#ffffff` | Main background, reading pane |
| `--bg-secondary` | `#f7f6f5` | Sidebar, secondary panels |
| `--bg-tertiary` | `#f0f0f0` | Hover states, inputs |
| `--bg-hover` | `#f5f5f5` | Interactive hover |
| `--bg-active` | `#e8e8e8` | Active/selected states |
| `--bg-selected` | `#eaf3ff` | Selected mail item (blue tint) |

### Text Colors

| Variable | Value | Usage |
|----------|-------|-------|
| `--text-primary` | `#1d1d1f` | Headings, important text |
| `--text-secondary` | `#6e6e73` | Body text, labels |
| `--text-tertiary` | `#86868b` | Metadata, timestamps |
| `--text-quaternary` | `#aeaeb2` | Disabled states |

### Accent Colors

| Variable | Value | Usage |
|----------|-------|-------|
| `--accent-primary` | `#007aff` | Primary actions, links (Apple blue) |
| `--accent-secondary` | `#0051d5` | Hover states |
| `--accent-light` | `#e5f1ff` | Backgrounds, highlights |
| `--accent-muted` | `#d1e3ff` | Borders, subtle accents |

### Semantic Colors

| Variable | Value | Usage |
|----------|-------|-------|
| `--success` | `#34c759` | Success states |
| `--warning` | `#ff9500` | Warning states |
| `--error` | `#ff3b30` | Error, delete actions |
| `--success-light` | `#e8f5ed` | Subtle success fills, focus rings |
| `--warning-light` | `#fff5e6` | Low-contrast warning backgrounds |
| `--error-light` | `#ffebee` | Destructive hover and hint states |

---

## Typography System

### Font Families

Using native system fonts for authentic feel:

```css
--font-display: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', system-ui, sans-serif;
--font-body: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', system-ui, sans-serif;
--font-mono: 'SF Mono', 'SF Mono Regular', 'Cascadia Code', 'Consolas', monospace;
```

### Font Sizes

| Context | Size | Weight | Letter-spacing |
|---------|------|--------|----------------|
| Email subject | 20px | Semibold (600) | -0.02em |
| Navigation | 13px | Medium (500) | -0.01em |
| Body text | 13px | Regular (400) | -0.01em |
| Metadata | 11px | Regular (400) | normal |
| Labels | 10px | Semibold (600) | normal |

---

## Component Design

### 1. Sidebar

**Widths**: Expanded: 240px | Collapsed: 56px

**Key Elements**:
- **Compose Button**: Apple blue background, subtle shadow, scale animation on active
- **Active Folder**: Light gray background (not blue), no decorative elements
- **Account Indicators**: Circular avatars with color coding
- **Settings**: Bottom placement with subtle rotate animation on hover

**Spacing**:
- Item padding: 10px vertical, 10px horizontal
- Gap between sections: 8px
- Icon size: 17px

### 2. Mail List

**Width**: 320px (resizable, min 280px)

**Mail Item Design**:
- Height: 78px (compact)
- Border: None, uses background color changes
- Selected state: Light blue tint (#eaf3ff)
- Unread indicator: Blue dot (#007aff)
- Hover: Subtle background shift

**Typography Hierarchy**:
1. Sender: 13px, semibold if unread
2. Subject: 13px, semibold if unread
3. Preview: 12px, 2-line clamp, gray
4. Time: 11px, tabular nums

**Animation**:
- Hover: 120ms ease
- Selection: 120ms cubic-bezier(0.4, 0, 0.2, 1)

### 3. Reading Pane

**Layout**:
- Max content width: 680px
- Padding: 24px vertical, horizontal auto

**Header Structure**:
1. Subject: 20px semibold, tight tracking
2. Meta row: Avatar + sender info + details toggle
3. Actions toolbar: Sticky, minimal

**Typography**:
- Subject: 20px, semibold, -0.02em letter-spacing
- Sender: 14px, semibold
- Metadata: 12px, muted color

---

## Layout Blueprint

The application is a **three-column flexible shell**:

1. **Sidebar**: `--spacing-sidebar` (240px) when expanded, collapses to 56px and reveals only icons. On touch widths (`≤768px`) it slides over content with a glassy backdrop.
2. **Mail List Panel**: Starts at `--spacing-mail-list` (320px) and can be resized via the divider. Enforce `MIN_MAIL_WIDTH = 280px` and `MIN_READING_WIDTH = 400px` so content never feels cramped.
3. **Reading Pane**: Fills remaining width, capped at 680px content to maintain focus. Center content with generous horizontal auto margins at large desktop widths.

The `src/lib/components/layout/AppShell.svelte` component is responsible for:

- Persisting sidebar collapse + mail list width to `localStorage`.
- Handling mobile breakpoint detection to swap between list/reading views.
- Injecting the `.dark` class at the `document.documentElement` level (via `themeStore`) so all CSS variables update instantly.

When implementing new panels or modals:

- Use spacing tokens (`var(--spacing-*)`) for structural paddings.
- Prefer CSS grids/flex layouts that let the design breathe (avoid dense borders).
- Keep panel transitions capped at 150ms and use `cubic-bezier(0.4, 0, 0.2, 1)` to mimic native feel.

---

## Visual Details

### Borders

Minimal, subtle borders:

```css
--border-primary: #e5e5e7;
--border-secondary: #ebebed;
--border-tertiary: #f2f2f2;
```

### Shadows

Very subtle, barely visible:

```css
--shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.02);
--shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02);
--shadow-md: 0 4px 6px rgba(0, 0, 0, 0.04), 0 2px 4px rgba(0, 0, 0, 0.02);
--shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.04), 0 4px 6px rgba(0, 0, 0, 0.02);
--shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.05), 0 8px 10px rgba(0, 0, 0, 0.02);
```

### Border Radius

```css
--radius-xs: 4px;   /* Small elements */
--radius-sm: 6px;   /* Buttons, inputs */
--radius-md: 8px;   /* Cards */
--radius-lg: 12px;  /* Large cards */
--radius-xl: 16px;  /* Overlays, modals */
--radius-full: 9999px; /* Pills, unread indicators */
```

### Spacing & Motion Tokens

| Token | Default | Purpose |
|-------|---------|---------|
| `--spacing-sidebar` | `240px` | Expanded sidebar width (collapsed: 56px) |
| `--spacing-mail-list` | `320px` | Starting mail list width (min: 280px) |
| `--duration-fast` | `100ms` | Icon taps, ghost buttons |
| `--duration-normal` | `120ms` | Mail hover, nav selection |
| `--duration-slow` | `150ms` | Panel transitions, modal fades |

These live in `src/app.css` so changing the variable instantly alters layout defaults after reload. The AppShell reads the sidebar/mail list widths to seed resize math.

---

## Interactive States

### Buttons

**Primary (Compose)**:
- Default: Blue background, white text
- Hover: Darker blue + shadow
- Active: Scale down to 0.98

**Ghost (Toolbar)**:
- Default: Transparent
- Hover: Light gray background
- Active: Slightly darker gray

### Mail Items

- Default: White background
- Hover: Light gray (#f5f5f5)
- Selected: Light blue tint (#eaf3ff)

### Transitions

All interactive elements use `120-150ms cubic-bezier(0.4, 0, 0.2, 1)` for responsive, native feel.

---

## Implementation Checklist

1. **Global tokens**: Define every color, spacing, shadow, radius, and duration token inside `src/app.css` under the `:root` (and `.dark`) scopes. This single source of truth keeps Tailwind + inline styles consistent.
2. **Layout components**: 
   - `AppShell.svelte` must use `--spacing-sidebar` and `--spacing-mail-list` for initial widths and enforce the min width constraints noted above.
   - `Sidebar.svelte` should reflect collapsed vs expanded states with the neutral grays (bg-secondary/active) and compose button accent rules.
   - `Resizer.svelte` keeps the divider at 1px with hover feedback using `--bg-hover`.
3. **Mail list & reading pane**: 
   - Respect typography hierarchy (sender/subject/preview/time) defined earlier.
   - Selected rows apply `--bg-selected`, hover uses `--bg-hover`, and unread dots use `--accent-primary`.
4. **Reading experience**: `MailHeader.svelte` + `MailActions.svelte` should stick to the spacing rules (24px horizontal rhythm, 20px subject size) and use ghost buttons with the precise hover styles.
5. **Dark mode**: `themeStore.ts` toggles `.dark` class; every custom color or border must reference the CSS variables so the palette swaps automatically.

Treat this checklist as acceptance criteria during implementation and PR review.

---

## Animations

### Shimmer (Sync Loading)

```css
@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(400%); }
}
```

### Scale In

```css
@keyframes scale-in {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
```

### Slide In Right

```css
@keyframes slide-in-right {
  from {
    opacity: 0;
    transform: translateX(10px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
```

---

## Special Effects

### Sidebar Active State

Clean gray background, no decorative elements:

```css
.sidebar-active {
  background: var(--bg-active) !important;
  color: var(--text-primary) !important;
}
```

### Unread Dot

Simple blue circle:

```css
.unread-dot {
  width: 8px;
  height: 8px;
  background: var(--accent-primary);
  border-radius: 50%;
}
```

### Scrollbar

Native-style thin scrollbar:

```css
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.15);
  border-radius: 4px;
}
```

---

## Dark Mode

Complete dark mode variant:

- Background shifts to dark grays (#1c1c1e)
- Text inverts to light grays
- Blue accent shifts slightly lighter (#0a84ff)
- All borders and shadows adjust

Enable by adding `.dark` class to any parent element.

---

## Customization Guide

### Changing Accent Color

Update CSS variables in `app.css`:

```css
:root {
  --accent-primary: #YOUR_COLOR;
  --accent-secondary: #YOUR_DARKER shade;
  --accent-light: #YOUR_VERY_LIGHT shade;
}
```

### Adjusting Spacing

For more compact UI:

```css
:root {
  --spacing-sidebar: 200px;
  --spacing-mail-list: 280px;
}
```

For more spacious UI:

```css
:root {
  --spacing-sidebar: 280px;
  --spacing-mail-list: 380px;
}
```

### Animation Speed

For faster animations (snappier):

```css
button, a, input, textarea, select {
  transition-duration: 80ms;
}
```

For slower animations (smoother):

```css
button, a, input, textarea, select {
  transition-duration: 200ms;
}
```

---

## Accessibility

- All text meets WCAG AA contrast requirements
- Focus states use 2px blue outline with offset
- Interactive elements have minimum 44px touch targets
- Semantic HTML maintained throughout
- ARIA labels for icon-only buttons

---

## Browser Compatibility

- Modern browsers (Chrome, Firefox, Safari, Edge)
- CSS custom properties (variables) required
- System fonts for native feel
- Graceful degradation for older browsers

---

## File Structure

```
src/
├── app.css                          # Main theme file
├── lib/
│   └── components/
│       ├── layout/
│       │   ├── AppShell.svelte      # Main layout wrapper
│       │   ├── Sidebar.svelte       # Navigation sidebar
│       │   ├── MailList.svelte      # Email list panel
│       │   └── ReadingPane.svelte   # Content display
│       └── mail/
│           ├── MailHeader.svelte    # Email header
│           └── MailActions.svelte   # Action toolbar
```

---

## Design Tokens Reference

All design tokens are defined as CSS custom properties in `app.css`:

```css
/* Spacing */
var(--spacing-sidebar)
var(--spacing-mail-list)

/* Colors */
var(--bg-*)
var(--text-*)
var(--accent-*)
var(--border-*)

/* Effects */
var(--shadow-*)
var(--radius-*)
```

---

## Key Differences from Previous Theme

| Aspect | Previous | Current |
|--------|----------|---------|
| Colors | Warm terracotta, cream | Clean blue, white |
| Fonts | Instrument Serif + DM Sans | System fonts only |
| Visual Weight | Heavy, paper textures | Light, no textures |
| Borders | Visible, warm gray | Minimal, subtle |
| Animations | 180ms | 120ms (snappier) |
| Spacing | More generous | Compact, efficient |
| Mail Item | 96px with border | 78px no border |
| Selected State | Accent background | Blue tint background |

---

## Future Enhancements

Potential additions:

1. **Compact mode** for high-density information display
2. **Large text mode** for accessibility
3. **Custom accent colors** via user preferences
4. **Animation preferences** (reduce motion)
5. **Sidebar position** (left/right)
