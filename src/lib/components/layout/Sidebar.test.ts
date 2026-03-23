import { render, screen, waitFor } from '@testing-library/svelte';
import { tick } from 'svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { i18nStore } from '$lib/stores/i18nStore.svelte';
import Sidebar from './Sidebar.svelte';

const { mockState } = vi.hoisted(() => ({
	mockState: {
		hasAccounts: true,
		activeAccount: {
			id: 'acc-1',
			name: 'Primary',
			email: 'primary@example.com',
			is_active: true
		},
		accounts: [
			{
				id: 'acc-1',
				name: 'Primary',
				email: 'primary@example.com',
				is_active: true
			},
			{
				id: 'acc-2',
				name: 'Secondary',
				email: 'secondary@example.com',
				is_active: false
			}
		],
		isSyncing: false,
		lastSyncTime: null as number | null,
		syncingAccountId: null as string | null,
		selectedAccountId: null as string | null,
		inboxUnread: 3,
		preferences: {
			appearance: {
				accentTone: 'blue',
				mailDensity: 'comfortable',
				showPreviewSnippets: true,
				showAccountColor: true,
				theme: 'system'
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
			},
			language: {
				locale: 'en',
				autoDetect: true
			}
		}
	}
}));

vi.mock('$lib/stores/accountStore.js', () => ({
	hasAccounts: { subscribe: (cb: (value: boolean) => void) => { cb(mockState.hasAccounts); return () => {}; } },
	activeAccount: { subscribe: (cb: (value: typeof mockState.activeAccount) => void) => { cb(mockState.activeAccount); return () => {}; } },
	accounts: { subscribe: (cb: (value: typeof mockState.accounts) => void) => { cb(mockState.accounts); return () => {}; } }
}));

vi.mock('$lib/stores/syncStore.js', () => ({
	isSyncing: { subscribe: (cb: (value: boolean) => void) => { cb(mockState.isSyncing); return () => {}; } },
	lastSyncTime: { subscribe: (cb: (value: number | null) => void) => { cb(mockState.lastSyncTime); return () => {}; } },
	syncingAccountId: { subscribe: (cb: (value: string | null) => void) => { cb(mockState.syncingAccountId); return () => {}; } }
}));

vi.mock('$lib/stores/unreadStore.js', () => ({
	inboxUnread: { subscribe: (cb: (value: number) => void) => { cb(mockState.inboxUnread); return () => {}; } }
}));

vi.mock('$lib/stores/mailStore.js', () => ({
	selectedAccountId: { subscribe: (cb: (value: string | null) => void) => { cb(mockState.selectedAccountId); return () => {}; } }
}));

vi.mock('$lib/stores/preferencesStore.js', () => ({
	preferences: {
		subscribe: (cb: (value: typeof mockState.preferences) => void) => {
			cb(mockState.preferences);
			return () => {};
		},
		updateSection: vi.fn()
	}
}));

vi.mock('$lib/sync/index.js', () => ({
	syncAccount: vi.fn().mockResolvedValue({}),
	syncAllAccounts: vi.fn().mockResolvedValue([])
}));

vi.mock('$lib/events/index.js', () => ({
	eventBus: {
		on: vi.fn(),
		off: vi.fn()
	}
}));

describe('Sidebar - Internationalization', () => {
	beforeEach(async () => {
		await i18nStore.waitForReady();
		await i18nStore.setLocale('en');
		mockState.hasAccounts = true;
		mockState.selectedAccountId = null;
		mockState.isSyncing = false;
	});

	describe('Translation Keys Present', () => {
		it('should render with all navigation items translated', async () => {
			render(Sidebar, {
				collapsed: false,
				isMobile: false,
				activeFolder: 'inbox',
				onToggle: () => {},
				onSelectFolder: () => {}
			});

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
			render(Sidebar, {
				collapsed: false,
				isMobile: false,
				activeFolder: 'inbox',
				onToggle: () => {},
				onSelectFolder: () => {}
			});

			expect(screen.getByText('Inbox')).toBeInTheDocument();

			await i18nStore.setLocale('zh-CN');
			await tick();

			expect(await screen.findByText('收件箱')).toBeInTheDocument();
			await waitFor(() => {
				expect(screen.queryByText('Inbox')).not.toBeInTheDocument();
			});
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

			expect(await screen.findByText('新邮件')).toBeInTheDocument();
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

			expect(screen.getByLabelText('Refresh')).toBeInTheDocument();
			expect(screen.getByLabelText('Settings')).toBeInTheDocument();
		});
	});

	describe('Accessibility', () => {
		it('should maintain accessibility after i18n implementation', async () => {
			const { container } = render(Sidebar, {
				collapsed: false,
				isMobile: false,
				activeFolder: 'inbox',
				onToggle: () => {},
				onSelectFolder: () => {}
			});

			const nav = container.querySelector('nav');
			expect(nav).toBeInTheDocument();

			const buttons = container.querySelectorAll('button[aria-label]');
			expect(buttons.length).toBeGreaterThan(0);
		});
	});
});
