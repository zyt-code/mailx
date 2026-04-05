import { describe, expect, it, vi } from 'vitest';
import type { Mail } from '$lib/types.js';
import { createMailboxActions } from './mailboxActions.js';

function makeMail(overrides: Partial<Mail>): Mail {
	return {
		id: 'mail-1',
		from_name: 'Sender',
		from_email: 'sender@example.com',
		subject: 'Subject',
		preview: 'Preview',
		body: 'Body',
		timestamp: Date.now(),
		folder: 'inbox',
		account_id: 'acc-1',
		is_read: false,
		unread: true,
		...overrides
	};
}

describe('createMailboxActions', () => {
	it('optimistically marks a mail as read and persists in the background', async () => {
		const markMailRead = vi.fn().mockResolvedValue(undefined);
		const emit = vi.fn();
		const updateMail = vi.fn().mockImplementation((_: string, updater: (mail: Mail) => Mail) => {
			return updater(makeMail({ is_read: false, unread: true }));
		});

		const actions = createMailboxActions({
			db: { markMailRead },
			updateMail,
			emit
		});

		const updated = actions.markMailReadLocally('mail-1');

		expect(updated).toMatchObject({ is_read: true, unread: false });
		expect(updateMail).toHaveBeenCalledTimes(1);
		expect(markMailRead).toHaveBeenCalledWith('mail-1', true);

		await vi.waitFor(() => {
			expect(emit).toHaveBeenCalledWith('mail:counts:refresh');
		});
	});

	it('rolls back the optimistic change when persistence fails', async () => {
		const markMailRead = vi.fn().mockRejectedValue(new Error('db down'));
		const emit = vi.fn();
		const updateMail = vi.fn().mockImplementation((_: string, updater: (mail: Mail) => Mail) => {
			return updater(makeMail({ is_read: false, unread: true }));
		});

		const actions = createMailboxActions({
			db: { markMailRead },
			updateMail,
			emit
		});

		actions.markMailReadLocally('mail-1');

		await vi.waitFor(() => {
			expect(updateMail).toHaveBeenCalledTimes(2);
		});
		const rollbackUpdater = updateMail.mock.calls[1][1] as (mail: Mail) => Mail;
		expect(rollbackUpdater(makeMail({ is_read: true, unread: false }))).toMatchObject({
			is_read: false,
			unread: true
		});
	});
});
