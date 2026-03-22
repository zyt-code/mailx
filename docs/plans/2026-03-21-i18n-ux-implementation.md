# Mailx 国际化 UI/UX 实施设计

**Document Version:** 1.0.0
**Created:** 2026-03-21
**Related:** 2026-03-21-i18n-strategic-design.md
**Status:** Detailed UX Design

---

## 📐 UI/UX 交互设计详细规范

### 1. 语言设置页面设计

#### 1.1 页面结构

**路由：** `/settings/language`

**完整页面布局：**

```
┌──────────────────────────────────────────────────────────────────┐
│  Mailx                                    [←] [×]                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  🌐 Language & Region                                    │    │
│  │                                                           │    │
│  │  Choose your preferred language for Mailx.               │    │
│  │  Changes take effect immediately.                        │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  ◉ Auto-detect from system                              │    │
│  │     ✓ Currently using: 简体中文                           │    │
│  │     📝 System language: 中文 (中国)                      │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  ○ English                                              │    │
│  │     English - United States                             │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  ○ 简体中文                                             │    │
│  │     Chinese (Simplified) - 中国大陆                      │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  ○ 繁體中文                                             │    │
│  │     Chinese (Traditional) - 台灣/香港                    │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  ○ 日本語                                               │    │
│  │     Japanese - 日本                                     │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  ○ 한국어                                               │    │
│  │     Korean - 대한민국                                    │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  ○ Show all languages...                                │    │
│  │     [▾]                                                  │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

#### 1.2 组件代码实现

**文件：** `src/routes/settings/language/+page.svelte`

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { Globe, Check, ChevronDown, Info } from 'lucide-svelte';
  import { i18nStore, SUPPORTED_LOCALES, type SupportedLocale } from '$lib/stores/i18nStore';
  import { preferences } from '$lib/stores/preferencesStore';

  let currentLocale = $state<SupportedLocale>('en');
  let autoDetect = $state(true);
  let showAllLanguages = $state(false);
  let isChanging = $state(false);
  let showConfirmDialog = $state(false);
  let pendingLocale = $state<SupportedLocale | null>(null);

  // 获取系统语言信息
  let systemLocale = $state<string>('');
  let systemLocaleName = $state<string>('');

  $effect(() => {
    // 从 i18nStore 读取当前语言设置
    const unsubscribe = i18nStore.subscribe((locale) => {
      currentLocale = locale;
    });
    return unsubscribe;
  });

  $effect(() => {
    // 从 preferences 读取自动检测设置
    const unsubscribe = preferences.subscribe((prefs) => {
      autoDetect = prefs.language?.autoDetect ?? true;
    });
    return unsubscribe;
  });

  onMount(() => {
    // 获取系统语言
    systemLocale = navigator.language;
    systemLocaleName = getSystemLocaleName(systemLocale);

    // 更新 HTML lang 属性
    document.documentElement.lang = currentLocale;
  });

  function getSystemLocaleName(locale: string): string {
    try {
      const displayNames = new Intl.DisplayNames([locale], { type: 'language' });
      return displayNames.of(locale.split('-')[0]) ?? locale;
    } catch {
      return locale;
    }
  }

  function handleLanguageSelect(localeCode: SupportedLocale) {
    if (localeCode === currentLocale) return;

    pendingLocale = localeCode;

    // 显示确认对话框
    showConfirmDialog = true;
  }

  async function confirmLanguageChange() {
    if (!pendingLocale) return;

    isChanging = true;
    showConfirmDialog = false;

    try {
      await i18nStore.setLocale(pendingLocale);

      // 更新 preferences
      preferences.updateSection('language', {
        locale: pendingLocale,
        autoDetect: false
      });

      // 更新 HTML lang 属性
      document.documentElement.lang = pendingLocale;
    } catch (error) {
      console.error('Failed to change language:', error);
      // 显示错误提示
    } finally {
      isChanging = false;
      pendingLocale = null;
    }
  }

  function handleAutoDetectChange() {
    const newValue = !autoDetect;

    if (newValue) {
      // 启用自动检测
      i18nStore.detectSystemLocale();
      preferences.updateSection('language', {
        autoDetect: true
      });
    } else {
      // 禁用自动检测，保持当前语言
      preferences.updateSection('language', {
        locale: currentLocale,
        autoDetect: false
      });
    }

    autoDetect = newValue;
  }

  function toggleShowAllLanguages() {
    showAllLanguages = !showAllLanguages;
  }

  // 常用语言（优先显示）
  const commonLocales: SupportedLocale[] = ['en', 'zh-CN', 'zh-TW', 'ja', 'ko'];

  // 其他语言
  const otherLocales = SUPPORTED_LOCALES
    .filter(l => !commonLocales.includes(l.code))
    .map(l => l.code);
</script>

<div class="language-settings-page">
  <!-- 页面头部 -->
  <header class="page-header">
    <div class="header-icon">
      <Globe class="size-6" strokeWidth={1.55} />
    </div>
    <div>
      <p class="page-kicker">Language & Region</p>
      <h1 class="page-title">Choose your language</h1>
      <p class="page-subtitle">
        Changes take effect immediately across all of Mailx.
      </p>
    </div>
  </header>

  <!-- 语言选项列表 -->
  <section class="language-section">
    <!-- 自动检测选项 -->
    <button
      class="language-option auto-detect-option"
      class:active={autoDetect}
      onclick={handleAutoDetectChange}
      disabled={isChanging}
    >
      <div class="language-content">
        <div class="language-info">
          <p class="language-name">Auto-detect from system</p>
          <p class="language-details">
            {#if autoDetect}
              <span class="status-indicator success">✓</span>
              Currently using: {SUPPORTED_LOCALES.find(l => l.code === currentLocale)?.nativeName}
            {:else}
              Click to enable automatic detection
            {/if}
          </p>
          <p class="system-info">
            📝 System language: {systemLocaleName}
          </p>
        </div>
        {#if autoDetect}
          <div class="check-badge">
            <Check class="size-4" strokeWidth={2.2} />
          </div>
        {/if}
      </div>
    </button>

    <div class="section-divider"></div>

    <!-- 常用语言列表 -->
    {#each commonLocales as localeCode}
      {@const locale = SUPPORTED_LOCALES.find(l => l.code === localeCode)}
      {#if locale}
        <button
          class="language-option"
          class:active={currentLocale === locale.code && !autoDetect}
          onclick={() => handleLanguageSelect(locale.code)}
          disabled={isChanging}
        >
          <div class="language-content">
            <div class="language-info">
              <p class="language-name">{locale.nativeName}</p>
              <p class="language-details">{locale.name}</p>
            </div>
            {#if currentLocale === locale.code && !autoDetect}
              <div class="check-badge">
                <Check class="size-4" strokeWidth={2.2} />
              </div>
            {/if}
          </div>
        </button>
      {/if}
    {/each}

    <!-- 显示更多语言 -->
    {#if showAllLanguages}
      <div class="section-divider"></div>
      {#each otherLocales as localeCode}
        {@const locale = SUPPORTED_LOCALES.find(l => l.code === localeCode)}
        {#if locale}
          <button
            class="language-option"
            class:active={currentLocale === locale.code && !autoDetect}
            onclick={() => handleLanguageSelect(locale.code)}
            disabled={isChanging}
          >
            <div class="language-content">
              <div class="language-info">
                <p class="language-name">{locale.nativeName}</p>
                <p class="language-details">{locale.name}</p>
              </div>
              {#if currentLocale === locale.code && !autoDetect}
                <div class="check-badge">
                  <Check class="size-4" strokeWidth={2.2} />
                </div>
              {/if}
            </div>
          </button>
        {/if}
      {/each}
    {/if}

    <!-- 展开/收起按钮 -->
    <button
      class="show-more-button"
      onclick={toggleShowAllLanguages}
    >
      <span>{showAllLanguages ? 'Show less' : `Show all ${SUPPORTED_LOCALES.length} languages`}</span>
      <ChevronDown class="size-4" class:rotate-180={showAllLanguages} />
    </button>
  </section>

  <!-- 信息提示 -->
  <div class="info-banner">
    <Info class="size-4" />
    <p>
      Some third-party content may not be available in all languages.
      Keyboard shortcuts are not affected by language settings.
    </p>
  </div>
</div>

<!-- 确认对话框 -->
{#if showConfirmDialog}
  <div class="dialog-overlay" onclick={() => showConfirmDialog = false}>
    <div class="dialog-box" onclick={(e) => e.stopPropagation()}>
      <h3>Change language?</h3>
      <p>
        Are you sure you want to change the language to
        <strong>{SUPPORTED_LOCALES.find(l => l.code === pendingLocale)?.nativeName}</strong>?
      </p>
      <div class="dialog-actions">
        <button
          class="button-secondary"
          onclick={() => showConfirmDialog = false}
          disabled={isChanging}
        >
          Cancel
        </button>
        <button
          class="button-primary"
          onclick={confirmLanguageChange}
          disabled={isChanging}
        >
          {#if isChanging}
            Changing...
          {:else}
            Change Language
          {/if}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .language-settings-page {
    display: grid;
    gap: 1.5rem;
    padding: 2rem;
    max-width: 800px;
    margin: 0 auto;
    animation: fadeIn 0.3s ease-out;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .page-header {
    display: flex;
    gap: 1rem;
    align-items: flex-start;
    margin-bottom: 0.5rem;
  }

  .header-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 3.2rem;
    height: 3.2rem;
    border-radius: 20px;
    background: linear-gradient(135deg, color-mix(in srgb, var(--accent-primary) 18%, white), color-mix(in srgb, var(--accent-light) 92%, white));
    color: var(--accent-primary);
    box-shadow: var(--shadow-sm);
    flex-shrink: 0;
  }

  .page-kicker {
    margin: 0 0 0.25rem;
    font-size: 0.74rem;
    font-weight: 700;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--accent-primary);
  }

  .page-title {
    margin: 0;
    font-size: clamp(1.8rem, 2.2vw, 2.45rem);
    font-weight: 720;
    letter-spacing: -0.05em;
  }

  .page-subtitle {
    margin: 0.45rem 0 0;
    color: var(--text-secondary);
    font-size: 0.96rem;
    line-height: 1.6;
  }

  .language-section {
    display: grid;
    gap: 0.75rem;
  }

  .language-option {
    display: block;
    width: 100%;
    padding: 1rem 1.25rem;
    border: 1px solid color-mix(in srgb, var(--border-primary) 90%, transparent);
    border-radius: 16px;
    background: color-mix(in srgb, var(--bg-secondary) 62%, transparent);
    cursor: pointer;
    transition: all 0.2s ease;
    text-align: left;
  }

  .language-option:hover:not(:disabled) {
    border-color: color-mix(in srgb, var(--accent-primary) 22%, var(--border-primary));
    transform: translateY(-1px);
    box-shadow: var(--shadow-sm);
  }

  .language-option.active {
    background: color-mix(in srgb, var(--accent-light) 85%, var(--bg-primary));
    border-color: color-mix(in srgb, var(--accent-primary) 28%, var(--border-primary));
  }

  .language-option:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .auto-detect-option {
    background: linear-gradient(135deg,
      color-mix(in srgb, var(--accent-light) 15%, var(--bg-secondary)),
      color-mix(in srgb, var(--accent-primary) 8%, var(--bg-secondary))
    );
  }

  .language-content {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
  }

  .language-info {
    flex: 1;
    min-width: 0;
  }

  .language-name {
    margin: 0 0 0.25rem;
    font-size: 0.95rem;
    font-weight: 620;
    letter-spacing: -0.02em;
    color: var(--text-primary);
  }

  .language-details {
    margin: 0 0 0.25rem;
    font-size: 0.8rem;
    color: var(--text-secondary);
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .status-indicator {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.125rem 0.5rem;
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 540;
  }

  .status-indicator.success {
    background: color-mix(in srgb, #22c55e 12%, transparent);
    color: #16a34a;
  }

  .system-info {
    margin: 0;
    font-size: 0.75rem;
    color: var(--text-tertiary);
  }

  .check-badge {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.5rem;
    height: 1.5rem;
    border-radius: 999px;
    background: var(--accent-primary);
    color: white;
    flex-shrink: 0;
    animation: checkPop 0.3s cubic-bezier(0.2, 0, 0, 1);
  }

  @keyframes checkPop {
    0% {
      transform: scale(0);
      opacity: 0;
    }
    80% {
      transform: scale(1.1);
    }
    100% {
      transform: scale(1);
      opacity: 1;
    }
  }

  .section-divider {
    height: 1px;
    background: color-mix(in srgb, var(--border-primary) 50%, transparent);
    margin: 0.5rem 0;
  }

  .show-more-button {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.75rem;
    border: none;
    border-radius: 12px;
    background: transparent;
    color: var(--accent-primary);
    font-size: 0.875rem;
    font-weight: 540;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .show-more-button:hover {
    background: color-mix(in srgb, var(--accent-light) 25%, transparent);
  }

  .show-more-button .rotate-180 {
    transform: rotate(180deg);
  }

  .info-banner {
    display: flex;
    gap: 0.75rem;
    padding: 1rem 1.25rem;
    background: color-mix(in srgb, var(--accent-light) 15%, var(--bg-secondary));
    border: 1px solid color-mix(in srgb, var(--accent-primary) 15%, transparent);
    border-radius: 12px;
    color: var(--text-secondary);
    font-size: 0.875rem;
    line-height: 1.6;
  }

  .info-banner svg {
    flex-shrink: 0;
    color: var(--accent-primary);
    margin-top: 0.125rem;
  }

  /* 对话框样式 */
  .dialog-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    animation: dialogFadeIn 0.2s ease-out;
  }

  @keyframes dialogFadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .dialog-box {
    background: var(--bg-primary);
    border-radius: 20px;
    padding: 1.5rem;
    min-width: 400px;
    max-width: 90vw;
    box-shadow: var(--shadow-xl);
    animation: dialogSlideUp 0.3s cubic-bezier(0.2, 0, 0, 1);
  }

  @keyframes dialogSlideUp {
    from {
      transform: translateY(20px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  .dialog-box h3 {
    margin: 0 0 0.75rem;
    font-size: 1.25rem;
    font-weight: 620;
  }

  .dialog-box p {
    margin: 0 0 1.5rem;
    color: var(--text-secondary);
    line-height: 1.6;
  }

  .dialog-actions {
    display: flex;
    gap: 0.75rem;
    justify-content: flex-end;
  }

  .button-primary,
  .button-secondary {
    padding: 0.625rem 1.25rem;
    border-radius: 10px;
    font-size: 0.875rem;
    font-weight: 540;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .button-primary {
    background: var(--accent-primary);
    color: white;
    border: none;
  }

  .button-primary:hover:not(:disabled) {
    background: var(--accent-secondary);
    transform: translateY(-1px);
  }

  .button-secondary {
    background: var(--bg-secondary);
    color: var(--text-primary);
    border: 1px solid var(--border-primary);
  }

  .button-secondary:hover:not(:disabled) {
    background: var(--bg-hover);
  }

  .button-primary:disabled,
  .button-secondary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
</style>
```

