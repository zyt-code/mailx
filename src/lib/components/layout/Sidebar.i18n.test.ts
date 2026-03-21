import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import { tick } from 'svelte';
import { _ } from 'svelte-i18n';
import { i18nStore } from '$lib/stores/i18nStore.svelte';
import Sidebar from './Sidebar.svelte';

describe('Sidebar - Internationalization', () => {
  beforeEach(async () => {
    await i18nStore.waitForReady();
  });

  it('should render with English translations by default', async () => {
    render(Sidebar, {
      collapsed: false,
      isMobile: false,
      activeFolder: 'inbox',
      onToggle: () => {},
      onSelectFolder: () => {}
    });

    expect(screen.getByText('Inbox')).toBeInTheDocument();
  });

  it('should update translations when locale changes to Chinese', async () => {
    const { container } = render(Sidebar, {
      collapsed: false,
      isMobile: false,
      activeFolder: 'inbox',
      onToggle: () => {},
      onSelectFolder: () => {}
    });

    expect(screen.getByText('Inbox')).toBeInTheDocument();

    await i18nStore.setLocale('zh-CN');
    await tick();
    await tick();

    expect(screen.getByText('收件箱')).toBeInTheDocument();
  });

  it('should have proper aria-labels', async () => {
    render(Sidebar, {
      collapsed: false,
      isMobile: false,
      activeFolder: 'inbox',
      onToggle: () => {},
      onSelectFolder: () => {},
      onRefresh: () => {},
      onOpenSettings: () => {}
    });

    const settingsButton = screen.getByLabelText('Settings');
    expect(settingsButton).toBeInTheDocument();
  });
});
