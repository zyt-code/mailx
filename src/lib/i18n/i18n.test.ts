import { describe, it, expect } from 'vitest';
import en from '../i18n/locales/en';
import zhCN from '../i18n/locales/zh-CN';

describe('Translation Files', () => {
  describe('English translations (en)', () => {
    it('should have all required namespaces', () => {
      expect(en).toHaveProperty('common');
      expect(en).toHaveProperty('titlebar');
      expect(en).toHaveProperty('sidebar');
      expect(en).toHaveProperty('nav');
      expect(en).toHaveProperty('mail');
      expect(en).toHaveProperty('settings');
      expect(en).toHaveProperty('language');
      expect(en).toHaveProperty('theme');
      expect(en).toHaveProperty('appearance');
      expect(en).toHaveProperty('notifications');
      expect(en).toHaveProperty('privacy');
      expect(en).toHaveProperty('keyboard');
      expect(en).toHaveProperty('account');
      expect(en).toHaveProperty('form');
      expect(en).toHaveProperty('datetime');
    });

    it('should have all common translation keys', () => {
      const { common } = en;
      expect(common).toHaveProperty('loading');
      expect(common).toHaveProperty('error');
      expect(common).toHaveProperty('success');
      expect(common).toHaveProperty('cancel');
      expect(common).toHaveProperty('confirm');
      expect(common).toHaveProperty('save');
      expect(common).toHaveProperty('delete');
      expect(common).toHaveProperty('edit');
      expect(common).toHaveProperty('search');
      expect(common).toHaveProperty('back');
      expect(common).toHaveProperty('next');
      expect(common).toHaveProperty('previous');
      expect(common).toHaveProperty('close');
      expect(common).toHaveProperty('open');
    });

    it('should have all nav translation keys', () => {
      const { nav } = en;
      expect(nav).toHaveProperty('inbox');
      expect(nav).toHaveProperty('sent');
      expect(nav).toHaveProperty('drafts');
      expect(nav).toHaveProperty('archive');
      expect(nav).toHaveProperty('trash');
      expect(nav).toHaveProperty('allInboxes');
      expect(nav).toHaveProperty('settings');
      expect(nav).toHaveProperty('newMessage');
    });

    it('should have all mail translation keys', () => {
      const { mail } = en;
      expect(mail).toHaveProperty('compose');
      expect(mail).toHaveProperty('reply');
      expect(mail).toHaveProperty('replyAll');
      expect(mail).toHaveProperty('forward');
      expect(mail).toHaveProperty('archive');
      expect(mail).toHaveProperty('unarchive');
      expect(mail).toHaveProperty('delete');
      expect(mail).toHaveProperty('markRead');
      expect(mail).toHaveProperty('markUnread');
      expect(mail).toHaveProperty('star');
      expect(mail).toHaveProperty('unstar');
      expect(mail).toHaveProperty('moveTo');
    });

    it('should have all settings translation keys', () => {
      const { settings } = en;
      expect(settings).toHaveProperty('title');
      expect(settings).toHaveProperty('accounts');
      expect(settings).toHaveProperty('appearance');
      expect(settings).toHaveProperty('notifications');
      expect(settings).toHaveProperty('keyboard');
      expect(settings).toHaveProperty('privacy');
      expect(settings).toHaveProperty('language');
      expect(settings).toHaveProperty('theme');
      expect(settings).toHaveProperty('accent');
    });

    it('should have all language translation keys', () => {
      const { language } = en;
      expect(language).toHaveProperty('title');
      expect(language).toHaveProperty('description');
      expect(language).toHaveProperty('autoDetect');
      expect(language).toHaveProperty('current');
      expect(language).toHaveProperty('confirmChange');
      expect(language).toHaveProperty('restartRequired');
    });

    it('should have all theme translation keys', () => {
      const { theme } = en;
      expect(theme).toHaveProperty('light');
      expect(theme).toHaveProperty('dark');
      expect(theme).toHaveProperty('system');
      expect(theme).toHaveProperty('compact');
      expect(theme).toHaveProperty('comfortable');
      expect(theme).toHaveProperty('airy');
    });

    it('should have all account translation keys', () => {
      const { account } = en;
      expect(account).toHaveProperty('add');
      expect(account).toHaveProperty('edit');
      expect(account).toHaveProperty('delete');
      expect(account).toHaveProperty('noAccounts');
      expect(account).toHaveProperty('addFirst');
      expect(account).toHaveProperty('syncStatus');
      expect(account).toHaveProperty('lastSync');
      expect(account).toHaveProperty('syncing');
      expect(account).toHaveProperty('syncFailed');
      expect(account).toHaveProperty('idle');
    });

    it('should have all form translation keys', () => {
      const { form } = en;
      expect(form).toHaveProperty('email');
      expect(form).toHaveProperty('password');
      expect(form).toHaveProperty('name');
      expect(form).toHaveProperty('server');
      expect(form).toHaveProperty('port');
      expect(form).toHaveProperty('useSSL');
      expect(form).toHaveProperty('required');
      expect(form).toHaveProperty('invalid');
    });

    it('should have all datetime translation keys', () => {
      const { datetime } = en;
      expect(datetime).toHaveProperty('today');
      expect(datetime).toHaveProperty('yesterday');
      expect(datetime).toHaveProperty('tomorrow');
      expect(datetime).toHaveProperty('justNow');
      expect(datetime).toHaveProperty('minutesAgo');
      expect(datetime).toHaveProperty('hoursAgo');
      expect(datetime).toHaveProperty('daysAgo');
    });
  });

  describe('Chinese translations (zh-CN)', () => {
    it('should have the same namespaces as English', () => {
      const enKeys = Object.keys(en);
      const zhKeys = Object.keys(zhCN);
      
      expect(zhKeys).toEqual(expect.arrayContaining(enKeys));
      expect(zhKeys.length).toBe(enKeys.length);
    });

    it('should have key parity for all namespaces', () => {
      const namespaces = ['common', 'titlebar', 'sidebar', 'nav', 'mail', 'settings', 'language', 'theme', 'appearance', 'notifications', 'privacy', 'keyboard', 'account', 'form', 'datetime'] as const;
      
      namespaces.forEach(ns => {
        const enKeys = Object.keys(en[ns as keyof typeof en]);
        const zhKeys = Object.keys(zhCN[ns as keyof typeof zhCN]);
        
        expect(zhKeys).toEqual(expect.arrayContaining(enKeys));
        expect(zhKeys.length).toBe(enKeys.length);
      });
    });

    it('should have non-empty translations', () => {
      const checkNotEmpty = (obj: Record<string, any>) => {
        for (const [key, value] of Object.entries(obj)) {
          if (typeof value === 'string') {
            expect(value.trim().length).toBeGreaterThan(0);
          } else if (typeof value === 'object' && value !== null) {
            checkNotEmpty(value);
          }
        }
      };

      checkNotEmpty(zhCN);
    });
  });
});
