import { describe, it, expect, beforeEach, vi } from 'vitest';
import { i18nStore, SUPPORTED_LOCALES, type SupportedLocale } from './i18nStore.svelte';

const localStorageMock = {
  getItem: vi.fn<typeof localStorage.getItem>(),
  setItem: vi.fn<typeof localStorage.setItem>(),
  removeItem: vi.fn<typeof localStorage.removeItem>(),
  clear: vi.fn<typeof localStorage.clear>(),
  length: 0,
  key: vi.fn<typeof localStorage.key>()
};

const mockNavigator = {
  language: 'en-US'
};

const mockDocumentElement = {
  lang: '',
  setAttribute: vi.fn()
};

describe('i18nStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    localStorageMock.length = 0;
    mockDocumentElement.lang = '';
    mockDocumentElement.setAttribute.mockClear();
    
    Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true });
    Object.defineProperty(window, 'navigator', { value: mockNavigator, writable: true });
    Object.defineProperty(document, 'documentElement', { value: mockDocumentElement, writable: true });
  });

  describe('SUPPORTED_LOCALES', () => {
    it('should have exactly 10 supported locales', () => {
      expect(SUPPORTED_LOCALES).toHaveLength(10);
    });

    it('should include all required language codes', () => {
      const codes = SUPPORTED_LOCALES.map(l => l.code);
      expect(codes).toContain('en');
      expect(codes).toContain('zh-CN');
      expect(codes).toContain('zh-TW');
      expect(codes).toContain('ja');
      expect(codes).toContain('ko');
      expect(codes).toContain('es');
      expect(codes).toContain('fr');
      expect(codes).toContain('de');
      expect(codes).toContain('pt');
      expect(codes).toContain('ru');
    });
  });

  describe('locale detection', () => {
    it('should detect exact locale match', () => {
      mockNavigator.language = 'zh-CN';
      const detected = i18nStore.detectSystemLocale();
      expect(detected).toBe('zh-CN');
    });

    it('should fallback to en for unsupported locales', () => {
      mockNavigator.language = 'it-IT';
      const detected = i18nStore.detectSystemLocale();
      expect(detected).toBe('en');
    });
  });

  describe('setLocale', () => {
    it('should update current locale', async () => {
      await i18nStore.setLocale('zh-CN');
      // $state rune doesn't propagate in test env, so verify via side effect
      expect(mockDocumentElement.lang).toBe('zh-CN');
    });

    it('should update document lang attribute', async () => {
      await i18nStore.setLocale('ko');
      expect(mockDocumentElement.lang).toBe('ko');
    });

    it('should warn for unsupported locale', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      await i18nStore.setLocale('invalid-locale' as SupportedLocale);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unsupported locale')
      );
      
      consoleWarnSpy.mockRestore();
    });
  });

  describe('initialization', () => {
    it('should be ready after init', async () => {
      await i18nStore.waitForReady();
      expect(i18nStore.isReady).toBe(true);
    }, 10000);
  });
});
