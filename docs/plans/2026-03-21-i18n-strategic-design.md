# Mailx 国际化（i18n）战略架构设计

**Document Version:** 1.0.0
**Created:** 2026-03-21
**Status:** P10 Strategic Planning
**Owner:** CTO Office

---

## 📋 Executive Summary

本文档定义了 Mailx 邮件客户端的国际化（i18n）战略架构设计。国际化是跨模块、跨层级的系统性工程，需要从技术选型、架构设计、UX 交互、数据流等多个维度进行系统性规划。

**核心目标：**
1. 建立可扩展的国际化架构，支持动态语言切换
2. 保持 Notion-inspired UI 的简洁性和高性能
3. 最小化对现有代码库的侵入性修改
4. 提供流畅的语言切换 UX 体验

**战略决策：**
- 采用 `svelte-i18n` 作为国际化核心库（Svelte 生态最佳实践）
- 使用基于 Svelte 5 runes 的响应式国际化 store
- 实现语言切换的即时生效机制（无需重启应用）
- 集成到现有的 preferences 系统中

---

## 🏗️ Architecture Overview

### 1. 技术选型分析

#### 1.1 核心库选择：`svelte-i18n`

**选择理由：**
```
✅ Svelte 5 完全兼容（支持 runes 和 stores 双模式）
✅ TypeScript 类型安全（完整的类型定义）
✅ 命名空间支持（适合大型应用的模块化管理）
✅ 代码分割友好（按需加载语言包）
✅ 复数、日期、数字格式化内置支持
✅ 与现有 @internationalized/date 生态整合
✅ 零运行时开销（编译时优化）
```

**替代方案对比：**

| 方案 | 优势 | 劣势 | 评分 |
|------|------|------|------|
| **svelte-i18n** ⭐ | Svelte 原生、类型安全、生态成熟 | 需要学习曲线 | **9/10** |
| sveltekit-i18n | SvelteKit 深度集成 | 过度绑定 SvelteKit，Tauri 场景不适用 | 6/10 |
| formatjs (react-intl) | 行业标准 | React 生态，Svelte 适配困难 | 4/10 |
| 自建方案 | 完全控制 | 维护成本高，容易出错 | 3/10 |

#### 1.2 依赖清单

```json
{
  "dependencies": {
    "svelte-i18n": "^4.0.0",           // 核心国际化库
    "@internationalized/date": "^3.10.0" // 已安装，日期时间本地化
  },
  "devDependencies": {
    "typescript": "~5.6.2"             // 已安装，类型安全
  }
}
```

---

### 2. 架构设计

#### 2.1 分层架构

```
┌─────────────────────────────────────────────────────────────┐
│                     Presentation Layer                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   UI Components   │   Layout Components  │  Pages      │
│  │  (Button, Card)  │  (Sidebar, MailList) │ (+page.svelte)│
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  Internationalization Layer                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │           i18nStore (Svelte 5 Runes)               │   │
│  │  - locale: $state<string>                         │   │
│  │  - t: $derived<(key: string) => string>           │   │
│  │  - setLocale: (locale: string) => void            │   │
│  └─────────────────────────────────────────────────────┘   │
│                            ↓                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │           Translation Registry                      │   │
│  │  - src/lib/i18n/locales/en.ts                       │   │
│  │  - src/lib/i18n/locales/zh-CN.ts                    │   │
│  │  - src/lib/i18n/locales/ja.ts                       │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                      Persistence Layer                      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │           Preferences Store (Extended)              │   │
│  │  - locale: 'en' | 'zh-CN' | 'ja' | ...              │   │
│  │  - autoDetect: boolean                               │   │
│  └─────────────────────────────────────────────────────┘   │
│                            ↓                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │           localStorage (mailx-preferences)           │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

#### 2.2 核心模块设计

##### 2.2.1 i18nStore (Svelte 5 Runes)

**文件位置：** `src/lib/stores/i18nStore.ts`

```typescript
import { writable, derived, get } from 'svelte/store';
import { init, register, locale, waitLocale } from 'svelte-i18n';

