import { describe, expect, it, vi } from 'vitest';
import type { Mail } from '$lib/types.js';
import { createReadingPaneMailActions } from './readingPaneMailActions.js';

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
		starred: false,
		...overrides
	};
}

describe('createReadingPaneMailActions', () => {
	it('archives non-archived mail and refreshes', async () => {
		const moveToArchive = vi.fn().mockResolvedValue(undefined);
		const onRefresh = vi.fn();
		const actions = createReadingPaneMailActions({
			db: {
				moveToArchive,
				moveToTrash: vi.fn(),
				toggleStar: vi.fn(),
				updateMail: vi.fn()
			},
			onRefresh
		});

		await actions.archiveMail(createMail({ folder: 'inbox' }));

		expect(moveToArchive).toHaveBeenCalledWith('mail-1');
		expect(onRefresh).toHaveBeenCalledTimes(1);
	});

	it('unarchives archived mail back to inbox and refreshes', async () => {
		const updateMail = vi.fn().mockResolvedValue(undefined);
		const onRefresh = vi.fn();
		const actions = createReadingPaneMailActions({
			db: {
				moveToArchive: vi.fn(),
				moveToTrash: vi.fn(),
				toggleStar: vi.fn(),
				updateMail
			},
			onRefresh
		});

		await actions.archiveMail(createMail({ folder: 'archive' }));

		expect(updateMail).toHaveBeenCalledWith(
			expect.objectContaining({
				id: 'mail-1',
				folder: 'inbox'
			})
		);
		expect(onRefresh).toHaveBeenCalledTimes(1);
	});

	it('deletes mail and refreshes', async () => {
		const moveToTrash = vi.fn().mockResolvedValue(undefined);
		const onRefresh = vi.fn();
		const actions = createReadingPaneMailActions({
			db: {
				moveToArchive: vi.fn(),
				moveToTrash,
				toggleStar: vi.fn(),
				updateMail: vi.fn()
			},
			onRefresh
		});

		await actions.deleteMail(createMail({ folder: 'sent' }));

		expect(moveToTrash).toHaveBeenCalledWith('mail-1', 'sent');
		expect(onRefresh).toHaveBeenCalledTimes(1);
	});

	it('toggles the star flag and refreshes', async () => {
		const toggleStar = vi.fn().mockResolvedValue(undefined);
		const onRefresh = vi.fn();
		const actions = createReadingPaneMailActions({
			db: {
				moveToArchive: vi.fn(),
				moveToTrash: vi.fn(),
				toggleStar,
				updateMail: vi.fn()
			},
			onRefresh
		});

		await actions.toggleStar(createMail({ starred: true }));

		expect(toggleStar).toHaveBeenCalledWith('mail-1', false);
		expect(onRefresh).toHaveBeenCalledTimes(1);
	});

	it('logs failures without refreshing', async () => {
		const logError = vi.fn();
		const onRefresh = vi.fn();
		const actions = createReadingPaneMailActions({
			db: {
				moveToArchive: vi.fn().mockRejectedValue(new Error('archive failed')),
				moveToTrash: vi.fn(),
				toggleStar: vi.fn(),
				updateMail: vi.fn()
			},
			onRefresh,
			logError
		});

		await actions.archiveMail(createMail({ folder: 'inbox' }));

		expect(logError).toHaveBeenCalledWith('Failed to archive mail:', expect.any(Error));
		expect(onRefresh).not.toHaveBeenCalled();
	});
});
