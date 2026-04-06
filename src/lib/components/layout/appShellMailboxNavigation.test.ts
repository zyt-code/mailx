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
			getActiveFolder: () => 'inbox',
			setActiveFolder: vi.fn(),
			switchFolder: vi.fn(),
			selectAccount: vi.fn()
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
			getActiveFolder: () => 'inbox',
			setActiveFolder,
			switchFolder,
			selectAccount: vi.fn()
		});

		navigation.selectFolder('archive');

		expect(setActiveFolder).toHaveBeenCalledWith('archive');
		expect(setSelectedMailId).toHaveBeenCalledWith(null);
		expect(setMobileView).toHaveBeenCalledWith('list');
		expect(switchFolder).toHaveBeenCalledWith('archive');
	});

	it('preserves the current folder when switching accounts', () => {
		const selectMailboxAccount = vi.fn();
		const setActiveFolder = vi.fn();
		const setSelectedMailId = vi.fn();
		const setMobileView = vi.fn();
		const switchFolder = vi.fn();

		const navigation = createAppShellMailboxNavigation({
			isMobile: () => false,
			setSelectedMailId,
			setMobileView,
			getActiveFolder: () => 'inbox',
			setActiveFolder,
			switchFolder,
			selectAccount: selectMailboxAccount
		});

		navigation.selectAccount('acc-2');

		expect(selectMailboxAccount).toHaveBeenCalledWith('acc-2');
		expect(setActiveFolder).not.toHaveBeenCalled();
		expect(setSelectedMailId).toHaveBeenCalledWith(null);
		expect(setMobileView).toHaveBeenCalledWith('list');
		expect(switchFolder).not.toHaveBeenCalled();
	});

	it('resets custom folders back to inbox when switching accounts', () => {
		const selectMailboxAccount = vi.fn();
		const setActiveFolder = vi.fn();
		const setSelectedMailId = vi.fn();
		const setMobileView = vi.fn();
		const switchFolder = vi.fn();

		const navigation = createAppShellMailboxNavigation({
			isMobile: () => false,
			setSelectedMailId,
			setMobileView,
			getActiveFolder: () => 'custom:Projects',
			setActiveFolder,
			switchFolder,
			selectAccount: selectMailboxAccount
		});

		navigation.selectAccount('acc-2');

		expect(selectMailboxAccount).toHaveBeenCalledWith('acc-2');
		expect(setActiveFolder).toHaveBeenCalledWith('inbox');
		expect(setSelectedMailId).toHaveBeenCalledWith(null);
		expect(setMobileView).toHaveBeenCalledWith('list');
	});

	it('returns to the list view when leaving the reading pane', () => {
		const setMobileView = vi.fn();

		const navigation = createAppShellMailboxNavigation({
			isMobile: () => false,
			setSelectedMailId: vi.fn(),
			setMobileView,
			getActiveFolder: () => 'inbox',
			setActiveFolder: vi.fn(),
			switchFolder: vi.fn(),
			selectAccount: vi.fn()
		});

		navigation.goBackToList();

		expect(setMobileView).toHaveBeenCalledWith('list');
	});
});
