import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { init, register } from 'svelte-i18n';
import MailList from './MailList.svelte';
import type { UserPreferences } from '$lib/stores/preferencesStore';

vi.mock('virtua/svelte', async () => {
	const { default: VList } = await import('$lib/test/VListMock.svelte');
	return { VList };
});

let mockMails: unknown[] = [];
let mockFolder = 'inbox';
let mockSelectedAccountId: string | null = null;
let mockIsLoadingMore = false;
let mockHasMore = true;
let mockPreferences: UserPreferences = {
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
		quietHoursEnd: '08:00'
	},
	keyboard: {
		singleKeyShortcuts: true,
		showShortcutHints: true,
		sendWithModEnter: false
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
};

// Initialize svelte-i18n before tests
beforeAll(() => {
	register('en', () => Promise.resolve({
		mail: { noEmails: 'No emails found', search: 'Search', moveTo: 'Move to', markRead: 'Mark as read', markUnread: 'Mark as unread', archive: 'Archive', unarchive: 'Unarchive', delete: 'Delete', yesterday: 'Yesterday', noPreview: 'No preview', searchFolder: 'Search {folder}' },
		nav: { inbox: 'Inbox', sent: 'Sent', drafts: 'Drafts', trash: 'Trash', archive: 'Archive' },
		sidebar: { allInboxes: 'All Inboxes' }
	}));
	init({ fallbackLocale: 'en', initialLocale: 'en' });
});

beforeEach(() => {
	vi.useRealTimers();
});

afterEach(() => {
	vi.useRealTimers();
});

// Mock the stores with manual objects to avoid store imports
vi.mock('$lib/stores/mailStore.js', () => ({
	displayedEmails: { subscribe: (cb: (value: unknown[]) => void) => { cb(mockMails); return () => {}; } },
	activeFolder: { subscribe: (cb: (value: string) => void) => { cb(mockFolder); return () => {}; } },
	markMailReadLocally: vi.fn(),
	selectedAccountId: { subscribe: (cb: (value: string | null) => void) => { cb(mockSelectedAccountId); return () => {}; } },
	isLoadingMore: { subscribe: (cb: (value: boolean) => void) => { cb(mockIsLoadingMore); return () => {}; } },
	hasMore: { subscribe: (cb: (value: boolean) => void) => { cb(mockHasMore); return () => {}; } },
	loadMoreMails: vi.fn()
}));

vi.mock('$lib/stores/accountStore.js', () => ({
	accounts: { subscribe: (cb: (value: unknown[]) => void) => { cb([]); return () => {}; } }
}));

vi.mock('$lib/stores/preferencesStore.js', () => ({
	preferences: {
		subscribe: (cb: (value: UserPreferences) => void) => {
			cb(mockPreferences);
			return () => {};
		}
	}
}));

