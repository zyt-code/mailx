import { describe, expect, it } from 'vitest';
import type { Folder } from '$lib/types.js';
import {
	normalizeMailboxSelection,
	resolveFallbackAccountId,
	resolveMailboxScope
} from './mailboxScope.js';

type AccountLike = {
	id: string;
	is_active: boolean;
};

const accounts: AccountLike[] = [
	{ id: 'acc-1', is_active: false },
	{ id: 'acc-2', is_active: true }
];

function scope(folder: Folder, selectedAccountId: string | null) {
	return resolveMailboxScope(folder, selectedAccountId, accounts);
}

describe('mailboxScope', () => {
	it('keeps all-inboxes aggregate scope only for inbox', () => {
		expect(scope('inbox', null)).toEqual({
			selectedAccountId: null,
			effectiveAccountId: null
		});
		expect(scope('sent', null)).toEqual({
			selectedAccountId: 'acc-2',
			effectiveAccountId: 'acc-2'
		});
	});

	it('preserves an explicit selected account for non-inbox folders', () => {
		expect(scope('archive', 'acc-1')).toEqual({
			selectedAccountId: 'acc-1',
			effectiveAccountId: 'acc-1'
		});
	});

	it('falls back to the active account when the selected account no longer exists', () => {
		expect(scope('inbox', 'acc-9')).toEqual({
			selectedAccountId: 'acc-2',
			effectiveAccountId: 'acc-2'
		});
		expect(scope('archive', 'acc-9')).toEqual({
			selectedAccountId: 'acc-2',
			effectiveAccountId: 'acc-2'
		});
	});

	it('normalizes aggregate selection to the active account when leaving inbox', () => {
		expect(normalizeMailboxSelection('drafts', null, accounts)).toBe('acc-2');
	});

	it('falls back to the first account when no active account exists', () => {
		expect(resolveFallbackAccountId([{ id: 'acc-9', is_active: false }])).toBe('acc-9');
		expect(resolveFallbackAccountId([])).toBeNull();
	});
});
