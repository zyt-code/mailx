import { describe, expect, it } from 'vitest';
import type { Mail } from '$lib/types.js';
import {
	buildComposerPayload,
	buildForwardDraft,
	buildReplyDraft,
	htmlToPlainText,
	mergeComposerPayload,
	plainTextToHtml
} from './mailContent.js';

const sampleMail: Mail = {
	id: 'mail-1',
	from_name: 'Alice',
	from_email: 'alice@example.com',
	subject: 'Quarterly Update',
	preview: 'Quarterly update preview',
	body: 'Hello team,\n\nPlain body fallback.',
	html_body: '<p>Hello <strong>team</strong>,</p><p>Plain body fallback.</p>',
	timestamp: new Date('2026-03-23T10:00:00Z').getTime(),
	folder: 'inbox',
	is_read: true,
	to: [{ name: 'Bob', email: 'bob@example.com' }],
	cc: [{ name: 'Carol', email: 'carol@example.com' }],
	reply_to: [{ name: 'Support', email: 'support@example.com' }]
};

describe('mailContent utilities', () => {
	it('converts HTML editor content into plain text, html, and preview payload', () => {
		const payload = buildComposerPayload(
			'<h2>Weekly update</h2><p>Hello <strong>team</strong><br>Ship it.</p>'
		);

		expect(payload.body).toBe('Weekly update\n\nHello team\nShip it.');
		expect(payload.html_body).toContain('<h2>Weekly update</h2>');
		expect(payload.html_body).toContain('<strong>team</strong>');
		expect(payload.preview).toBe('Weekly update');
	});

	it('creates reply draft content with quoted plain text and blockquote html', () => {
		const reply = buildReplyDraft(sampleMail, {
			rePrefix: 'Re: ',
			originalMessage: 'On ',
			fromField: 'From: ',
			dateField: 'Date: ',
			subjectField: 'Subject: '
		});

		expect(reply.subject).toBe('Re: Quarterly Update');
		expect(reply.body).toContain('On ');
		expect(reply.body).toContain('From: Alice <alice@example.com>');
		expect(reply.body).toContain('Plain body fallback.');
		expect(reply.html_body).toContain('<blockquote');
		expect(reply.html_body).toContain('<strong>team</strong>');
	});

	it('creates forward draft content preserving quoted body and forwarded heading', () => {
		const forward = buildForwardDraft(sampleMail, {
			fwdPrefix: 'Fwd: ',
			forwardedMessage: 'Forwarded message',
			fromField: 'From: ',
			dateField: 'Date: ',
			subjectField: 'Subject: ',
			toField: 'To: ',
			ccField: 'Cc: ',
			replyToField: 'Reply-To: '
		});

		expect(forward.subject).toBe('Fwd: Quarterly Update');
		expect(forward.body).toContain('Forwarded message');
		expect(forward.body).toContain('Subject: Quarterly Update');
		expect(forward.body).toContain('To: Bob <bob@example.com>');
		expect(forward.body).toContain('Cc: Carol <carol@example.com>');
		expect(forward.body).toContain('Reply-To: Support <support@example.com>');
		expect(forward.html_body).toContain('Forwarded message');
		expect(forward.html_body).toContain('<strong>To: </strong>Bob &lt;bob@example.com&gt;');
		expect(forward.html_body).toContain('<strong>Reply-To: </strong>Support &lt;support@example.com&gt;');
		expect(forward.html_body).toContain('<p>Hello <strong>team</strong>,</p>');
	});

	it('round-trips plain text html conversion for compose bootstrap', () => {
		const text = 'Line one\n\nLine two';
		const html = plainTextToHtml(text);

		expect(html).toContain('<p>Line one</p>');
		expect(htmlToPlainText(html)).toBe(text);
	});

	it('merges user content with preserved forwarded reference html', () => {
		const merged = mergeComposerPayload(
			buildComposerPayload('<p>My intro</p>'),
			{
				body: 'Forwarded message\nBody',
				html_body: '<p><strong>Forwarded message</strong></p><p>Body</p>'
			}
		);

		expect(merged.body).toContain('My intro');
		expect(merged.body).toContain('Forwarded message');
		expect(merged.html_body).toContain('<p>My intro</p>');
		expect(merged.html_body).toContain('<strong>Forwarded message</strong>');
	});
});
