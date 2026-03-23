import { render, waitFor } from '@testing-library/svelte';
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
	it('renders simple html content through the readonly tiptap renderer', async () => {
		const { container } = render(EmailRenderer, {
			htmlBody:
				'<p>Hello <a href="https://example.com">world</a></p><script>alert("xss")</script>',
			plainBody: 'fallback'
		});

		await waitFor(() => {
			expect(container.querySelector('.ProseMirror')?.textContent).toContain('Hello world');
		});
		const link = container.querySelector('.ProseMirror a');

		expect(link?.getAttribute('href')).toBe('https://example.com');
		expect(link?.getAttribute('target')).toBe('_blank');
		expect(container.querySelector('.ProseMirror')?.textContent).toContain('Hello world');
		expect(container.querySelector('.ProseMirror')?.innerHTML).not.toContain('<script>');
		expect(container.querySelector('.ProseMirror')?.innerHTML).not.toContain('alert("xss")');
	});

	it('falls back to tiptap-rendered plain text when no html body is present', async () => {
		const { container } = render(EmailRenderer, {
			plainBody: 'Hello <team>\nSecond line'
		});

		await waitFor(() => {
			expect(container.querySelector('.ProseMirror')?.textContent).toContain('Hello <team>');
		});

		expect(container.querySelector('.ProseMirror')?.textContent).toContain('Hello <team>');
		expect(container.querySelector('.ProseMirror')?.innerHTML).not.toContain('<team>');
		expect(container.querySelector('.ProseMirror')?.textContent).toContain('Second line');
	});

	it('falls back to sanitized html rendering for unsupported rich html structures', async () => {
		const { container } = render(EmailRenderer, {
			htmlBody:
				'<table><tr><td>Cell</td></tr></table><style>body{background:black}</style><script>alert("xss")</script>',
			plainBody: 'fallback'
		});

		await waitFor(() => {
			expect(container.querySelector('.mail-renderer-html')).not.toBeNull();
		});

		const rendered = container.querySelector('.mail-renderer-html__content');

		expect(rendered?.innerHTML).toContain('<table>');
		expect(rendered?.textContent).toContain('Cell');
		expect(rendered?.innerHTML).not.toContain('<style>');
		expect(rendered?.innerHTML).not.toContain('<script>');
	});
});