---

### 2. 现有组件改造指南

#### 2.1 Sidebar 组件改造

**原代码：** `src/lib/components/layout/Sidebar.svelte`

**改造前（硬编码文本）：**
```typescript
const navItems = [
  { icon: Inbox, label: 'Inbox', folder: 'inbox' },
  { icon: Send, label: 'Sent', folder: 'sent' },
  { icon: FileEdit, label: 'Drafts', folder: 'drafts' },
  { icon: Archive, label: 'Archive', folder: 'archive' },
  { icon: Trash2, label: 'Trash', folder: 'trash' }
];
```

**改造后（使用翻译）：**
```typescript
import { _ } from 'svelte-i18n';

// 使用 $derived 让翻译响应语言变化
const navItems = $derived([
  { icon: Inbox, label: $_('nav.inbox'), folder: 'inbox' },
  { icon: Send, label: $_('nav.sent'), folder: 'sent' },
  { icon: FileEdit, label: $_('nav.drafts'), folder: 'drafts' },
  { icon: Archive, label: $_('nav.archive'), folder: 'archive' },
  { icon: Trash2, label: $_('nav.trash'), folder: 'trash' }
] as const);
```

**HTML 模板改造：**

**改造前：**
```svelte
<button aria-label="New Message">
  <SquarePen class="size-[15px]" strokeWidth={1.8} />
  <span>New Message</span>
</button>
```

