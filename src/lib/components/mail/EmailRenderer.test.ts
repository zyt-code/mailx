import { render, screen } from '@testing-library/svelte';
import { beforeAll, describe, expect, it } from 'vitest';
import { init, register } from 'svelte-i18n';
import EmailRenderer from './EmailRenderer.svelte';

beforeAll(() => {
	register('en', () =>
		Promise.resolve({
			mail: {
				emailContent: 'Email content'
			}
		})
	);

	init({
		fallbackLocale: 'en',
		initialLocale: 'en'
	});
});

describe('EmailRenderer', () => {
	it('renders sanitized html email content inside iframe srcdoc', () => {
		render(EmailRenderer, {
			htmlBody:
				'<p>Hello <a href="https://example.com">world</a></p><script>alert("xss")</script>',
			plainBody: 'fallback'
		});

		const iframe = screen.getByTitle('Email content') as HTMLIFrameElement;

		expect(iframe.srcdoc).toContain('Hello');
		expect(iframe.srcdoc).toContain('target="_blank"');
		expect(iframe.srcdoc).not.toContain('<script>');
		expect(iframe.srcdoc).not.toContain('alert("xss")');
	});

	it('falls back to escaped plain text when no html body is present', () => {
		render(EmailRenderer, {
			plainBody: 'Hello <team>\nSecond line'
		});

		const iframe = screen.getByTitle('Email content') as HTMLIFrameElement;

		expect(iframe.srcdoc).toContain('Hello &lt;team&gt;<br>Second line');
		expect(iframe.srcdoc).not.toContain('<team>');
	});
});
