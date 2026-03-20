import { render, screen } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';
import MailList from './MailList.svelte';

// Mock the stores with manual objects to avoid store imports
vi.mock('$lib/stores/mailStore.js', () => ({
	displayedEmails: { subscribe: (cb) => { cb([]); return () => {}; } },
	activeFolder: { subscribe: (cb) => { cb('inbox'); return () => {}; } },
	markMailReadLocally: vi.fn(),
	selectedAccountId: { subscribe: (cb) => { cb(null); return () => {}; } }
}));

vi.mock('$lib/stores/accountStore.js', () => ({
	accounts: { subscribe: (cb) => { cb([]); return () => {}; } }
}));

vi.mock('$lib/stores/preferencesStore.js', () => ({
	preferences: {
		subscribe: (cb) => {
			cb({
				appearance: {
					accentTone: 'blue',
					mailDensity: 'comfortable',
					showPreviewSnippets: true,
					showAccountColor: true
				},
				notifications: {},
				keyboard: {}
			});
			return () => {};
		}
	}
}));

describe('MailList', () => {
	it('renders "No emails found" when list is empty', () => {
		render(MailList, {
			selectedMailId: null,
			onSelectMail: vi.fn(),
			width: 300
		});

		expect(screen.getByText('No emails found')).toBeInTheDocument();
	});
});
