import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it } from 'vitest';
import AppearancePage from './appearance/+page.svelte';
import { preferences } from '$lib/stores/preferencesStore.js';
import { i18nStore } from '$lib/stores/i18nStore.svelte.js';

describe('Settings appearance theme switching', () => {
	beforeEach(async () => {
		await i18nStore.waitForReady();

		document.documentElement.className = '';
		document.documentElement.style.cssText = '';
		document.body.style.cssText = '';
		localStorage.clear();

		preferences.resetSection('appearance');
		preferences.updateSection('appearance', {
			theme: 'light',
			accentTone: 'blue',
			mailDensity: 'comfortable',
			showPreviewSnippets: true,
			showAccountColor: true
		});
	});

	it('switches themes by updating classes without replacing the existing control surface', async () => {
		const { container } = render(AppearancePage);
		const controlSurface = container.querySelector('.theme-segmented');

		expect(controlSurface).toBeTruthy();
		expect(document.documentElement.classList.contains('dark')).toBe(false);

		await fireEvent.click(screen.getByRole('radio', { name: /dark/i }));

		await waitFor(() => {
			expect(document.documentElement.classList.contains('dark')).toBe(true);
		});

		expect(container.querySelector('.theme-segmented')).toBe(controlSurface);
		expect(controlSurface?.isConnected).toBe(true);
	});
});
