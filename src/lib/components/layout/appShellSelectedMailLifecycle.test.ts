import { describe, expect, it, vi } from 'vitest';
import type { Mail } from '$lib/types.js';
import { createAppShellSelectedMailLifecycle } from './appShellSelectedMailLifecycle.js';

function createMail(id: string): Mail {
	return {
		id,
		from_name: 'Sender',
		from_email: 'sender@example.com',
		subject: `Mail ${id}`,
		preview: 'Preview',
		body: 'Body',
		timestamp: Date.now(),
		folder: 'inbox',
		is_read: false,
		unread: true
	};
}

describe('createAppShellSelectedMailLifecycle', () => {
	it('clears the selection when the selected mail is no longer visible', () => {
		const clearSelectedMail = vi.fn();
		const setMobileView = vi.fn();
		const lifecycle = createAppShellSelectedMailLifecycle({
			getVisibleMails: () => [createMail('mail-1')],
			getSelectedMailId: () => 'mail-9',
			getMobileView: () => 'list',
			clearSelectedMail,
			setMobileView
		});

		lifecycle.reconcile();

		expect(clearSelectedMail).toHaveBeenCalledTimes(1);
		expect(setMobileView).not.toHaveBeenCalled();
	});

	it('returns mobile reading view back to the list when the selected mail disappears', () => {
		const clearSelectedMail = vi.fn();
		const setMobileView = vi.fn();
		const lifecycle = createAppShellSelectedMailLifecycle({
			getVisibleMails: () => [createMail('mail-1')],
			getSelectedMailId: () => 'mail-9',
			getMobileView: () => 'reading',
			clearSelectedMail,
			setMobileView
		});

		lifecycle.reconcile();

		expect(clearSelectedMail).toHaveBeenCalledTimes(1);
		expect(setMobileView).toHaveBeenCalledWith('list');
	});

	it('keeps the current selection when the selected mail still exists', () => {
		const clearSelectedMail = vi.fn();
		const setMobileView = vi.fn();
		const lifecycle = createAppShellSelectedMailLifecycle({
			getVisibleMails: () => [createMail('mail-1')],
			getSelectedMailId: () => 'mail-1',
			getMobileView: () => 'reading',
			clearSelectedMail,
			setMobileView
		});

		lifecycle.reconcile();

		expect(clearSelectedMail).not.toHaveBeenCalled();
		expect(setMobileView).not.toHaveBeenCalled();
	});

	it('does nothing when no mail is selected', () => {
		const clearSelectedMail = vi.fn();
		const setMobileView = vi.fn();
		const lifecycle = createAppShellSelectedMailLifecycle({
			getVisibleMails: () => [createMail('mail-1')],
			getSelectedMailId: () => null,
			getMobileView: () => 'list',
			clearSelectedMail,
			setMobileView
		});

		lifecycle.reconcile();

		expect(clearSelectedMail).not.toHaveBeenCalled();
		expect(setMobileView).not.toHaveBeenCalled();
	});
});
