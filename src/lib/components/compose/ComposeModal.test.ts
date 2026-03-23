import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { init, register } from 'svelte-i18n';
import type { UserPreferences } from '$lib/stores/preferencesStore';
import * as db from '$lib/db/index.js';
import * as accounts from '$lib/accounts/index.js';
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
const showToastMock = vi.fn();
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
	document.documentElement.className = '';
	vi.clearAllMocks();
	vi.useRealTimers();
	(window as any).notification = {
		show: showToastMock,
		dismiss: vi.fn()
	};
});

afterEach(() => {
	vi.useRealTimers();
	delete (window as any).notification;
});

describe('ComposeModal', () => {
	beforeEach(() => {
		register('en', () => Promise.resolve({
			common: {
				cancel: 'Cancel'
			},
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
				removeRecipient: 'Remove recipient',
				removeCcRecipient: 'Remove cc recipient',
				removeBccRecipient: 'Remove bcc recipient',
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
				discardConfirmTitle: 'Discard this draft?',
				discardConfirmMessage: 'Unsaved changes are protected until you confirm discard.',
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

	it('focuses recipient fields from labels and expands Cc/Bcc rows smoothly', async () => {
		const user = userEvent.setup();

		render(ComposeModal, {
			isOpen: true,
			onClose: vi.fn(),
			onSent: vi.fn()
		});

		const toInput = screen.getByLabelText('To');
		await user.click(screen.getByText('To'));
		expect(toInput).toHaveFocus();

		await user.click(screen.getByRole('button', { name: 'Cc' }));
		expect(await screen.findByLabelText('Cc')).toHaveFocus();

		await user.click(screen.getByRole('button', { name: 'Bcc' }));
		expect(await screen.findByLabelText('Bcc')).toHaveFocus();
	});

	it('keeps tab order smooth from To to Subject to editor', async () => {
		const user = userEvent.setup();

		render(ComposeModal, {
			isOpen: true,
			onClose: vi.fn(),
			onSent: vi.fn()
		});

		const toInput = screen.getByLabelText('To');
		const subjectInput = screen.getByLabelText('Subject');

		await user.click(toInput);
		expect(toInput).toHaveFocus();

		await user.tab();
		expect(subjectInput).toHaveFocus();

		await user.tab();
		const editor = await screen.findByTestId('compose-rich-editor');
		expect(editor).toHaveFocus();
	});

	it('keeps compose separators dark-aware and placeholders subdued', async () => {
		document.documentElement.classList.add('dark');

		render(ComposeModal, {
			isOpen: true,
			onClose: vi.fn(),
			onSent: vi.fn()
		});

		const subjectInput = screen.getByLabelText('Subject');
		const toolbar = screen.getByRole('toolbar', { name: 'Formatting toolbar' });

		expect(subjectInput).toHaveAttribute('placeholder', 'Subject');
		expect(toolbar.className).toContain('editor-toolbar');
		expect(screen.getByText('To').closest('.compose-line')).toBeInTheDocument();
	});

	it('ignores backdrop clicks and still guards escape when draft has content', async () => {
		const user = userEvent.setup();
		const onClose = vi.fn();

		render(ComposeModal, {
			isOpen: true,
			onClose,
			onSent: vi.fn()
		});

		const subjectInput = screen.getByLabelText('Subject');
		await user.type(subjectInput, 'Quarterly planning');

		await user.click(await screen.findByTestId('compose-modal-backdrop'));
		expect(onClose).not.toHaveBeenCalled();
		expect(screen.queryByRole('alertdialog', { name: 'Discard this draft?' })).not.toBeInTheDocument();
		expect(screen.getByTestId('compose-modal-backdrop')).toBeInTheDocument();

		await user.keyboard('{Escape}');
		expect(onClose).not.toHaveBeenCalled();
		expect(await screen.findByRole('alertdialog', { name: 'Discard this draft?' })).toBeInTheDocument();
		expect(screen.getByTestId('compose-modal-backdrop')).toBeInTheDocument();
	});

	it('autosaves drafts after 500ms of idle input', async () => {
		vi.useFakeTimers();
		const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTimeAsync });

		render(ComposeModal, {
			isOpen: true,
			onClose: vi.fn(),
			onSent: vi.fn()
		});

		await screen.findByRole('button', { name: /From/i });

		await user.type(screen.getByLabelText('Subject'), 'Autosave me');
		await vi.advanceTimersByTimeAsync(550);

		expect(db.createMail).toHaveBeenCalledTimes(1);
	});

	it('sends after typing recipient and clicking send', async () => {
		const user = userEvent.setup();
		const onSent = vi.fn();
		const onClose = vi.fn();

		render(ComposeModal, {
			isOpen: true,
			onClose,
			onSent
		});

		await screen.findByRole('button', { name: /From/i });
		await user.type(screen.getByLabelText('To'), 'dest@example.com');
		await user.click(screen.getByRole('button', { name: 'Send' }));

		expect(db.createMail).toHaveBeenCalled();
		expect(accounts.sendMail).toHaveBeenCalledWith('draft-1', 'acc-1');
		expect(onSent).toHaveBeenCalledTimes(1);
		expect(onClose).toHaveBeenCalledTimes(1);
	});

	it('shows real error message when send fails with non-Error payload', async () => {
		const user = userEvent.setup();
		const onSent = vi.fn();
		const onClose = vi.fn();
		vi.mocked(accounts.sendMail).mockRejectedValueOnce({ message: 'SMTP AUTH failed' });

		render(ComposeModal, {
			isOpen: true,
			onClose,
			onSent
		});

		await screen.findByRole('button', { name: /From/i });
		await user.type(screen.getByLabelText('To'), 'dest@example.com');
		await user.click(screen.getByRole('button', { name: 'Send' }));

		expect(onSent).not.toHaveBeenCalled();
		expect(onClose).not.toHaveBeenCalled();
		expect(await screen.findByText('Send failed: SMTP AUTH failed')).toBeInTheDocument();
		expect(showToastMock).toHaveBeenCalledWith({
			type: 'error',
			title: 'Send failed: SMTP AUTH failed'
		});
	});

	it('shows toast + inline validation when send is attempted without recipients', async () => {
		const user = userEvent.setup();

		render(ComposeModal, {
			isOpen: true,
			onClose: vi.fn(),
			onSent: vi.fn()
		});

		await user.click(screen.getByRole('button', { name: 'Send' }));
		expect(await screen.findByText('Add recipient')).toBeInTheDocument();
		expect(showToastMock).toHaveBeenCalledWith({
			type: 'error',
			title: 'Add recipient'
		});
	});
});