**改造后：**
```svelte
<button aria-label={$_('nav.newMessage')}>
  <SquarePen class="size-[15px]" strokeWidth={1.8} />
  <span>{$_('nav.newMessage')}</span>
</button>
```

#### 2.2 Settings 页面改造

**改造清单：**

| 组件 | 原文本 | 翻译键 | 优先级 |
|------|--------|--------|--------|
| Settings 导航 | "Settings" | `settings.title` | P0 |
| Accounts | "Accounts" | `settings.accounts` | P0 |
| Appearance | "Appearance" | `settings.appearance` | P0 |
| Theme - Light | "Light" | `theme.light` | P0 |
| Theme - Dark | "Dark" | `theme.dark` | P0 |
| Theme - System | "System" | `theme.system` | P0 |
| Language | "Language" | `settings.language` | P0 |

**改造示例：**

```svelte
<!-- 改造前 -->
<h2>Accounts</h2>
<p>Add your email account to get started</p>

<!-- 改造后 -->
<h2>{$_('settings.accounts')}</h2>
<p>{$_('account.add.description')}</p>
```

#### 2.3 表单组件改造

**日期格式化：**

```typescript
// 改造前
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

// 改造后
import { getLocale } from 'svelte-i18n';

function formatDate(date: Date): string {
  const locale = getLocale();
  return date.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}
```

