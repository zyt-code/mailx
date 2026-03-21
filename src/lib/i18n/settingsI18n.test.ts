import { describe, it, expect } from 'vitest';
import en from './locales/en';
import zhCN from './locales/zh-CN';

/**
 * Recursively collects all leaf keys from a nested object as dot-separated paths.
 * For example, { a: { b: 'x', c: 'y' } } yields ['a.b', 'a.c'].
 */
function getLeafKeys(obj: Record<string, any>, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null) {
      return getLeafKeys(value, path);
    }
    return [path];
  });
}

/**
 * Recursively collects all leaf values from a nested object.
 * Returns an array of { key, value } pairs for inspection.
 */
function getLeafEntries(obj: Record<string, any>, prefix = ''): { key: string; value: string }[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null) {
      return getLeafEntries(value, path);
    }
    return [{ key: path, value: value as string }];
  });
}

describe('Settings Page Translation Completeness', () => {
  const settingsNamespaces = ['appearance', 'notifications', 'privacy', 'keyboard'] as const;

  describe.each(settingsNamespaces)('%s namespace', (ns) => {
    it('should exist in en locale', () => {
      expect(en).toHaveProperty(ns);
      expect(typeof en[ns]).toBe('object');
      expect(en[ns]).not.toBeNull();
    });

    it('should exist in zh-CN locale', () => {
      expect(zhCN).toHaveProperty(ns);
      expect(typeof zhCN[ns]).toBe('object');
      expect(zhCN[ns]).not.toBeNull();
    });

    it('should have at least one key in en', () => {
      const keys = getLeafKeys(en[ns] as Record<string, any>);
      expect(keys.length).toBeGreaterThan(0);
    });

    it('should have at least one key in zh-CN', () => {
      const keys = getLeafKeys(zhCN[ns] as Record<string, any>);
      expect(keys.length).toBeGreaterThan(0);
    });

    it('should have identical key sets in both locales', () => {
      const enKeys = getLeafKeys(en[ns] as Record<string, any>).sort();
      const zhCNKeys = getLeafKeys(zhCN[ns] as Record<string, any>).sort();
      expect(enKeys).toEqual(zhCNKeys);
    });

    it('should have no empty string values in en', () => {
      const entries = getLeafEntries(en[ns] as Record<string, any>);
      const emptyKeys = entries.filter((e) => e.value === '').map((e) => e.key);
      expect(emptyKeys).toEqual([]);
    });

    it('should have no empty string values in zh-CN', () => {
      const entries = getLeafEntries(zhCN[ns] as Record<string, any>);
      const emptyKeys = entries.filter((e) => e.value === '').map((e) => e.key);
      expect(emptyKeys).toEqual([]);
    });
  });

  describe('critical settings keys', () => {
    const criticalKeys: Record<string, string[]> = {
      appearance: ['kicker', 'title', 'accentBlue'],
      notifications: ['kicker', 'title', 'desktopAlerts'],
      privacy: ['kicker', 'title', 'remoteContent'],
      keyboard: ['kicker', 'title', 'behavior']
    };

    describe.each(Object.entries(criticalKeys))('%s critical keys', (ns, keys) => {
      it.each(keys)('en should have key "%s"', (key) => {
        const nsObj = en[ns as keyof typeof en] as Record<string, any>;
        expect(nsObj).toHaveProperty(key);
        expect(nsObj[key]).toBeTruthy();
      });

      it.each(keys)('zh-CN should have key "%s"', (key) => {
        const nsObj = zhCN[ns as keyof typeof zhCN] as Record<string, any>;
        expect(nsObj).toHaveProperty(key);
        expect(nsObj[key]).toBeTruthy();
      });
    });
  });
});
