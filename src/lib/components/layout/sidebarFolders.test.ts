import { describe, expect, it } from 'vitest';
import type { MailboxFolder } from '$lib/types.js';
import { buildSidebarFolderItems } from './sidebarFolders.js';

function folder(overrides: Partial<MailboxFolder>): MailboxFolder {
	return {
		id: 'custom:Projects',
		label: 'Projects',
		kind: 'custom',
		unread_count: 0,
		...overrides
	};
}

describe('buildSidebarFolderItems', () => {
	it('keeps system folders in the standard order', () => {
		const items = buildSidebarFolderItems([], null);

		expect(items.map((item) => item.folder)).toEqual([
			'inbox',
			'sent',
			'drafts',
			'archive',
			'trash'
		]);
	});

	it('appends custom folders for an explicitly selected account', () => {
		const items = buildSidebarFolderItems(
			[
				folder({ id: 'custom:Projects', label: 'Projects' }),
				folder({ id: 'custom:Receipts', label: 'Receipts' })
			],
			'acc-1'
		);

		expect(items.map((item) => item.folder)).toEqual([
			'inbox',
			'sent',
			'drafts',
			'archive',
			'trash',
			'custom:Projects',
			'custom:Receipts'
		]);
		expect(items.slice(-2).map((item) => item.label)).toEqual(['Projects', 'Receipts']);
	});

	it('hides custom folders in aggregate all-inboxes mode', () => {
		const items = buildSidebarFolderItems([folder({ id: 'custom:Projects' })], null);

		expect(items.every((item) => item.kind === 'system')).toBe(true);
	});
});
