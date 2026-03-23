import { init, register, locale, waitLocale, addMessages } from 'svelte-i18n';
import enMessages from '../i18n/locales/en';

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

export interface LocalePreferences {
  locale: SupportedLocale;
  autoDetect: boolean;
}

let currentLocale = $state<SupportedLocale>('en');
let isLoading = $state(true);
let initializationPromise: Promise<void> | null = null;

function detectSystemLocale(): SupportedLocale {
  if (typeof window === 'undefined') return 'en';

  const browserLang = navigator.language;
  const exactMatch = SUPPORTED_LOCALES.find(l => l.code === browserLang);
  if (exactMatch) return exactMatch.code;

  const langPrefix = browserLang.split('-')[0];
  const prefixMatch = SUPPORTED_LOCALES.find(l => l.code.startsWith(langPrefix));
  return prefixMatch?.code ?? 'en';
}

// CRITICAL: Add the fallback locale dictionary synchronously BEFORE init().
// svelte-i18n's $locale.set() is async when register() creates a loader queue.
// By using addMessages() the 'en' dictionary is available immediately, so
// init({ initialLocale: 'en' }) sets $locale synchronously (no flush needed).
// Other locales are lazy-loaded via register().
addMessages('en', enMessages);

for (const { code } of SUPPORTED_LOCALES) {
  if (code !== 'en') {
    register(code, () => import(`../i18n/locales/${code}.ts`));
  }
}

init({
  fallbackLocale: 'en',
  initialLocale: 'en'
});

// Async phase: load user preferences and switch to the preferred locale.
async function initializeI18n(initialPreferences?: LocalePreferences): Promise<void> {
  let prefs: LocalePreferences;

  if (initialPreferences) {
    prefs = initialPreferences;
  } else {
    try {
      const { preferences } = await import('./preferencesStore');
      const userPrefs = await new Promise<any>((resolve) => {
        let unsub: (() => void) | undefined;
        unsub = preferences.subscribe((p: any) => {
          resolve(p);
          // Defer unsubscribe — the callback fires synchronously before assignment completes
          queueMicrotask(() => unsub?.());
        });
      });
      prefs = userPrefs.language;
    } catch (e) {
      console.warn('Failed to load preferences, using defaults:', e);
      prefs = { locale: 'en', autoDetect: true };
    }
  }

  const targetLocale = prefs.autoDetect ? detectSystemLocale() : prefs.locale;

  locale.set(targetLocale);
  currentLocale = targetLocale;

  await waitLocale();

  if (typeof document !== 'undefined') {
    document.documentElement.lang = targetLocale;
  }

  isLoading = false;
}

export const i18nStore = {
  get current(): SupportedLocale {
    return currentLocale;
  },

  get isLoading(): boolean {
    return isLoading;
  },

  get isReady(): boolean {
    return !isLoading;
  },

  detectSystemLocale,

  async setLocale(newLocale: SupportedLocale) {
    if (!SUPPORTED_LOCALES.some(l => l.code === newLocale)) {
      console.warn(`Unsupported locale: ${newLocale}`);
      return;
    }

    locale.set(newLocale);
    await waitLocale();
    currentLocale = newLocale;

    try {
      const { preferences } = await import('./preferencesStore');
      preferences.updateSection('language', {
        locale: newLocale,
        autoDetect: false
      });
    } catch (e) {
      console.warn('Failed to save locale to preferences:', e);
    }

    if (typeof document !== 'undefined') {
      document.documentElement.lang = newLocale;
    }
  },

  async waitForReady(): Promise<void> {
    if (initializationPromise) {
      await initializationPromise;
    }
  },

  async initialize(prefs?: LocalePreferences): Promise<void> {
    await initializeI18n(prefs);
  }
};

export function ensureInitialized(): Promise<void> {
  if (!initializationPromise) {
    initializationPromise = initializeI18n();
  }
  return initializationPromise;
}

ensureInitialized();
