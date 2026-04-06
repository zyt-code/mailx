import { describe, expect, it } from 'vitest';
import type { Mail } from '$lib/types.js';
import {
	resolveNextSelectedMailId,
	resolveReplacementSelectedMailId,
	resolveSelectedMail
} from './appShellSelectedMail.js';

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

describe('resolveNextSelectedMailId', () => {
	it('selects the next visible mail when removing a selected mail from the middle of the list', () => {
		expect(
			resolveNextSelectedMailId(
				[createMail('mail-1'), createMail('mail-2'), createMail('mail-3')],
				'mail-2'
			)
		).toBe('mail-3');
	});

	it('falls back to the previous visible mail when removing the last selected mail', () => {
		expect(resolveNextSelectedMailId([createMail('mail-1'), createMail('mail-2')], 'mail-2')).toBe(
			'mail-1'
		);
	});

	it('returns null when no visible mail remains after removal', () => {
		expect(resolveNextSelectedMailId([createMail('mail-1')], 'mail-1')).toBeNull();
	});
});

describe('resolveReplacementSelectedMailId', () => {
	it('prefers the next still-visible mail when an external update removes the selection', () => {
		expect(
			resolveReplacementSelectedMailId(
				[createMail('mail-1'), createMail('mail-2'), createMail('mail-3')],
				[createMail('mail-2'), createMail('mail-3')],
				'mail-1'
			)
		).toBe('mail-2');
	});

	it('falls back to the previous still-visible mail when no later mail remains', () => {
		expect(
			resolveReplacementSelectedMailId(
				[createMail('mail-1'), createMail('mail-2')],
				[createMail('mail-1')],
				'mail-2'
			)
		).toBe('mail-1');
	});

	it('returns null when no nearby visible mail survives the update', () => {
		expect(
			resolveReplacementSelectedMailId(
				[createMail('mail-1'), createMail('mail-2')],
				[],
				'mail-1'
			)
		).toBeNull();
	});
});
