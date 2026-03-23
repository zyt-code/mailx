import { render, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getCurrentWindow } from '@tauri-apps/api/window';
import App from './App.svelte';

type ThemeListener = ((event: { payload: 'light' | 'dark' }) => void | Promise<void>) | null;

describe('App system dark mode sync', () => {
	let themeListener: ThemeListener = null;

	beforeEach(() => {
		themeListener = null;
		document.documentElement.className = '';
		document.documentElement.style.cssText = '';
		document.body.style.cssText = '';
		localStorage.clear();

		Object.defineProperty(window, 'matchMedia', {
			writable: true,
			value: vi.fn().mockImplementation((query: string) => ({
				matches: false,
				media: query,
				onchange: null,
				addListener: vi.fn(),
				removeListener: vi.fn(),
				addEventListener: vi.fn(),
				removeEventListener: vi.fn(),
				dispatchEvent: vi.fn()
			}))
		});

		vi.mocked(getCurrentWindow).mockReturnValue({
			theme: vi.fn().mockResolvedValue('light'),
			onThemeChanged: vi.fn(async (handler) => {
				themeListener = handler as ThemeListener;
				return () => {
					themeListener = null;
				};
			})
		} as any);
	});

	it('applies dark class and dark body background when the system theme switches to dark', async () => {
		render(App);

		await waitFor(() => {
			expect(document.documentElement.classList.contains('dark')).toBe(false);
		});

		await themeListener?.({ payload: 'dark' });

		await waitFor(() => {
			expect(document.documentElement.classList.contains('dark')).toBe(true);
		});

		expect(getComputedStyle(document.body).backgroundColor).toBe('rgb(13, 17, 23)');
	});
});
