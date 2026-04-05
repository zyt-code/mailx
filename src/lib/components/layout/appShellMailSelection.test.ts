import { describe, expect, it, vi } from 'vitest';
import type { Mail } from '$lib/types.js';
import { createAppShellMailSelection } from './appShellMailSelection.js';

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

describe('createAppShellMailSelection', () => {
	it('selects the first mail when stepping forward without an active selection', async () => {
		const selectMail = vi.fn().mockResolvedValue(undefined);
		const selection = createAppShellMailSelection({
			getVisibleMails: () => [createMail('mail-1'), createMail('mail-2')],
			getSelectedMailId: () => null,
			selectMail
		});

		await selection.stepSelection(1);

		expect(selectMail).toHaveBeenCalledWith('mail-1');
	});

	it('selects the last mail when stepping backward without an active selection', async () => {
		const selectMail = vi.fn().mockResolvedValue(undefined);
		const selection = createAppShellMailSelection({
			getVisibleMails: () => [createMail('mail-1'), createMail('mail-2')],
			getSelectedMailId: () => null,
			selectMail
		});

		await selection.stepSelection(-1);

		expect(selectMail).toHaveBeenCalledWith('mail-2');
	});

	it('clamps the next selection to the visible bounds', async () => {
		const selectMail = vi.fn().mockResolvedValue(undefined);
		const selection = createAppShellMailSelection({
			getVisibleMails: () => [createMail('mail-1'), createMail('mail-2')],
			getSelectedMailId: () => 'mail-2',
			selectMail
		});

		await selection.stepSelection(1);

		expect(selectMail).toHaveBeenCalledWith('mail-2');
	});

	it('does nothing when there are no visible mails', async () => {
		const selectMail = vi.fn().mockResolvedValue(undefined);
		const selection = createAppShellMailSelection({
			getVisibleMails: () => [],
			getSelectedMailId: () => null,
			selectMail
		});

		await selection.stepSelection(1);

		expect(selectMail).not.toHaveBeenCalled();
	});
});