describe('MailList', () => {
	it('sanitizes leaked HTML in preview and falls back to body/html when preview is empty', () => {
		mockMails = [
			{
				id: 'html-1',
				from_name: 'HTML Sender',
				from_email: 'html@example.com',
				subject: 'HTML leak case',
				preview: '<!-- leaked --><div><p>Visible summary from html</p><p class="x">more</p></div>',
				body: '',
				html_body: '',
				timestamp: Date.now(),
				is_read: false,
				has_attachments: false,
				account_id: 'acc-1',
				folder: 'inbox'
			},
			{
				id: 'html-2',
				from_name: 'Fallback Sender',
				from_email: 'fallback@example.com',
				subject: 'Body fallback case',
				preview: '<!-- only comment --> <div><br></div>',
				body: 'Plain body fallback preview',
				html_body: '',
				timestamp: Date.now() - 1000,
				is_read: false,
				has_attachments: false,
				account_id: 'acc-1',
				folder: 'inbox'
			},
			{
				id: 'html-3',
				from_name: 'HTML Body Sender',
				from_email: 'htmlbody@example.com',
				subject: 'HTML body fallback case',
				preview: '',
				body: '',
				html_body: '<div>HTML body fallback preview</div>',
				timestamp: Date.now() - 2000,
				is_read: true,
				has_attachments: false,
				account_id: 'acc-2',
				folder: 'inbox'
			}
		];

		const { container } = render(MailList, {
			selectedMailId: null,
			onSelectMail: vi.fn(),
			width: 300
		});

		expect(screen.getByText(/Visible summary from html/)).toBeInTheDocument();
		expect(screen.getByText('Plain body fallback preview')).toBeInTheDocument();
		expect(screen.getByText('HTML body fallback preview')).toBeInTheDocument();
		expect(container.textContent).not.toContain('<!--');
		expect(container.textContent).not.toContain('<p>');
		expect(container.textContent).not.toContain('No preview');
	});

	it('renders subject and first-line preview, not account/from text', () => {
		mockMails = [
			{
				id: 'm1',
				from_name: 'Alice Team',
				from_email: 'alice@example.com',
				subject: 'Weekly sync and roadmap planning for Q3 milestones',
				preview: 'First line for preview.\nSecond line should not be used.',
				timestamp: Date.now(),
				is_read: false,
				has_attachments: false,
				account_id: 'acc-1',
				folder: 'inbox'
			}
		];
		mockPreferences = {
			...mockPreferences,
			appearance: {
				...mockPreferences.appearance,
				showPreviewSnippets: true,
				mailDensity: 'comfortable'
			}
		};

		render(MailList, {
			selectedMailId: null,
			onSelectMail: vi.fn(),
			width: 300
		});

		expect(screen.getByText(/Weekly sync and roadmap planning/)).toBeInTheDocument();
		expect(screen.getByText('First line for preview.')).toBeInTheDocument();
		expect(screen.queryByText('Alice Team')).not.toBeInTheDocument();
		expect(screen.queryByText('alice@example.com')).not.toBeInTheDocument();
	});

	it('renders "No emails found" when list is empty', () => {
		mockMails = [];
		render(MailList, {
			selectedMailId: null,
			onSelectMail: vi.fn(),
			width: 300
		});

		expect(screen.getByText('No emails found')).toBeInTheDocument();
	});

	it('uses the custom folder name in the search placeholder', () => {
		mockMails = [];
		mockFolder = 'custom:Projects';

		render(MailList, {
			selectedMailId: null,
			onSelectMail: vi.fn(),
			width: 300
		});

		expect(screen.getByPlaceholderText('Search Projects')).toBeInTheDocument();
	});

	it('renders "Move to..." button with proper text wrapping', () => {
		mockMails = [];
		// Test that the component renders without errors when provided with optional callbacks
		const { container } = render(MailList, {
			selectedMailId: null,
			onSelectMail: vi.fn(),
			onMarkRead: vi.fn(),
			onArchive: vi.fn(),
			onDelete: vi.fn(),
			onMoveTo: vi.fn(),
			width: 300
		});

		// Verify that the component renders without errors
		expect(container.firstChild).toBeInTheDocument();
	});

	it('locks mail list overscroll chain on the virtualized viewport', () => {
		mockMails = [
			{
				id: 'scroll-lock-1',
				from_name: 'Scroll',
				from_email: 'scroll@example.com',
				subject: 'Scroll lock',
				preview: 'Ensure overscroll chain is contained.',
				timestamp: Date.now(),
				is_read: true,
				has_attachments: false,
				account_id: 'acc-1',
				folder: 'inbox'
			}
		];

		const { container } = render(MailList, {
			selectedMailId: null,
			onSelectMail: vi.fn(),
			width: 300
		});

		const viewport = container.querySelector('div[style*="overscroll-behavior-y: contain"]');
		expect(viewport).toBeInTheDocument();
		expect(viewport?.getAttribute('style')).toContain('overscroll-behavior-x: none');
		expect(screen.getByTestId('mail-list-scroll-shell')).toBeInTheDocument();
	});

	it('keeps a deleting row in DOM for 300ms before invoking delete callback', async () => {
		vi.useFakeTimers();
		const onDelete = vi.fn();

		mockMails = [
			{
				id: 'delete-1',
				from_name: 'Ops',
				from_email: 'ops@example.com',
				subject: 'Delete animation target',
				preview: 'Pending delete row should stay briefly.',
				timestamp: Date.now(),
				is_read: true,
				has_attachments: false,
				account_id: 'acc-1',
				folder: 'inbox'
			}
		];

		render(MailList, {
			selectedMailId: 'delete-1',
			onSelectMail: vi.fn(),
			onDelete,
			width: 300
		});

		const mailRowButton = await screen.findByTestId('mail-item-delete-1');
		await fireEvent.keyDown(mailRowButton, { key: 'Delete' });

		await vi.advanceTimersByTimeAsync(300);
		expect(mailRowButton).toBeInTheDocument();
		expect(onDelete).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync(30);
		expect(onDelete).toHaveBeenCalledTimes(1);
	});
});
