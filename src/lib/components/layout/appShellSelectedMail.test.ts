import { describe, expect, it } from 'vitest';
import type { Mail } from '$lib/types.js';
import { resolveSelectedMail } from './appShellSelectedMail.js';

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

describe('resolveSelectedMail', () => {
	it('returns the selected mail when it exists in the current list', () => {
		const selectedMail = resolveSelectedMail([createMail('mail-1'), createMail('mail-2')], 'mail-2');

		expect(selectedMail?.id).toBe('mail-2');
	});

	it('returns null when no selected mail id exists', () => {
		expect(resolveSelectedMail([createMail('mail-1')], null)).toBeNull();
	});

	it('returns null when the selected mail is no longer visible', () => {
		expect(resolveSelectedMail([createMail('mail-1')], 'mail-9')).toBeNull();
	});
});
