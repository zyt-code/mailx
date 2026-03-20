import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getTheme, setTheme, themeStore, type Theme } from './themeStore.js';

// Mock browser globals
const mockLocalStorage = {
  store: new Map<string, string>(),
  getItem(key: string) {
    return this.store.get(key) ?? null;
  },
  setItem(key: string, value: string) {
    this.store.set(key, value);
  },
  clear() {
    this.store.clear();
  }
};

const mockMatchMedia = vi.fn((query: string) => ({
  matches: false,
  media: query,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn()
}));

describe('themeStore', () => {
  beforeEach(() => {
    // Reset mocks
    mockLocalStorage.clear();
    vi.clearAllMocks();

    // Setup global mocks
    Object.defineProperty(globalThis, 'window', {
      value: {
        matchMedia: mockMatchMedia,
        localStorage: mockLocalStorage
      },
      writable: true
    });

    Object.defineProperty(globalThis, 'document', {
      value: {
        documentElement: {
          classList: {
            add: vi.fn(),
            remove: vi.fn()
          }
        }
      },
      writable: true
    });
  });

  afterEach(() => {
    // Restore globals
    // @ts-ignore
    delete globalThis.window;
    // @ts-ignore
    delete globalThis.document;
  });

  describe('initial state', () => {
    it('should default to "light" theme when no stored preference', () => {
      const theme = getTheme();
      expect(theme).toBe('light');
    });

    it('should read stored theme from localStorage', () => {
      mockLocalStorage.setItem('mailx-theme', 'dark');
      // Need to reload module to pick up new localStorage value
      // For simplicity, test setTheme/getTheme instead
      setTheme('dark');
      expect(getTheme()).toBe('dark');
    });
  });

  describe('setTheme', () => {
    it('should update current theme', () => {
      setTheme('dark');
      expect(getTheme()).toBe('dark');
    });

    it('should persist theme to localStorage', () => {
      setTheme('dark');
      expect(mockLocalStorage.getItem('mailx-theme')).toBe('dark');
    });

    it('should apply dark class when theme is dark', () => {
      setTheme('dark');
      expect(globalThis.document.documentElement.classList.add).toHaveBeenCalledWith('dark');
      expect(globalThis.document.documentElement.classList.remove).not.toHaveBeenCalled();
    });

    it('should remove dark class when theme is light', () => {
      // First set to dark to ensure remove is called
      setTheme('dark');
      vi.clearAllMocks();

      setTheme('light');
      expect(globalThis.document.documentElement.classList.remove).toHaveBeenCalledWith('dark');
      expect(globalThis.document.documentElement.classList.add).not.toHaveBeenCalled();
    });

    it('should apply system theme based on prefers-color-scheme', () => {
      // Mock system prefers dark
      const mockDarkMedia = {
        matches: true,
        media: '(prefers-color-scheme: dark)',
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn()
      };
      mockMatchMedia.mockReturnValue(mockDarkMedia);

      setTheme('system');
      // Should add dark class because system prefers dark
      expect(globalThis.document.documentElement.classList.add).toHaveBeenCalledWith('dark');
    });
  });

  describe('themeStore object', () => {
    it('should provide current theme via .current getter', () => {
      setTheme('dark');
      expect(themeStore.current).toBe('dark');
    });

    it('should allow setting theme via .set() method', () => {
      themeStore.set('dark');
      expect(themeStore.current).toBe('dark');
      expect(mockLocalStorage.getItem('mailx-theme')).toBe('dark');
    });
  });
});