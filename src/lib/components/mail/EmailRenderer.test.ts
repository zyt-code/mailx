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

	it('renders complex html content inside an isolated iframe to preserve layout', async () => {
		const { container } = render(EmailRenderer, {
			htmlBody:
				'<html><head><style>table{width:600px}td{padding:24px}</style><script>alert("xss")</script></head><body><table><tr><td><a href="https://example.com">Cell</a></td></tr></table></body></html>',
			plainBody: 'fallback'
		});

		await waitFor(() => {
			expect(container.querySelector('.mail-renderer-html__frame')).not.toBeNull();
		});

		const iframe = container.querySelector('.mail-renderer-html__frame') as HTMLIFrameElement | null;

		expect(iframe?.getAttribute('srcdoc')).toContain('<table>');
		expect(iframe?.getAttribute('srcdoc')).toContain('table{width:600px}');
		expect(iframe?.getAttribute('srcdoc')).toContain('target="_blank"');
		expect(iframe?.getAttribute('srcdoc')).not.toContain('<script>');
	});
});
