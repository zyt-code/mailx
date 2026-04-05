import { describe, expect, it, vi } from 'vitest';
import type { Mail } from '$lib/types.js';
import { createMailboxContextActions } from './mailboxContextActions.js';

function createMail(overrides: Partial<Mail> = {}): Mail {
	return {
		id: 'mail-1',
		from_name: 'Sender',
		from_email: 'sender@example.com',
		subject: 'Subject',
		preview: 'Preview',
		body: 'Body',
		timestamp: Date.now(),
		folder: 'inbox',
		is_read: false,
		unread: true,
		...overrides
	};
}

describe('createMailboxContextActions', () => {
	it('moves a mail to trash, clears selection, and reloads', async () => {
		const moveToTrash = vi.fn().mockResolvedValue(undefined);
		const reload = vi.fn().mockResolvedValue(undefined);
		const clearSelectedMail = vi.fn();

		const actions = createMailboxContextActions({
			db: {
				moveToTrash,
				moveToArchive: vi.fn(),
				updateMail: vi.fn()
			},
			reload,
			clearSelectedMail
		});

		await actions.deleteMail(createMail({ folder: 'inbox' }));

		expect(moveToTrash).toHaveBeenCalledWith('mail-1', 'inbox');
		expect(clearSelectedMail).toHaveBeenCalledWith('mail-1');
		expect(reload).toHaveBeenCalledTimes(1);
	});

	it('unarchives archived mail back to inbox through updateMail', async () => {
		const updateMail = vi.fn().mockResolvedValue(undefined);

		const actions = createMailboxContextActions({
			db: {
				moveToTrash: vi.fn(),
				moveToArchive: vi.fn(),
				updateMail
			},
			reload: vi.fn().mockResolvedValue(undefined),
			clearSelectedMail: vi.fn()
		});

		await actions.archiveMail(createMail({ folder: 'archive' }));

		expect(updateMail).toHaveBeenCalledWith(
			expect.objectContaining({
				id: 'mail-1',
				folder: 'inbox'
			})
		);
	});

	it('archives non-archived mail through moveToArchive', async () => {
		const moveToArchive = vi.fn().mockResolvedValue(undefined);

		const actions = createMailboxContextActions({
			db: {
				moveToTrash: vi.fn(),
				moveToArchive,
				updateMail: vi.fn()
			},
			reload: vi.fn().mockResolvedValue(undefined),
			clearSelectedMail: vi.fn()
		});

		await actions.archiveMail(createMail({ folder: 'inbox' }));

		expect(moveToArchive).toHaveBeenCalledWith('mail-1');
	});

	it('moves a mail to a target folder, clears selection, and reloads', async () => {
		const updateMail = vi.fn().mockResolvedValue(undefined);
		const reload = vi.fn().mockResolvedValue(undefined);
		const clearSelectedMail = vi.fn();

		const actions = createMailboxContextActions({
			db: {
				moveToTrash: vi.fn(),
				moveToArchive: vi.fn(),
				updateMail
			},
			reload,
			clearSelectedMail
		});

		await actions.moveToFolder(createMail({ folder: 'inbox' }), 'trash');

		expect(updateMail).toHaveBeenCalledWith(
			expect.objectContaining({
				id: 'mail-1',
				folder: 'trash'
			})
		);
		expect(clearSelectedMail).toHaveBeenCalledWith('mail-1');
		expect(reload).toHaveBeenCalledTimes(1);
	});

	it('logs failures without clearing selection or reloading', async () => {
		const logError = vi.fn();
		const reload = vi.fn().mockResolvedValue(undefined);
		const clearSelectedMail = vi.fn();

		const actions = createMailboxContextActions({
			db: {
				moveToTrash: vi.fn().mockRejectedValue(new Error('db failed')),
				moveToArchive: vi.fn(),
				updateMail: vi.fn()
			},
			reload,
			clearSelectedMail,
			logError
		});

		await actions.deleteMail(createMail({ folder: 'inbox' }));

		expect(logError).toHaveBeenCalledWith('Failed to delete mail:', expect.any(Error));
		expect(clearSelectedMail).not.toHaveBeenCalled();
		expect(reload).not.toHaveBeenCalled();
	});
});
