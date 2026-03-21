import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { SupportedLocale } from './i18nStore.svelte';

const localStorageMock = {
  getItem: vi.fn<typeof localStorage.getItem>(),
  setItem: vi.fn<typeof localStorage.setItem>(),
  removeItem: vi.fn<typeof localStorage.removeItem>(),
  clear: vi.fn<typeof localStorage.clear>(),
  length: 0,
  key: vi.fn<typeof localStorage.key>()
};

describe('preferencesStore - Language Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    localStorageMock.length = 0;
    
    Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true });
  });

  describe('Language Preferences Structure', () => {
    it('should have language section in UserPreferences', async () => {
      const { DEFAULT_PREFERENCES } = await import('./preferencesStore');
      const prefs = DEFAULT_PREFERENCES as any;
      expect(prefs).toHaveProperty('language');
    });

    it('should have correct default language preferences', async () => {
      const { DEFAULT_PREFERENCES } = await import('./preferencesStore');
      const prefs = DEFAULT_PREFERENCES as any;
      expect(prefs.language).toBeDefined();
      expect(prefs.language.locale).toBe('en');
      expect(prefs.language.autoDetect).toBe(true);
    });
  });

  describe('Language Preferences Loading', () => {
    it('should use defaults when localStorage is empty', async () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      const { preferences } = await import('./preferencesStore');
      
      let loadedPrefs: any = null;
      const unsubscribe = preferences.subscribe((prefs: any) => {
        if (!loadedPrefs) {
          loadedPrefs = prefs;
        }
      });
      
      expect(loadedPrefs?.language?.locale).toBe('en');
      expect(loadedPrefs?.language?.autoDetect).toBe(true);
      
      unsubscribe();
    });
  });

  describe('updateSection for language', () => {
    it('should persist language updates to localStorage', async () => {
      const { preferences } = await import('./preferencesStore');
      
      preferences.updateSection('language' as any, { 
        locale: 'fr' as SupportedLocale,
        autoDetect: false
      });
      
      expect(localStorageMock.setItem).toHaveBeenCalled();
      const calls = localStorageMock.setItem.mock.calls;
      const lastCall = calls[calls.length - 1];
      const savedPrefs = JSON.parse(lastCall[1]);
      
      expect(savedPrefs.language).toBeDefined();
      expect(savedPrefs.language.locale).toBe('fr');
      expect(savedPrefs.language.autoDetect).toBe(false);
    });
  });

  describe('resetSection for language', () => {
    it('should reset language preferences to defaults', async () => {
      const { preferences, DEFAULT_PREFERENCES } = await import('./preferencesStore');
      
      preferences.resetSection('language' as any);
      
      let resetPrefs: any = null;
      const unsubscribe = preferences.subscribe((prefs: any) => {
        resetPrefs = prefs;
      });
      
      expect(resetPrefs?.language?.locale).toBe(DEFAULT_PREFERENCES.language.locale);
      expect(resetPrefs?.language?.autoDetect).toBe(DEFAULT_PREFERENCES.language.autoDetect);
      
      unsubscribe();
    });
  });

  describe('Backward Compatibility', () => {
    it('should handle old preferences without language section', async () => {
      const oldPrefs = {
        appearance: {
          accentTone: 'blue',
          mailDensity: 'comfortable',
          showPreviewSnippets: true,
          showAccountColor: true
        },
        notifications: {
          desktopNotifications: true,
          syncSuccessToasts: true,
          syncFailureToasts: true,
          quietHoursEnabled: false,
          quietHoursStart: '22:00',
          quietHoursEnd: '07:00'
        },
        keyboard: {
          singleKeyShortcuts: true,
          showShortcutHints: true,
          sendWithModEnter: true
        },
        privacy: {
          blockExternalImages: true,
          blockRemoteFonts: true,
          remoteContentAction: 'always_ask',
          readReceiptPolicy: 'never_send',
          htmlRenderingMode: 'sanitized',
          blockFormsInEmails: true,
          showSecurityWarnings: true,
          warnBeforeSuspiciousLinks: true,
          showFullUrlOnHover: true
        }
      };
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(oldPrefs));
      
      const { preferences } = await import('./preferencesStore');
      
      let loadedPrefs: any = null;
      const unsubscribe = preferences.subscribe((prefs: any) => {
        if (!loadedPrefs) {
          loadedPrefs = prefs;
        }
      });
      
      expect(loadedPrefs?.language).toBeDefined();
      expect(loadedPrefs?.language?.locale).toBe('en');
      
      unsubscribe();
    });
  });
});
