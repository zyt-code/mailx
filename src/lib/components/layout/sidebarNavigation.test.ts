import { describe, expect, it, vi } from 'vitest';
import type { Folder } from '$lib/types.js';
import { createSidebarNavigation } from './sidebarNavigation.js';

describe('createSidebarNavigation', () => {
	it('mirrors selected account state locally and notifies account selection', () => {
		let selectedAccountId: string | null = null;
		const onSelectAccount = vi.fn();
		const navigation = createSidebarNavigation({
			getIsAccountConfigured: () => true,
			getIsMobile: () => false,
			setSelectedAccountId: (value) => {
				selectedAccountId = value;
			},
			onSelectAccount,
			onSelectFolder: vi.fn(),
			onToggle: vi.fn(),
			showDisabledFeedback: vi.fn()
		});

		navigation.selectAccount('acc-2');

		expect(selectedAccountId).toBe('acc-2');
		expect(onSelectAccount).toHaveBeenCalledWith('acc-2');
	});

	it('blocks folder navigation and shows disabled feedback when no account is configured', () => {
		const onSelectFolder = vi.fn();
		const onToggle = vi.fn();
		const showDisabledFeedback = vi.fn();
		const navigation = createSidebarNavigation({
			getIsAccountConfigured: () => false,
			getIsMobile: () => true,
			setSelectedAccountId: vi.fn(),
			onSelectAccount: vi.fn(),
			onSelectFolder,
			onToggle,
			showDisabledFeedback
		});

		navigation.selectFolder('archive');

		expect(showDisabledFeedback).toHaveBeenCalledTimes(1);
		expect(onSelectFolder).not.toHaveBeenCalled();
		expect(onToggle).not.toHaveBeenCalled();
	});

	it('selects the folder and closes the mobile sidebar when configured', () => {
		const onSelectFolder = vi.fn();
		const onToggle = vi.fn();
		const navigation = createSidebarNavigation({
			getIsAccountConfigured: () => true,
			getIsMobile: () => true,
			setSelectedAccountId: vi.fn(),
			onSelectAccount: vi.fn(),
			onSelectFolder,
			onToggle,
			showDisabledFeedback: vi.fn()
		});

		navigation.selectFolder('trash');

		expect(onSelectFolder).toHaveBeenCalledWith('trash');
		expect(onToggle).toHaveBeenCalledTimes(1);
	});

	it('keeps the desktop sidebar open when selecting folders on desktop', () => {
		const onToggle = vi.fn();
		const navigation = createSidebarNavigation({
			getIsAccountConfigured: () => true,
			getIsMobile: () => false,
			setSelectedAccountId: vi.fn(),
			onSelectAccount: vi.fn(),
			onSelectFolder: vi.fn(),
			onToggle,
			showDisabledFeedback: vi.fn()
		});

		navigation.selectFolder('sent');

		expect(onToggle).not.toHaveBeenCalled();
	});
});
