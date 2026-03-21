import { describe, it, expect, beforeEach, vi } from 'vitest';
import { i18nStore, SUPPORTED_LOCALES, type SupportedLocale } from './i18nStore.svelte';
import { createMockNavigator, createMockDocumentElement, createMockLocalStorage } from '../../../tests/i18n/helpers';

const mockNavigator = {
  language: 'en-US'
};

const mockDocumentElement = createMockDocumentElement();

describe('i18nStore - Comprehensive Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDocumentElement.lang = '';
    
    Object.defineProperty(window, 'navigator', { value: mockNavigator, writable: true });
    Object.defineProperty(document, 'documentElement', { value: mockDocumentElement, writable: true });
    Object.defineProperty(window, 'localStorage', { 
      value: createMockLocalStorage(),
      writable: true 
    });
  });

  describe('Unsupported Locale Handling', () => {
    it('should reject completely invalid locale codes', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const initialLocale = i18nStore.current;

      await i18nStore.setLocale('xyz-invalid' as SupportedLocale);
      
      expect(i18nStore.current).toBe(initialLocale);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unsupported locale')
      );

      consoleWarnSpy.mockRestore();
    });

    it('should reject null locale', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const initialLocale = i18nStore.current;

      await i18nStore.setLocale(null as any);
      
      expect(i18nStore.current).toBe(initialLocale);

      consoleWarnSpy.mockRestore();
    });
  });

  describe('localStorage Quota Exceeded', () => {
    it('should handle localStorage quota exceeded gracefully', async () => {
      const errorStorage = createMockLocalStorage();
      errorStorage.setItem = () => {
        const error = new Error('QuotaExceededError');
        (error as any).name = 'QuotaExceededError';
        throw error;
      };

      Object.defineProperty(window, 'localStorage', {
        value: errorStorage,
        writable: true
      });

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await i18nStore.setLocale('pt');
      expect(i18nStore.current).toBe('pt');
      expect(consoleWarnSpy).toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });
  });

  describe('Rapid Language Switching', () => {
    it('should handle 10 rapid language switches in < 1s', async () => {
      await i18nStore.waitForReady();

      const startTime = Date.now();
      const locales: SupportedLocale[] = ['en', 'zh-CN', 'ja', 'ko', 'es', 'fr', 'de', 'pt', 'ru', 'zh-TW'];

      for (const locale of locales) {
        await i18nStore.setLocale(locale);
      }

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000);
      expect(i18nStore.current).toBe('zh-TW');
    });
  });

  describe('SSR Scenarios', () => {
    it('should handle SSR scenario (window undefined)', () => {
      const originalWindow = (globalThis as any).window;
      delete (globalThis as any).window;

      const detected = i18nStore.detectSystemLocale();
      expect(detected).toBe('en');

      (globalThis as any).window = originalWindow;
    });
  });

  describe('Preferences Corruption Recovery', () => {
    it('should recover from corrupted preferences JSON', async () => {
      const corruptedStorage = createMockLocalStorage({
        'mailx-preferences': 'invalid json{{{'
      });

      Object.defineProperty(window, 'localStorage', {
        value: corruptedStorage,
        writable: true
      });

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await i18nStore.initialize({ locale: 'en', autoDetect: true });
      await i18nStore.waitForReady();

      expect(i18nStore.current).toBe('en');

      consoleWarnSpy.mockRestore();
    });
  });

  describe('All Supported Locales', () => {
    it('should successfully set all supported locales', async () => {
      await i18nStore.waitForReady();

      for (const { code } of SUPPORTED_LOCALES) {
        await i18nStore.setLocale(code);
        expect(i18nStore.current).toBe(code);
        expect(mockDocumentElement.lang).toBe(code);
      }
    });
  });
});
