import { render, waitFor } from '@testing-library/svelte';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { init, register } from 'svelte-i18n';
import ReadingPane from './ReadingPane.svelte';
import type { Mail } from '$lib/types.js';

const ensureMailContentMock = vi.fn();

vi.mock('$lib/db/index.js', () => ({
	ensureMailContent: (id: string) => ensureMailContentMock(id),
	moveToArchive: vi.fn(),
	moveToTrash: vi.fn(),
	toggleStar: vi.fn(),
	updateMail: vi.fn()
}));

function createMail(overrides: Partial<Mail> = {}): Mail {
	return {
		id: 'mail-1',
		from_name: 'Sender',
		from_email: 'sender@example.com',
		subject: 'Subject',
		preview: 'Preview',
		body: '',
		timestamp: Date.now(),
		folder: 'inbox',
		is_read: false,
		unread: true,
		account_id: 'acc-a',
		uid: 42,
		...overrides
	};
}

beforeAll(() => {
	register('en', () =>
		Promise.resolve({
			loading: 'Loading...',
			mail: {
				backToList: 'Back',
				selectEmail: 'Select an email to read'
			}
		})
	);

	init({
		fallbackLocale: 'en',
		initialLocale: 'en'
	});
});

beforeEach(() => {
	ensureMailContentMock.mockReset();
});

describe('ReadingPane', () => {
	it('loads remote content when the selected mail only has metadata', async () => {
		ensureMailContentMock.mockResolvedValue(
			createMail({
				body: 'Fetched body',
				html_body: '<p>Fetched body</p>'
			})
		);

		render(ReadingPane, {
			mail: {
				...createMail(),
				content_state: 'metadata_only'
			} as Mail,
			isMobile: false,
			onBack: () => {}
		});

		await waitFor(() => {
			expect(ensureMailContentMock).toHaveBeenCalledWith('mail-1');
		});

		await waitFor(() => {
			expect(document.body.textContent).toContain('Fetched body');
		});
	});

	it('does not load remote content when the selected mail body is already cached', async () => {
		render(ReadingPane, {
			mail: {
				...createMail({
					body: 'Cached body',
					html_body: '<p>Cached body</p>'
				}),
				content_state: 'body_cached'
			} as Mail,
			isMobile: false,
			onBack: () => {}
		});

		await waitFor(() => {
			expect(document.body.textContent).toContain('Cached body');
		});

		expect(ensureMailContentMock).not.toHaveBeenCalled();
	});
});
