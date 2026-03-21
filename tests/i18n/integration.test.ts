import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { i18nStore, SUPPORTED_LOCALES, type SupportedLocale } from '$lib/stores/i18nStore.svelte';
import { createMockNavigator, createMockDocumentElement, createMockLocalStorage, waitFor } from './helpers';

describe('i18n Infrastructure - Integration Tests', () => {
  let originalNavigator: Partial<Navigator>;
  let originalDocument: Document;
  let originalLocalStorage: Storage;
  let mockDocumentElement: ReturnType<typeof createMockDocumentElement>;

  beforeEach(() => {
    originalNavigator = globalThis.navigator;
    originalDocument = globalThis.document;
    originalLocalStorage = globalThis.localStorage;

    mockDocumentElement = createMockDocumentElement();
    
    Object.defineProperty(globalThis, 'navigator', {
      value: createMockNavigator('en-US'),
      writable: true,
      configurable: true
    });
    
    Object.defineProperty(globalThis, 'document', {
      value: {
        documentElement: mockDocumentElement
      },
      writable: true,
      configurable: true
    });
    
    Object.defineProperty(globalThis, 'localStorage', {
      value: createMockLocalStorage(),
      writable: true,
      configurable: true
    });
  });

  afterEach(() => {
    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      writable: true,
      configurable: true
    });
    
    Object.defineProperty(globalThis, 'document', {
      value: originalDocument,
      writable: true,
      configurable: true
    });
    
    Object.defineProperty(globalThis, 'localStorage', {
      value: originalLocalStorage,
      writable: true,
      configurable: true
    });
  });

  describe('End-to-End Language Change Flow', () => {
    it('should complete full language change cycle', async () => {
      await i18nStore.waitForReady();
      expect(i18nStore.isReady).toBe(true);

      await i18nStore.setLocale('zh-CN');
      expect(i18nStore.current).toBe('zh-CN');
      expect(mockDocumentElement.lang).toBe('zh-CN');

      await i18nStore.setLocale('ja');
      expect(i18nStore.current).toBe('ja');
      expect(mockDocumentElement.lang).toBe('ja');

      await i18nStore.setLocale('en');
      expect(i18nStore.current).toBe('en');
      expect(mockDocumentElement.lang).toBe('en');
    });

    it('should handle rapid language changes', async () => {
      await i18nStore.waitForReady();

      const locales: SupportedLocale[] = ['en', 'zh-CN', 'ja', 'ko', 'es', 'fr'];
      
      for (const locale of locales) {
        await i18nStore.setLocale(locale);
        expect(i18nStore.current).toBe(locale);
      }

      expect(i18nStore.current).toBe('fr');
    });
  });

  describe('Integration with Preferences System', () => {
    it('should sync language changes with preferences', async () => {
      await i18nStore.waitForReady();

      await i18nStore.setLocale('de');

      const stored = globalThis.localStorage.getItem('mailx-preferences');
      expect(stored).toBeDefined();

      const prefs = JSON.parse(stored!);
      expect(prefs.language).toBeDefined();
      expect(prefs.language.locale).toBe('de');
      expect(prefs.language.autoDetect).toBe(false);
    });
  });

  describe('Error Recovery', () => {
    it('should recover from localStorage errors', async () => {
      await i18nStore.waitForReady();

      const errorStorage = createMockLocalStorage();
      const originalSetItem = errorStorage.setItem.bind(errorStorage);
      errorStorage.setItem = () => { throw new Error('localStorage full'); };

      Object.defineProperty(globalThis, 'localStorage', {
        value: errorStorage,
        writable: true
      });

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await i18nStore.setLocale('ru');
      expect(i18nStore.current).toBe('ru');
      expect(consoleWarnSpy).toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });
  });

  describe('Auto-Detect Integration', () => {
    it('should detect system locale when autoDetect is true', async () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: createMockNavigator('es-ES'),
        writable: true
      });

      await i18nStore.initialize({ locale: 'en', autoDetect: true });
      await i18nStore.waitForReady();

      expect(i18nStore.current).toBe('es');
    });

    it('should use manual locale when autoDetect is false', async () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: createMockNavigator('es-ES'),
        writable: true
      });

      await i18nStore.initialize({ locale: 'ko', autoDetect: false });
      await i18nStore.waitForReady();

      expect(i18nStore.current).toBe('ko');
    });
  });
});