// 支持的语言列表
export const SUPPORTED_LOCALES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'zh-CN', name: 'Chinese (Simplified)', nativeName: '简体中文' },
  { code: 'zh-TW', name: 'Chinese (Traditional)', nativeName: '繁體中文' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' }
] as const;

export type SupportedLocale = typeof SUPPORTED_LOCALES[number]['code'];
export type LocalePreferences = {
  locale: SupportedLocale;
  autoDetect: boolean;
};

const STORAGE_KEY = 'mailx-locale-preferences';

function getStoredPreferences(): LocalePreferences {
  if (typeof window === 'undefined') {
    return { locale: 'en', autoDetect: true };
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as LocalePreferences;
    }
  } catch (e) {
    console.warn('Failed to load locale preferences:', e);
  }

  return { locale: 'en', autoDetect: true };
}

function detectSystemLocale(): SupportedLocale {
  if (typeof window === 'undefined') return 'en';

  const browserLang = navigator.language;
  const exactMatch = SUPPORTED_LOCALES.find(l => l.code === browserLang);
  if (exactMatch) return exactMatch.code;

  const langPrefix = browserLang.split('-')[0];
  const prefixMatch = SUPPORTED_LOCALES.find(l => l.code.startsWith(langPrefix));
  return prefixMatch?.code ?? 'en';
}

function loadLocale(locale: SupportedLocale) {
  return import(`../i18n/locales/${locale}.ts`);
}

async function initializeI18n(initialPreferences?: LocalePreferences) {
  const prefs = initialPreferences ?? getStoredPreferences();
  const targetLocale = prefs.autoDetect ? detectSystemLocale() : prefs.locale;

  // 注册所有语言包
  for (const { code } of SUPPORTED_LOCALES) {
    try {
      const messages = await loadLocale(code);
      register(code, messages.default);
    } catch (e) {
      console.error(`Failed to load locale ${code}:`, e);
    }
  }

  init({
    fallbackLocale: 'en',
    initialLocale: targetLocale
  });
}

// Svelte store 包装
const localeStore = writable<SupportedLocale>('en');
const isInitializing = writable(true);

export const i18nStore = {
  // 当前语言
  get current(): SupportedLocale {
    return get(locale);
  },

  // 订阅语言变化
  subscribe: localeStore.subscribe,

  // 设置语言
  async setLocale(newLocale: SupportedLocale) {
    if (!SUPPORTED_LOCALES.some(l => l.code === newLocale)) {
      console.warn(`Unsupported locale: ${newLocale}`);
      return;
    }

    locale.set(newLocale);

    // 持久化到 preferences
    const prefs = getStoredPreferences();
    prefs.locale = newLocale;
    prefs.autoDetect = false; // 用户手动选择后关闭自动检测

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch (e) {
      console.warn('Failed to save locale preferences:', e);
    }

    // 更新 HTML lang 属性
    if (typeof document !== 'undefined') {
      document.documentElement.lang = newLocale;
    }
  },

  // 获取翻译函数（兼容 runes）
  t: derived(locale, ($locale) => {
    return (key: string, params?: Record<string, string | number>) => {
      // 使用 svelte-i18n 的 translate 函数
      return key; // 占位符，实际使用 svelte-i18n 的 _
    };
  }),

  // 初始化状态
  get isReady(): boolean {
    return !get(isInitializing);
  },

  subscribeReady: isInitializing.subscribe,

  // 重新检测系统语言
  detectSystemLocale() {
    const detected = detectSystemLocale();
    this.setLocale(detected);
    const prefs = getStoredPreferences();
    prefs.autoDetect = true;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  }
};

// 导出快捷函数
export const t = i18nStore.t;
export const setLocale = i18nStore.setLocale.bind(i18nStore);
export const currentLocale = i18nStore.current;