**数字格式化：**

```typescript
// 改造前
function formatCount(count: number): string {
  return count.toLocaleString('en-US');
}

// 改造后
import { getLocale } from 'svelte-i18n';

function formatCount(count: number): string {
  const locale = getLocale();
  return count.toLocaleString(locale);
}
```

---

### 3. 语言切换动画效果

#### 3.1 切换时的过渡效果

**CSS 动画：**

```css
/* 语言切换时的文本淡入淡出 */
.i18n-text-transition {
  transition: opacity 0.2s ease-in-out;
}

.language-changing .i18n-text-transition {
  opacity: 0.5;
}

/* 语言切换时的布局平滑过渡 */
.i18n-layout-transition {
  transition: all 0.3s cubic-bezier(0.2, 0, 0, 1);
}
```

**Svelte 实现：**

```svelte
<script lang="ts">
  import { locale } from 'svelte-i18n';
  import { onMount } from 'svelte';

  let isLanguageChanging = $state(false);
  let changeTimeout: ReturnType<typeof setTimeout>;

  $effect(() => {
    const unsubscribe = locale.subscribe(() => {
      // 语言开始变化
      isLanguageChanging = true;

      // 清除之前的定时器
      if (changeTimeout) clearTimeout(changeTimeout);

      // 300ms 后标记为完成
      changeTimeout = setTimeout(() => {
        isLanguageChanging = false;
      }, 300);
    });

    return unsubscribe;
  });
</script>

<div class:language-changing={isLanguageChanging}>
  <p class="i18n-text-transition">
    {$_('nav.inbox')}
  </p>
</div>
```

