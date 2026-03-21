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

    it('should have all appearance translation keys', () => {
      const { appearance } = en;
      // Page header
      expect(appearance).toHaveProperty('kicker');
      expect(appearance).toHaveProperty('title');
      expect(appearance).toHaveProperty('subtitle');
      // Theme section
      expect(appearance).toHaveProperty('themeTitle');
      expect(appearance).toHaveProperty('themeDescription');
      expect(appearance).toHaveProperty('switchTo');
      // Accent section
      expect(appearance).toHaveProperty('accentTitle');
      expect(appearance).toHaveProperty('accentDescription');
      // Density section
      expect(appearance).toHaveProperty('densityTitle');
      expect(appearance).toHaveProperty('densityDescription');
      // Thread details
      expect(appearance).toHaveProperty('threadDetails');
      expect(appearance).toHaveProperty('threadDetailsDescription');
      expect(appearance).toHaveProperty('resetAppearance');
      // Toggle options
      expect(appearance).toHaveProperty('previewSnippets');
      expect(appearance).toHaveProperty('previewSnippetsDescription');
      expect(appearance).toHaveProperty('accountColorMarkers');
      expect(appearance).toHaveProperty('accountColorMarkersDescription');
      // Accent presets
      expect(appearance).toHaveProperty('accentBlue');
      expect(appearance).toHaveProperty('accentBlueDesc');
      expect(appearance).toHaveProperty('accentSunset');
      expect(appearance).toHaveProperty('accentSunsetDesc');
      expect(appearance).toHaveProperty('accentForest');
      expect(appearance).toHaveProperty('accentForestDesc');
      expect(appearance).toHaveProperty('accentGraphite');
      expect(appearance).toHaveProperty('accentGraphiteDesc');
    });

    it('should have all notifications translation keys', () => {
      const { notifications } = en;
      // Page header
      expect(notifications).toHaveProperty('kicker');
      expect(notifications).toHaveProperty('title');
      expect(notifications).toHaveProperty('subtitle');
      // Desktop alerts
      expect(notifications).toHaveProperty('desktopAlerts');
      expect(notifications).toHaveProperty('desktopAlertsDescription');
      expect(notifications).toHaveProperty('allowDesktop');
      expect(notifications).toHaveProperty('allowDesktopDescription');
      expect(notifications).toHaveProperty('systemPermission');
      expect(notifications).toHaveProperty('requestAccess');
      expect(notifications).toHaveProperty('sendTest');
      // Permission messages
      expect(notifications).toHaveProperty('permChecking');
      expect(notifications).toHaveProperty('permGranted');
      expect(notifications).toHaveProperty('permNotGranted');
      expect(notifications).toHaveProperty('permUnavailable');
      expect(notifications).toHaveProperty('permEnabled');
      expect(notifications).toHaveProperty('permRejected');
      expect(notifications).toHaveProperty('permFailed');
      expect(notifications).toHaveProperty('testSent');
      expect(notifications).toHaveProperty('testFailed');
      expect(notifications).toHaveProperty('testTitle');
      expect(notifications).toHaveProperty('testBody');
      // Sync feedback
      expect(notifications).toHaveProperty('syncFeedback');
      expect(notifications).toHaveProperty('syncFeedbackDescription');
      expect(notifications).toHaveProperty('resetNotifications');
      expect(notifications).toHaveProperty('successToasts');
      expect(notifications).toHaveProperty('successToastsDescription');
      expect(notifications).toHaveProperty('failureAlerts');
      expect(notifications).toHaveProperty('failureAlertsDescription');
      // Quiet hours
      expect(notifications).toHaveProperty('quietHours');
      expect(notifications).toHaveProperty('quietHoursDescription');
      expect(notifications).toHaveProperty('useQuietHours');
      expect(notifications).toHaveProperty('useQuietHoursDescription');
      expect(notifications).toHaveProperty('start');
      expect(notifications).toHaveProperty('end');
    });

    it('should have all privacy translation keys', () => {
      const { privacy } = en;
      // Page header
      expect(privacy).toHaveProperty('kicker');
      expect(privacy).toHaveProperty('title');
      expect(privacy).toHaveProperty('subtitle');
      // Remote content
      expect(privacy).toHaveProperty('remoteContent');
      expect(privacy).toHaveProperty('remoteContentDescription');
      expect(privacy).toHaveProperty('alwaysAsk');
      expect(privacy).toHaveProperty('alwaysAskDescription');
      expect(privacy).toHaveProperty('neverLoad');
      expect(privacy).toHaveProperty('neverLoadDescription');
      expect(privacy).toHaveProperty('alwaysLoad');
      expect(privacy).toHaveProperty('alwaysLoadDescription');
      expect(privacy).toHaveProperty('blockExternalImages');
      expect(privacy).toHaveProperty('blockExternalImagesDescription');
      expect(privacy).toHaveProperty('blockRemoteFonts');
      expect(privacy).toHaveProperty('blockRemoteFontsDescription');
      // Read receipts
      expect(privacy).toHaveProperty('readReceipts');
      expect(privacy).toHaveProperty('readReceiptsDescription');
      expect(privacy).toHaveProperty('neverSend');
      expect(privacy).toHaveProperty('neverSendDescription');
      expect(privacy).toHaveProperty('askMe');
      expect(privacy).toHaveProperty('askMeDescription');
      expect(privacy).toHaveProperty('alwaysSend');
      expect(privacy).toHaveProperty('alwaysSendDescription');
      // HTML security
      expect(privacy).toHaveProperty('htmlSecurity');
      expect(privacy).toHaveProperty('htmlSecurityDescription');
      expect(privacy).toHaveProperty('plainText');
      expect(privacy).toHaveProperty('plainTextDescription');
      expect(privacy).toHaveProperty('sanitizedHtml');
      expect(privacy).toHaveProperty('sanitizedHtmlDescription');
      expect(privacy).toHaveProperty('fullHtml');
      expect(privacy).toHaveProperty('fullHtmlDescription');
      expect(privacy).toHaveProperty('blockForms');
      expect(privacy).toHaveProperty('blockFormsDescription');
      expect(privacy).toHaveProperty('showSecurityWarnings');
      expect(privacy).toHaveProperty('showSecurityWarningsDescription');
      // Link safety
      expect(privacy).toHaveProperty('linkSafety');
      expect(privacy).toHaveProperty('linkSafetyDescription');
      expect(privacy).toHaveProperty('warnSuspiciousLinks');
      expect(privacy).toHaveProperty('warnSuspiciousLinksDescription');
      expect(privacy).toHaveProperty('showFullUrl');
      expect(privacy).toHaveProperty('showFullUrlDescription');
      // Local data
      expect(privacy).toHaveProperty('localData');
      expect(privacy).toHaveProperty('localDataDescription');
      expect(privacy).toHaveProperty('databaseSize');
      expect(privacy).toHaveProperty('compactDatabase');
      expect(privacy).toHaveProperty('compacting');
      expect(privacy).toHaveProperty('clearLocalData');
      expect(privacy).toHaveProperty('clearing');
      expect(privacy).toHaveProperty('clearConfirm');
      expect(privacy).toHaveProperty('clearSuccess');
    });

    it('should have all keyboard translation keys', () => {
      const { keyboard } = en;
      // Page header
      expect(keyboard).toHaveProperty('kicker');
      expect(keyboard).toHaveProperty('title');
      expect(keyboard).toHaveProperty('subtitle');
      // Behavior section
      expect(keyboard).toHaveProperty('behavior');
      expect(keyboard).toHaveProperty('behaviorDescription');
      expect(keyboard).toHaveProperty('singleKeyShortcuts');
      expect(keyboard).toHaveProperty('singleKeyShortcutsDescription');
      expect(keyboard).toHaveProperty('showShortcutHints');
      expect(keyboard).toHaveProperty('showShortcutHintsDescription');
      expect(keyboard).toHaveProperty('sendWithModEnter');
      expect(keyboard).toHaveProperty('sendWithModEnterDescription');
      // Live shortcut map
      expect(keyboard).toHaveProperty('liveShortcutMap');
      expect(keyboard).toHaveProperty('liveShortcutMapDescription');
      expect(keyboard).toHaveProperty('resetKeyboard');
      // Shortcut actions
      expect(keyboard).toHaveProperty('nextMessage');
      expect(keyboard).toHaveProperty('nextMessageDescription');
      expect(keyboard).toHaveProperty('previousMessage');
      expect(keyboard).toHaveProperty('previousMessageDescription');
      expect(keyboard).toHaveProperty('compose');
      expect(keyboard).toHaveProperty('composeDescription');
      expect(keyboard).toHaveProperty('syncNow');
      expect(keyboard).toHaveProperty('syncNowDescription');
      expect(keyboard).toHaveProperty('sendDraft');
      expect(keyboard).toHaveProperty('sendDraftDescription');
      // Insight cards
      expect(keyboard).toHaveProperty('hintSystem');
      expect(keyboard).toHaveProperty('hintSystemDescription');
      expect(keyboard).toHaveProperty('composeAcceleration');
      expect(keyboard).toHaveProperty('composeAccelerationDescription');
      expect(keyboard).toHaveProperty('scopeGuard');
      expect(keyboard).toHaveProperty('scopeGuardDescription');
    });

    it('should have all titlebar translation keys', () => {
      const { titlebar } = en;
      expect(titlebar).toHaveProperty('minimize');
      expect(titlebar).toHaveProperty('maximize');
      expect(titlebar).toHaveProperty('close');
    });

    it('should have all sidebar translation keys', () => {
      const { sidebar } = en;
      expect(sidebar).toHaveProperty('expand');
      expect(sidebar).toHaveProperty('collapse');
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
