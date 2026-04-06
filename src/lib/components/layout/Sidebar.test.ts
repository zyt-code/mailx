import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
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
		folderUnreadCounts: {
			inbox: 3,
			sent: 0,
			drafts: 0,
			archive: 0,
			trash: 0
		},
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
const getMailboxFoldersMock = vi.hoisted(() => vi.fn());

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
	folderUnreadCounts: {
		subscribe: (cb: (value: typeof mockState.folderUnreadCounts) => void) => {
			cb(mockState.folderUnreadCounts);
			return () => {};
		}
	}
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

vi.mock('$lib/db/index.js', () => ({
	getMailboxFolders: getMailboxFoldersMock
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
		getMailboxFoldersMock.mockReset();
		getMailboxFoldersMock.mockResolvedValue([]);
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

	describe('Unread badge layout', () => {
		it('keeps inbox navigation height stable when unread badge is shown', () => {
			mockState.folderUnreadCounts = {
				inbox: 12,
				sent: 0,
				drafts: 0,
				archive: 0,
				trash: 0
			};

			render(Sidebar, {
				collapsed: false,
				isMobile: false,
				activeFolder: 'inbox',
				onToggle: () => {},
				onSelectFolder: () => {}
			});

			const inboxButton = screen.getByText('Inbox').closest('button');
			const unreadBadge = screen.getByText('12');

			expect(inboxButton).toHaveClass('h-10');
			expect(unreadBadge).toHaveClass('folder-nav-badge');
		});

		it('shows unread counts for non-active folders', () => {
			mockState.folderUnreadCounts = {
				inbox: 5,
				sent: 0,
				drafts: 2,
				archive: 0,
				trash: 0
			};

			render(Sidebar, {
				collapsed: false,
				isMobile: false,
				activeFolder: 'sent',
				onToggle: () => {},
				onSelectFolder: () => {}
			});

			expect(screen.getByText('5')).toBeInTheDocument();
			expect(screen.getByText('2')).toBeInTheDocument();
		});

		it('renders custom folders for the selected account using mailbox folder catalog data', async () => {
			mockState.selectedAccountId = 'acc-1';
			getMailboxFoldersMock.mockResolvedValue([
				{
					id: 'inbox',
					label: 'inbox',
					kind: 'system',
					unread_count: 3,
					system_key: 'inbox',
					account_id: 'acc-1'
				},
				{
					id: 'custom:Projects',
					label: 'Projects',
					kind: 'custom',
					unread_count: 4,
					account_id: 'acc-1'
				}
			]);

			render(Sidebar, {
				collapsed: false,
				isMobile: false,
				activeFolder: 'inbox',
				onToggle: () => {},
				onSelectFolder: () => {}
			});

			expect(await screen.findByText('Projects')).toBeInTheDocument();
			expect(screen.getByText('4')).toBeInTheDocument();
			expect(getMailboxFoldersMock).toHaveBeenCalledWith('acc-1');
		});
	});

	describe('Collapse animation contract', () => {
		it('marks collapsed state on the sidebar shell for animated layout transitions', () => {
			const { rerender } = render(Sidebar, {
				collapsed: false,
				isMobile: false,
				activeFolder: 'inbox',
				onToggle: () => {},
				onSelectFolder: () => {}
			});

			const sidebar = screen.getByTestId('app-sidebar');
			expect(sidebar).toHaveAttribute('data-collapsed', 'false');

			rerender({
				collapsed: true,
				isMobile: false,
				activeFolder: 'inbox',
				onToggle: () => {},
				onSelectFolder: () => {}
			});

			expect(sidebar).toHaveAttribute('data-collapsed', 'true');
		});
	});

	describe('Disabled feedback', () => {
		it('shows onboarding feedback when compose is clicked before any account is configured', async () => {
			mockState.hasAccounts = false;

			render(Sidebar, {
				collapsed: false,
				isMobile: false,
				activeFolder: 'inbox',
				onToggle: () => {},
				onSelectFolder: () => {}
			});

			await fireEvent.click(screen.getByLabelText('New Message'));

			expect(await screen.findByText('Add your first account to get started')).toBeInTheDocument();
		});

		it('shows onboarding feedback when folders are clicked before any account is configured', async () => {
			mockState.hasAccounts = false;

			render(Sidebar, {
				collapsed: false,
				isMobile: false,
				activeFolder: 'inbox',
				onToggle: () => {},
				onSelectFolder: () => {}
			});

			await fireEvent.click(screen.getByText('Sent'));

			expect(await screen.findByText('Add your first account to get started')).toBeInTheDocument();
		});
	});
});