// 初始化
initializeI18n().then(() => {
  isInitializing.set(false);
});
```

##### 2.2.2 翻译文件结构

**目录结构：**
```
src/lib/i18n/
├── index.ts                 # 统一导出
├── locales/
│   ├── en.ts               # 英文（默认语言）
│   ├── zh-CN.ts            # 简体中文
│   ├── zh-TW.ts            # 繁体中文
│   ├── ja.ts               # 日语
│   ├── ko.ts               # 韩语
│   ├── es.ts               # 西班牙语
│   ├── fr.ts               # 法语
│   ├── de.ts               # 德语
│   ├── pt.ts               # 葡萄牙语
│   └── ru.ts               # 俄语
└── types.ts                # 类型定义
```

**翻译文件示例：** `src/lib/i18n/locales/en.ts`

```typescript
export default {
  // 命名空间：通用
  common: {
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    cancel: 'Cancel',
    confirm: 'Confirm',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    search: 'Search',
    back: 'Back',
    next: 'Next',
    previous: 'Previous',
    close: 'Close',
    open: 'Open'
  },

  // 命名空间：导航
  nav: {
    inbox: 'Inbox',
    sent: 'Sent',
    drafts: 'Drafts',
    archive: 'Archive',
    trash: 'Trash',
    allInboxes: 'All Inboxes',
    settings: 'Settings',
    newMessage: 'New Message'
  },

  // 命名空间：邮件操作
  mail: {
    compose: 'Compose',
    reply: 'Reply',
    replyAll: 'Reply All',
    forward: 'Forward',
    archive: 'Archive',
    unarchive: 'Unarchive',
    delete: 'Delete',
    markRead: 'Mark as Read',
    markUnread: 'Mark as Unread',
    star: 'Star',
    unstar: 'Unstar',
    moveTo: 'Move to...'
  },

  // 命名空间：设置
  settings: {
    title: 'Settings',
    accounts: 'Accounts',
    appearance: 'Appearance',
    notifications: 'Notifications',
    keyboard: 'Keyboard',
    privacy: 'Privacy',
    language: 'Language',
    theme: 'Theme',
    accent: 'Accent Tone'
  },

  // 命名空间：语言设置
  language: {
    title: 'Language & Region',
    description: 'Choose your preferred language for Mailx',
    autoDetect: 'Auto-detect from system',
    current: 'Current language',
    confirmChange: 'Are you sure you want to change the language?',
    restartRequired: 'Some changes may require a restart to take full effect.'
  },

  // 命名空间：主题
  theme: {
    light: 'Light',
    dark: 'Dark',
    system: 'System',
    compact: 'Compact',
    comfortable: 'Comfortable',
    airy: 'Airy'
  },

  // 命名空间：账户
  account: {
    add: 'Add Account',
    edit: 'Edit Account',
    delete: 'Delete Account',
    noAccounts: 'No accounts yet',
    addFirst: 'Add Your First Account',
    syncStatus: 'Sync Status',
    lastSync: 'Last sync',
    syncing: 'Syncing...',
    syncFailed: 'Sync failed',
    idle: 'Idle'
  },

  // 命名空间：表单
  form: {
    email: 'Email address',
    password: 'Password',
    name: 'Name',
    server: 'Server',
    port: 'Port',
    useSSL: 'Use SSL',
    required: 'This field is required',
    invalid: 'Invalid format'
  },

  // 命名空间：日期时间
  datetime: {
    today: 'Today',
    yesterday: 'Yesterday',
    tomorrow: 'Tomorrow',
    justNow: 'Just now',
    minutesAgo: '{count}m ago',
    hoursAgo: '{count}h ago',
    daysAgo: '{count}d ago'
  }
} as const;
```

**中文翻译示例：** `src/lib/i18n/locales/zh-CN.ts`

```typescript
export default {
  common: {
    loading: '加载中...',
    error: '错误',
    success: '成功',
    cancel: '取消',
    confirm: '确认',
    save: '保存',
    delete: '删除',
    edit: '编辑',
    search: '搜索',
    back: '返回',
    next: '下一步',
    previous: '上一步',
    close: '关闭',
    open: '打开'
  },

  nav: {
    inbox: '收件箱',
    sent: '已发送',
    drafts: '草稿箱',
    archive: '归档',
    trash: '垃圾箱',
    allInboxes: '所有收件箱',
    settings: '设置',
    newMessage: '新建邮件'
  },

  // ... 其他命名空间
} as const;
```

---

### 3. UI/UX 设计

#### 3.1 语言切换入口设计

**位置：** Settings > General > Language & Region

**设置页面路由：** `/settings/language`

**页面布局：**
```
┌─────────────────────────────────────────────────────────────┐
│  [← Back]                                   Language        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  🌐 Language & Region                                        │
│  Choose your preferred language for Mailx                    │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  ◉ Auto-detect from system                           │   │
│  │     Current: 简体中文                                 │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  ○ English                                           │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  ○ 简体中文 (Chinese Simplified)                      │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  ○ 繁體中文 (Chinese Traditional)                     │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ... 更多语言选项                                            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

