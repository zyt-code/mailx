import type { SupportedLocale } from '$lib/stores/i18nStore.svelte';

export const MOCK_LOCALES: SupportedLocale[] = ['en', 'zh-CN', 'zh-TW', 'ja', 'ko', 'es', 'fr', 'de', 'pt', 'ru'];

export function createMockNavigator(language: string): Partial<Navigator> {
  return {
    language,
    languages: [language]
  } as Partial<Navigator>;
}

export function createMockDocumentElement() {
  let lang = '';
  return {
    get lang() { return lang; },
    set lang(value: string) { lang = value; }
  };
}

export function createMockLocalStorage(initialData?: Record<string, string>): Storage {
  const store = new Map<string, string>();
  
  if (initialData) {
    Object.entries(initialData).forEach(([key, value]) => {
      store.set(key, value);
    });
  }
  
  return {
    get length() { return store.size; },
    clear() { store.clear(); },
    getItem(key: string) { return store.get(key) ?? null; },
    setItem(key: string, value: string) { store.set(key, value); },
    removeItem(key: string) { store.delete(key); },
    key(index: number) { 
      const keys = Array.from(store.keys());
      return keys[index] ?? null;
    }
  };
}

export function waitFor(ms: number = 0): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