#### 3.2 加载状态指示

**骨架屏效果：**

```svelte
{#if isLanguageChanging}
  <div class="skeleton-text"></div>
{:else}
  <p>{$_('nav.inbox')}</p>
{/if}

<style>
  .skeleton-text {
    height: 1em;
    width: 80%;
    background: linear-gradient(
      90deg,
      var(--bg-secondary) 0%,
      var(--bg-hover) 50%,
      var(--bg-secondary) 100%
    );
    background-size: 200% 100%;
    animation: skeleton-loading 1.5s ease-in-out infinite;
    border-radius: 4px;
  }

  @keyframes skeleton-loading {
    0% {
      background-position: 200% 0;
    }
    100% {
      background-position: -200% 0;
    }
  }
</style>
```

---

### 4. 键盘快捷键国际化

#### 4.1 快捷键提示

**问题：** 快捷键本身不国际化，但提示文本需要国际化

**解决方案：**

```typescript
// 快捷键配置（不变）
const shortcuts = {
  compose: { key: 'c', description: 'nav.newMessage' },
  refresh: { key: 'r', description: 'nav.refresh' },
  settings: { key: ',', mod: true, description: 'nav.settings' }
};

// 显示时翻译
{#if showShortcutHints}
  <span class="shortcut-hint">
    <kbd>{shortcut.key}</kbd>
    <span>{$_(shortcut.description)}</span>
  </span>
{/if}
```

#### 4.2 快捷键帮助面板

```svelte
<!-- 快捷键帮助面板 -->
<div class="keyboard-shortcuts-panel">
  <h3>{$_('keyboard.title')}</h3>

  <div class="shortcut-group">
    <h4>{$_('keyboard.mail')}</h4>
    {#each mailShortcuts as shortcut}
      <div class="shortcut-item">
        <kbd>{shortcut.key}</kbd>
        <span>{$_(shortcut.description)}</span>
      </div>
    {/each}
  </div>
</div>
```