#### 3.2 交互流程

##### 3.2.1 语言切换流程

```
用户点击语言选项
    ↓
确认对话框（可选）
    ↓
更新 i18nStore.locale
    ↓
触发所有 $derived(t) 重新计算
    ↓
UI 实时更新（无需刷新）
    ↓
持久化到 localStorage
    ↓
更新 document.documentElement.lang
```

##### 3.2.2 自动检测流程

```
首次启动 / 用户选择"自动检测"
    ↓
读取 navigator.language
    ↓
匹配 SUPPORTED_LOCALES
    ↓
设置默认语言
    ↓
系统语言变化时（监听 window.languagechange）
    ↓
提示用户：检测到系统语言已变化
    ↓
用户选择：保持当前语言 / 切换到系统语言
```

#### 3.3 组件级使用模式

##### 3.3.1 基础用法（直接在组件中）

```svelte
<script lang="ts">
  import { t, locale } from '$lib/stores/i18nStore';
  import { _, locale } from 'svelte-i18n'; // 或直接使用 svelte-i18n

  let currentLocale = $state(locale.get());
</script>

<button>
  {$t('nav.newMessage')}
</button>
```

##### 3.3.2 高级用法（带参数）

```svelte
<script lang="ts">
  import { _ } from 'svelte-i18n';

  let count = $state(5);
</script>

<p>
  {$_('datetime.minutesAgo', { values: { count: $count } })}
  <!-- 输出：5m ago -->
</p>
```

##### 3.3.3 复数形式处理

```typescript
// 翻译文件
export default {
  mail: {
    unread_count: {
      zero: 'No unread messages',
      one: '{count} unread message',
      other: '{count} unread messages'
    }
  }
}
```

```svelte
<p>
  {$_('mail.unread_count', { count: unreadCount })}
</p>
```

---

### 4. 实施路线图

#### Phase 1: 基础设施搭建 (Sprint 1)

**目标：** 建立国际化核心架构

| 任务 | 优先级 | 预估工时 | 负责人 |
|------|--------|----------|--------|
| 安装 svelte-i18n 依赖 | P0 | 0.5h | |
| 创建 i18nStore | P0 | 2h | |
| 实现翻译文件结构（en, zh-CN） | P0 | 3h | |
| 集成到 preferences 系统 | P0 | 2h | |
| 编写单元测试 | P1 | 2h | |

**交付物：**
- `src/lib/stores/i18nStore.ts`
- `src/lib/i18n/locales/en.ts`
- `src/lib/i18n/locales/zh-CN.ts`
- `src/lib/stores/i18nStore.test.ts`

#### Phase 2: 核心组件国际化 (Sprint 2-3)

**目标：** 将核心 UI 组件国际化

**优先级排序：**

1. **P0 - 核心导航组件**
   - `Sidebar.svelte` - 导航菜单、文件夹名称
   - `Titlebar.svelte` - 窗口标题
   - `MailList.svelte` - 邮件列表界面

2. **P1 - 邮件操作组件**
   - `MailActions.svelte` - 邮件操作按钮
   - `ComposeModal.svelte` - 写邮件界面
   - `ReadingPane.svelte` - 阅读面板

