import { describe, expect, it, vi } from 'vitest';
import type { Folder } from '$lib/types.js';
import { createAppShellMailboxNavigation } from './appShellMailboxNavigation.js';

describe('createAppShellMailboxNavigation', () => {
	it('opens the reading view on mobile when selecting a mail', async () => {
		const setSelectedMailId = vi.fn();
		const setMobileView = vi.fn();

		const navigation = createAppShellMailboxNavigation({
			isMobile: () => true,
			setSelectedMailId,
			setMobileView,
			setActiveFolder: vi.fn(),
			switchFolder: vi.fn(),
			setSelectedAccount: vi.fn()
		});

		await navigation.selectMail('mail-1');

		expect(setSelectedMailId).toHaveBeenCalledWith('mail-1');
		expect(setMobileView).toHaveBeenCalledWith('reading');
	});

	it('resets selection and routes folder changes through switchFolder', () => {
		const setActiveFolder = vi.fn();
		const setSelectedMailId = vi.fn();
		const setMobileView = vi.fn();
		const switchFolder = vi.fn();

		const navigation = createAppShellMailboxNavigation({
			isMobile: () => false,
			setSelectedMailId,
			setMobileView,
			setActiveFolder,
			switchFolder,
			setSelectedAccount: vi.fn()
		});

		navigation.selectFolder('archive');

		expect(setActiveFolder).toHaveBeenCalledWith('archive');
		expect(setSelectedMailId).toHaveBeenCalledWith(null);
		expect(setMobileView).toHaveBeenCalledWith('list');
		expect(switchFolder).toHaveBeenCalledWith('archive');
	});

	it('resets mailbox state to inbox when switching accounts', () => {
		const setSelectedAccount = vi.fn();
		const setActiveFolder = vi.fn();
		const setSelectedMailId = vi.fn();
		const setMobileView = vi.fn();
		const switchFolder = vi.fn();

		const navigation = createAppShellMailboxNavigation({
			isMobile: () => false,
			setSelectedMailId,
			setMobileView,
			setActiveFolder,
			switchFolder,
			setSelectedAccount
		});

		navigation.selectAccount('acc-2');

		expect(setSelectedAccount).toHaveBeenCalledWith('acc-2');
		expect(setActiveFolder).toHaveBeenCalledWith('inbox');
		expect(setSelectedMailId).toHaveBeenCalledWith(null);
		expect(setMobileView).toHaveBeenCalledWith('list');
		expect(switchFolder).toHaveBeenCalledWith('inbox');
	});

	it('returns to the list view when leaving the reading pane', () => {
		const setMobileView = vi.fn();

		const navigation = createAppShellMailboxNavigation({
			isMobile: () => false,
			setSelectedMailId: vi.fn(),
			setMobileView,
			setActiveFolder: vi.fn(),
			switchFolder: vi.fn(),
			setSelectedAccount: vi.fn()
		});

		navigation.goBackToList();

		expect(setMobileView).toHaveBeenCalledWith('list');
	});
});
