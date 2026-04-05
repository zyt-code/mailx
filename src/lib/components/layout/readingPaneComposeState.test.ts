import { describe, expect, it, vi } from 'vitest';
import type { Mail } from '$lib/types.js';
import { createReadingPaneComposeState } from './readingPaneComposeState.js';

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

describe('createReadingPaneComposeState', () => {
	it('opens reply compose with the current mail', () => {
		let showCompose = false;
		let composeMode: 'reply' | 'forward' | null = null;
		let composeMail: Mail | null = null;
		let currentMail: Mail | null = createMail('mail-1');
		const composeState = createReadingPaneComposeState({
			getMail: () => currentMail,
			setShowCompose: (value) => {
				showCompose = value;
			},
			setComposeMode: (value) => {
				composeMode = value;
			},
			setComposeMail: (value) => {
				composeMail = value;
			}
		});

		composeState.openReply();

		expect(showCompose).toBe(true);
		expect(composeMode).toBe('reply');
		expect(composeMail).toEqual(expect.objectContaining({ id: 'mail-1' }));
	});

	it('uses reply mode for reply-all', () => {
		let showCompose = false;
		let composeMode: 'reply' | 'forward' | null = null;
		let composeMail: Mail | null = null;
		const composeState = createReadingPaneComposeState({
			getMail: () => createMail('mail-2'),
			setShowCompose: (value) => {
				showCompose = value;
			},
			setComposeMode: (value) => {
				composeMode = value;
			},
			setComposeMail: (value) => {
				composeMail = value;
			}
		});

		composeState.openReplyAll();

		expect(showCompose).toBe(true);
		expect(composeMode).toBe('reply');
		expect(composeMail).toEqual(expect.objectContaining({ id: 'mail-2' }));
	});

	it('opens forward compose with the current mail', () => {
		let showCompose = false;
		let composeMode: 'reply' | 'forward' | null = null;
		let composeMail: Mail | null = null;
		const composeState = createReadingPaneComposeState({
			getMail: () => createMail('mail-3'),
			setShowCompose: (value) => {
				showCompose = value;
			},
			setComposeMode: (value) => {
				composeMode = value;
			},
			setComposeMail: (value) => {
				composeMail = value;
			}
		});

		composeState.openForward();

		expect(showCompose).toBe(true);
		expect(composeMode).toBe('forward');
		expect(composeMail).toEqual(expect.objectContaining({ id: 'mail-3' }));
	});

	it('clears compose state when closing', () => {
		let showCompose = true;
		let composeMode: 'reply' | 'forward' | null = 'reply';
		let composeMail: Mail | null = createMail('mail-4');
		const composeState = createReadingPaneComposeState({
			getMail: () => composeMail,
			setShowCompose: (value) => {
				showCompose = value;
			},
			setComposeMode: (value) => {
				composeMode = value;
			},
			setComposeMail: (value) => {
				composeMail = value;
			}
		});

		composeState.closeCompose();

		expect(showCompose).toBe(false);
		expect(composeMode).toBeNull();
		expect(composeMail).toBeNull();
	});

	it('closes compose and refreshes after send', () => {
		let showCompose = true;
		let composeMode: 'reply' | 'forward' | null = 'forward';
		let composeMail: Mail | null = createMail('mail-5');
		const onRefresh = vi.fn();
		const composeState = createReadingPaneComposeState({
			getMail: () => composeMail,
			setShowCompose: (value) => {
				showCompose = value;
			},
			setComposeMode: (value) => {
				composeMode = value;
			},
			setComposeMail: (value) => {
				composeMail = value;
			},
			onRefresh
		});

		composeState.onComposeSent();

		expect(showCompose).toBe(false);
		expect(composeMode).toBeNull();
		expect(composeMail).toBeNull();
		expect(onRefresh).toHaveBeenCalledTimes(1);
	});
});