3. **P2 - 设置页面**
   - `settings/+page.svelte` - 设置主页
   - `settings/appearance/+page.svelte` - 外观设置
   - `settings/accounts/+page.svelte` - 账户设置
   - `settings/language/+page.svelte` - 语言设置（新建）

**工时估算：**
- P0 组件：3 人日
- P1 组件：4 人日
- P2 组件：2 人日

#### Phase 3: 多语言翻译 (Sprint 4)

**目标：** 完成主要语言的翻译

| 语言 | 优先级 | 翻译工作量 | 校对工作量 |
|------|--------|-----------|-----------|
| 简体中文 (zh-CN) | P0 | 1h | 0.5h |
| 繁体中文 (zh-TW) | P0 | 1.5h | 0.5h |
| 日语 (ja) | P1 | 2h | 1h |
| 韩语 (ko) | P1 | 2h | 1h |
| 西班牙语 (es) | P2 | 2h | 0.5h |
| 法语 (fr) | P2 | 2h | 0.5h |
| 德语 (de) | P2 | 2h | 0.5h |
| 葡萄牙语 (pt) | P2 | 2h | 0.5h |
| 俄语 (ru) | P2 | 2h | 1h |

**翻译管理策略：**
- 使用 TypeScript 类型系统确保翻译键的完整性
- 创建翻译检查脚本：`npm run check:i18n`
- 考虑使用 Crowdin/POEditor 等平台进行协作翻译

#### Phase 4: 优化与测试 (Sprint 5)

**目标：** 性能优化、测试覆盖、文档完善

**测试策略：**

1. **单元测试**
   - i18nStore 功能测试
   - 翻译键完整性检查
   - 语言切换逻辑测试

2. **集成测试**
   - 组件渲染测试（不同语言下）
   - 语言切换持久化测试
   - 自动检测功能测试

3. **视觉回归测试**
   - 不同语言的布局适配测试
   - 文本溢出测试
   - RTL（从右到左）语言支持测试（未来）

**性能优化：**
- 语言包懒加载
- 翻译缓存策略
- 减少不必要的重新渲染

**交付物：**
- 完整的测试套件
- 国际化使用文档
- 翻译指南

---

### 5. 技术细节

#### 5.1 类型安全的翻译系统

使用 TypeScript 的模板字面量类型确保翻译键的类型安全：

```typescript
// src/lib/i18n/types.ts
import type { Flatten } from './utils';

type TranslationPaths = typeof import('./locales/en.ts').default;

export type TranslationKey = Flatten<TranslationPaths>;

// 使用示例
function t(key: TranslationKey, params?: Record<string, unknown>): string {
  // ...
}
```

#### 5.2 翻译键命名规范

**命名空间规则：**
```
{feature}.{category}.{specific_key}
```

**示例：**
- `nav.inbox` - 导航 > 收件箱
- `mail.compose.send` - 邮件 > 写邮件 > 发送
- `settings.appearance.theme` - 设置 > 外观 > 主题
- `error.sync.failed` - 错误 > 同步 > 失败

**禁止：**
- ❌ 使用中文作为键名：`'收件箱'`
- ❌ 过于简短的键名：`'inbox'`（应该用 `nav.inbox`）
- ❌ 不一致的命名风格：`nav.inbox` vs `Nav.Sent`

#### 5.3 文本长度适配策略

**问题：** 不同语言的文本长度差异很大

**解决方案：**

1. **CSS 容器查询**
```svelte
<div class="text-container" style="min-height: 2.5em;">
  {$t('nav.inbox')}
</div>
```

2. **文本溢出处理**
```css
.i18n-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.i18n-text-multiline {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
```

3. **动态字体大小（极端场景）**
```svelte
<div style:font-size={isCJK(locale) ? '0.9em' : '1em'}>
  {$t('longText')}
</div>
```

#### 5.4 日期时间本地化

利用已安装的 `@internationalized/date`：