---

### 5. 可访问性 (Accessibility) 考量

#### 5.1 ARIA 标签国际化

```svelte
<!-- 确保 aria-label 也被翻译 -->
<button
  aria-label={$_('nav.inbox')}
  aria-current={activeFolder === 'inbox' ? 'page' : undefined}
>
  <Inbox class="size-[17px]" strokeWidth={1.8} />
  <span class="sr-only">{$_('nav.inbox')}</span>
</button>
```

#### 5.2 屏幕阅读器支持

```typescript
// 语言变化时通知屏幕阅读器
async function setLocale(newLocale: SupportedLocale) {
  await i18nStore.setLocale(newLocale);

  // 创建一个临时的 live region 来通知屏幕阅读器
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', 'polite');
  announcement.className = 'sr-only';
  announcement.textContent = $_('language.changed', { locale: newLocale });
  document.body.appendChild(announcement);

  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}
```

---

### 6. 性能优化策略

#### 6.1 翻译文件懒加载

```typescript
// 仅在需要时加载语言包
async function loadLocale(locale: SupportedLocale) {
  if (loadedLocales.has(locale)) {
    return;
  }

  try {
    const messages = await import(`../i18n/locales/${locale}.ts`);
    register(locale, messages.default);
    loadedLocales.add(locale);
  } catch (e) {
    console.error(`Failed to load locale ${locale}:`, e);
  }
}
```

#### 6.2 翻译缓存

```typescript
// 缓存已翻译的字符串
const translationCache = new Map<string, Map<string, string>>();

function getCachedTranslation(locale: string, key: string): string | undefined {
  return translationCache.get(locale)?.get(key);
}

function setCachedTranslation(locale: string, key: string, value: string): void {
  if (!translationCache.has(locale)) {
    translationCache.set(locale, new Map());
  }
  translationCache.get(locale)!.set(key, value);
}
```

---

### 7. 测试策略

#### 7.1 视觉回归测试

```typescript
// 测试不同语言下的组件渲染
describe('Sidebar i18n', () => {
  const locales: SupportedLocale[] = ['en', 'zh-CN', 'ja'];

  locales.forEach(locale => {
    it(`should render correctly in ${locale}`, async () => {
      await setLocale(locale);
      render(Sidebar);

      // 检查翻译文本是否正确显示
      expect(screen.getByText(I18N[locale].nav.inbox)).toBeInTheDocument();

      // 截图对比
      expect(container).toMatchScreenshot(`sidebar-${locale}.png`);
    });
  });
});
```

#### 7.2 翻译完整性测试

```typescript
// 确保所有语言都有相同的翻译键
describe('Translation completeness', () => {
  const baseLocale = 'en';
  const baseKeys = Object.keys(flattenKeys(locales[baseLocale]));

  SUPPORTED_LOCALES.forEach(({ code }) => {
    if (code === baseLocale) return;

    it(`${code} should have all translations from ${baseLocale}`, () => {
      const localeKeys = Object.keys(flattenKeys(locales[code]));
      const missingKeys = baseKeys.filter(key => !localeKeys.includes(key));

      expect(missingKeys).toEqual([]);
      expect(localeKeys.length).toBe(baseKeys.length);
    });
  });
});
```

---

## 附录：组件改造优先级清单

### P0 - Sprint 2（核心功能）
- [ ] `Sidebar.svelte` - 导航菜单
- [ ] `Titlebar.svelte` - 窗口标题
- [ ] `settings/+page.svelte` - 设置主页
- [ ] `settings/language/+page.svelte` - 语言设置页（新建）

### P1 - Sprint 3（用户体验）
- [ ] `MailList.svelte` - 邮件列表
- [ ] `MailActions.svelte` - 邮件操作
- [ ] `ComposeModal.svelte` - 写邮件
- [ ] `settings/accounts/+page.svelte` - 账户设置

### P2 - Sprint 4（完善细节）
- [ ] `settings/appearance/+page.svelte` - 外观设置
- [ ] `settings/keyboard/+page.svelte` - 键盘设置
- [ ] `settings/notifications/+page.svelte` - 通知设置
- [ ] `settings/privacy/+page.svelte` - 隐私设置

---

**文档维护：**
本文档与战略设计文档同步更新。所有 UX 变更都需要更新本文档。

**最后更新：** 2026-03-21
