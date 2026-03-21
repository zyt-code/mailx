import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import { tick } from 'svelte';
import { i18nStore } from '$lib/stores/i18nStore.svelte';
import Sidebar from './Sidebar.svelte';

describe('Sidebar - Internationalization', () => {
  beforeEach(async () => {
    await i18nStore.waitForReady();
  });

  describe('Translation Keys Present', () => {
    it('should render with all navigation items translated', async () => {
      const { container } = render(Sidebar, {
        collapsed: false,
        isMobile: false,
        activeFolder: 'inbox',
        onToggle: () => {},
        onSelectFolder: () => {}
      });

      // Check for navigation items
      expect(screen.getByText('Inbox')).toBeInTheDocument();
      expect(screen.getByText('Sent')).toBeInTheDocument();
      expect(screen.getByText('Drafts')).toBeInTheDocument();
      expect(screen.getByText('Archive')).toBeInTheDocument();
      expect(screen.getByText('Trash')).toBeInTheDocument();
    });

    it('should render New Message button', async () => {
      render(Sidebar, {
        collapsed: false,
        isMobile: false,
        activeFolder: 'inbox',
        onToggle: () => {},
        onSelectFolder: () => {}
      });

      expect(screen.getByText('New Message')).toBeInTheDocument();
    });

    it('should render Settings button', async () => {
      render(Sidebar, {
        collapsed: false,
        isMobile: false,
        activeFolder: 'inbox',
        onToggle: () => {},
        onSelectFolder: () => {},
        onOpenSettings: () => {}
      });

      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('should render All Inboxes in multi-account mode', async () => {
      render(Sidebar, {
        collapsed: false,
        isMobile: false,
        activeFolder: 'inbox',
        onToggle: () => {},
        onSelectFolder: () => {}
      });

      expect(screen.getByText('All Inboxes')).toBeInTheDocument();
    });
  });

  describe('Reactive Language Switching', () => {
    it('should update text when locale changes', async () => {
      const { container } = render(Sidebar, {
        collapsed: false,
        isMobile: false,
        activeFolder: 'inbox',
        onToggle: () => {},
        onSelectFolder: () => {}
      });

      // Initially English
      expect(screen.getByText('Inbox')).toBeInTheDocument();

      // Change to Chinese
      await i18nStore.setLocale('zh-CN');
      await tick();

      // Should show Chinese text
      expect(screen.getByText('收件箱')).toBeInTheDocument();
      expect(screen.queryByText('Inbox')).not.toBeInTheDocument();
    });

    it('should update New Message button when locale changes', async () => {
      render(Sidebar, {
        collapsed: false,
        isMobile: false,
        activeFolder: 'inbox',
        onToggle: () => {},
        onSelectFolder: () => {}
      });

      expect(screen.getByText('New Message')).toBeInTheDocument();

      await i18nStore.setLocale('zh-CN');
      await tick();

      expect(screen.getByText('新邮件')).toBeInTheDocument();
    });

    it('should update Settings button when locale changes', async () => {
      render(Sidebar, {
        collapsed: false,
        isMobile: false,
        activeFolder: 'inbox',
        onToggle: () => {},
        onSelectFolder: () => {},
        onOpenSettings: () => {}
      });

      expect(screen.getByText('Settings')).toBeInTheDocument();

      await i18nStore.setLocale('zh-CN');
      await tick();

      expect(screen.getByText('设置')).toBeInTheDocument();
    });
  });

  describe('Aria Labels', () => {
    it('should have translated aria-labels', async () => {
      render(Sidebar, {
        collapsed: false,
        isMobile: false,
        activeFolder: 'inbox',
        onToggle: () => {},
        onSelectFolder: () => {},
        onRefresh: () => {}
      });

      const refreshButton = screen.getByLabelText('Refresh');
      expect(refreshButton).toBeInTheDocument();

      const settingsButton = screen.getByLabelText('Settings');
      expect(settingsButton).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should maintain accessibility after i18n implementation', async () => {
      const { container } = render(Sidebar, {
        collapsed: false,
        isMobile: false,
        activeFolder: 'inbox',
        onToggle: () => {},
        onSelectFolder: () => {},
        onOpenSettings: () => {}
      });

      // Check for proper ARIA attributes
      const nav = container.querySelector('nav');
      expect(nav).toBeInTheDocument();

      const buttons = container.querySelectorAll('button[aria-label]');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });
});
