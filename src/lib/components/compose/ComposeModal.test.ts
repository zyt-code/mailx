import { render, screen } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { init, register } from 'svelte-i18n';
import type { UserPreferences } from '$lib/stores/preferencesStore';
import ComposeModal from './ComposeModal.svelte';
import MailList from '$lib/components/layout/MailList.svelte';

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

vi.mock('$lib/stores/mailStore.js', () => ({
	displayedEmails: { subscribe: (cb: (value: unknown[]) => void) => { cb(mockMails); return () => {}; } },
	activeFolder: { subscribe: (cb: (value: string) => void) => { cb(mockFolder); return () => {}; } },
	markMailReadLocally: vi.fn(),
	selectedAccountId: { subscribe: (cb: (value: string | null) => void) => { cb(mockSelectedAccountId); return () => {}; } },
	isLoadingMore: { subscribe: (cb: (value: boolean) => void) => { cb(mockIsLoadingMore); return () => {}; } },
	hasMore: { subscribe: (cb: (value: boolean) => void) => { cb(mockHasMore); return () => {}; } },
	loadMoreMails: vi.fn()
}));

vi.mock('$lib/stores/preferencesStore.js', () => ({
	preferences: {
		subscribe: (cb: (value: UserPreferences) => void) => {
			cb(mockPreferences);
			return () => {};
		}
	}
}));

vi.mock('$lib/db/index.js', () => ({
	createMail: vi.fn().mockResolvedValue('draft-1'),
	updateMail: vi.fn().mockResolvedValue(undefined),
	addMailAttachment: vi.fn().mockResolvedValue(undefined),
	removeMailAttachment: vi.fn().mockResolvedValue(undefined),
	moveToTrash: vi.fn().mockResolvedValue(undefined),
	markMailAsRead: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('$lib/accounts/index.js', () => ({
	getAccounts: vi.fn().mockResolvedValue([
		{
			id: 'acc-1',
			name: 'Primary',
			email: 'primary@example.com',
			is_active: true
		}
	]),
	sendMail: vi.fn().mockResolvedValue(undefined)
}));

beforeEach(() => {
	document.body.className = '';
});

describe('ComposeModal', () => {
	beforeEach(() => {
		register('en', () => Promise.resolve({
			compose: {
				newMessage: 'New Message',
				fromLabel: 'From {email}',
				noAccountsConfigured: 'No accounts configured',
				closeCompose: 'Close compose',
				toLabel: 'To',
				toPlaceholder: 'Add recipients',
				ccLabel: 'Cc',
				bccLabel: 'Bcc',
				subjectLabel: 'Subject',
				subjectPlaceholder: 'Subject',
				formattingToolbar: 'Formatting toolbar',
				bold: 'Bold',
				italic: 'Italic',
				underline: 'Underline',
				list: 'List',
				link: 'Link',
				attachFiles: 'Attach files',
				attach: 'Attach',
				placeholder: 'Write something',
				attachments: 'Attachments',
				removeFile: 'Remove {filename}',
				autosaveEnabled: 'Autosave enabled',
				discard: 'Discard',
				send: 'Send',
				sending: 'Sending',
				draftSavedJustNow: 'Saved just now',
				selectAccountAlert: 'Select account',
				addRecipientAlert: 'Add recipient',
				sendFailedAlert: 'Send failed: {error}'
			},
			mail: {
				noEmails: 'No emails found',
				yesterday: 'Yesterday',
				noPreview: 'No preview',
				searchFolder: 'Search {folder}',
				noSubject: 'No Subject'
			},
			nav: {
				inbox: 'Inbox',
				sent: 'Sent',
				drafts: 'Drafts',
				trash: 'Trash',
				archive: 'Archive'
			}
		}));
		init({ fallbackLocale: 'en', initialLocale: 'en' });
	});

	it('test_modal_should_overlay_search_bar', async () => {
		render(MailList, {
			selectedMailId: null,
			onSelectMail: vi.fn(),
			width: 320
		});

		render(ComposeModal, {
			isOpen: true,
			onClose: vi.fn(),
			onSent: vi.fn()
		});

		const searchBar = await screen.findByTestId('mail-search-bar');
		const backdrop = await screen.findByTestId('compose-modal-backdrop');
		const searchInput = screen.getByPlaceholderText('Search Inbox');

		expect(backdrop).toHaveClass('z-[70]');
		expect(backdrop.parentElement).toBe(document.body);
		expect(searchBar).toHaveAttribute('data-modal-obscured', 'true');
		expect(searchBar).toHaveClass('pointer-events-none');
		expect(searchInput).toBeDisabled();
		expect(document.body).toHaveClass('compose-modal-open');
	});
});
