import { describe, expect, it, vi } from 'vitest';
import type { Mail } from '$lib/types.js';
import { createAppShellReadState } from './appShellReadState.js';

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

describe('createAppShellReadState', () => {
	it('routes read actions through markMailReadLocally', async () => {
		const markMailReadLocally = vi.fn();
		const markMailUnreadLocally = vi.fn();
		const readState = createAppShellReadState({
			markMailReadLocally,
			markMailUnreadLocally
		});

		await readState.setReadState(createMail('mail-1'), true);

		expect(markMailReadLocally).toHaveBeenCalledWith('mail-1');
		expect(markMailUnreadLocally).not.toHaveBeenCalled();
	});

	it('routes unread actions through markMailUnreadLocally', async () => {
		const markMailReadLocally = vi.fn();
		const markMailUnreadLocally = vi.fn();
		const readState = createAppShellReadState({
			markMailReadLocally,
			markMailUnreadLocally
		});

		await readState.setReadState(createMail('mail-1'), false);

		expect(markMailUnreadLocally).toHaveBeenCalledWith('mail-1');
		expect(markMailReadLocally).not.toHaveBeenCalled();
	});

	it('logs failures instead of throwing', async () => {
		const logError = vi.fn();
		const readState = createAppShellReadState({
			markMailReadLocally: vi.fn(() => {
				throw new Error('failed');
			}),
			markMailUnreadLocally: vi.fn(),
			logError
		});

		await readState.setReadState(createMail('mail-1'), true);

		expect(logError).toHaveBeenCalledWith('Failed to mark mail:', expect.any(Error));
	});
});