```typescript
import { DateFormatter } from '@internationalized/date';

function formatDate(date: Date, locale: string): string {
  const formatter = new DateFormatter(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  return formatter.format(date);
}

// 使用
const formatted = formatDate(new Date(), 'zh-CN');
// 输出：2026年3月21日
```

#### 5.5 数字本地化

```typescript
import { NumberFormatter } from '@internationalized/number';

function formatNumber(num: number, locale: string): string {
  const formatter = new NumberFormatter(locale, {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
  return formatter.format(num);
}

// 使用
formatNumber(1234.56, 'en'); // "1,234.56"
formatNumber(1234.56, 'zh-CN'); // "1,234.56"
formatNumber(1234.56, 'de'); // "1.234,56"
```

---

### 6. 风险与缓解措施

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| 翻译键不一致 | 高 | 中 | 使用 TypeScript 类型检查 + CI 检查脚本 |
| 语言切换性能问题 | 中 | 低 | 语言包懒加载 + 翻译缓存 |
| 文本溢出导致布局破坏 | 中 | 中 | CSS 容器查询 + 文本溢出处理 |
| 第三方库不支持国际化 | 低 | 低 | 选择时优先考虑国际化支持 |
| 翻译质量不佳 | 中 | 中 | 专业校对 + 用户反馈机制 |
| 维护成本高 | 中 | 高 | 建立翻译管理流程 + 自动化工具 |

---

### 7. 成功指标

**技术指标：**
- ✅ 所有 UI 文本 100% 可翻译
- ✅ 语言切换延迟 < 100ms
- ✅ 代码覆盖率 > 80%
- ✅ TypeScript 编译零错误
- ✅ 无内存泄漏

**用户体验指标：**
- ✅ 支持至少 5 种主流语言
- ✅ 语言切换无需重启应用
- ✅ 自动检测系统语言
- ✅ 所有语言的 UI 布局正常

**开发效率指标：**
- ✅ 新增翻译键的开发时间 < 5 分钟
- ✅ 翻译检查脚本执行时间 < 10 秒
- ✅ 翻译文件大小 < 50KB/语言

---

### 8. 后续扩展计划

#### 8.1 短期扩展（v1.1）
- 支持更多语言（意大利语、荷兰语、波兰语等）
- 实现翻译更新检测和提示
- 添加翻译贡献者名单

#### 8.2 中期扩展（v1.2）
- RTL（从右到左）语言支持（阿拉伯语、希伯来语）
- 复数形式的更细粒度支持
- 性能监控和优化

#### 8.3 长期扩展（v2.0）
- 在线翻译更新（无需重新安装）
- 社区翻译贡献平台
- AI 辅助翻译质量检查
- 翻译记忆库

---

### 9. 参考资料

**技术文档：**
- [svelte-i18n 官方文档](https://github.com/kaisermann/svelte-i18n)
- [Unicode CLDR (Common Locale Data Repository)](https://cldr.unicode.org/)
- [MDN - Internationalization](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl)

**设计参考：**
- [Notion 国际化实践](https://www.notion.so/blog/internationalization-at-notion)
- [VS Code 国际化指南](https://code.visualstudio.com/api/extension-guides/localization)
- [Chrome 扩展国际化](https://developer.chrome.com/docs/extensions/mv3/i18n/)

**翻译资源：**
- [Unicode Common Locale Data Repository](https://cldr.unicode.org/)
- [Localization Industry Standards Association](https://www.lisa.org/)

---

## 附录

### A. 翻译键完整清单（待更新）

待实施完成后补充...

### B. 语言切换交互原型（待补充）

待设计阶段补充交互原型图...

### C. 性能测试报告（待更新）

待优化阶段补充测试数据...

---

**文档维护：**
本文档应随着项目进展持续更新。所有重大架构变更都需要更新本文档并重新评审。

**审批流程：**
1. 技术评审：P9 Tech Lead
2. 架构评审：P10 CTO
3. 实施批准：项目 Owner

---

**Change Log:**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-03-21 | P10 CTO | 初始版本创建 |
