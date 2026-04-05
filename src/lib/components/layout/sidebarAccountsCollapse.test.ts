import { describe, expect, it, vi } from 'vitest';
import {
	createSidebarAccountsCollapse,
	readSidebarAccountsCollapsed
} from './sidebarAccountsCollapse.js';

describe('sidebarAccountsCollapse', () => {
	it('reads the persisted collapsed state from storage', () => {
		expect(
			readSidebarAccountsCollapsed({
				getItem: () => 'true'
			})
		).toBe(true);
	});

	it('defaults to expanded when storage is unavailable or empty', () => {
		expect(readSidebarAccountsCollapsed()).toBe(false);
		expect(
			readSidebarAccountsCollapsed({
				getItem: () => null
			})
		).toBe(false);
	});

	it('toggles the local collapsed state', () => {
		let collapsed = false;
		const controller = createSidebarAccountsCollapse({
			getCollapsed: () => collapsed,
			setCollapsed: (value) => {
				collapsed = value;
			},
			storage: {
				getItem: () => null,
				setItem: vi.fn()
			}
		});

		controller.toggle();
		expect(collapsed).toBe(true);

		controller.toggle();
		expect(collapsed).toBe(false);
	});

	it('persists the latest collapse state to storage', () => {
		const setItem = vi.fn();
		const controller = createSidebarAccountsCollapse({
			getCollapsed: () => true,
			setCollapsed: vi.fn(),
			storage: {
				getItem: () => null,
				setItem
			}
		});

		controller.persist();

		expect(setItem).toHaveBeenCalledWith('sidebar-accounts-collapsed', 'true');
	});

	it('logs storage failures without throwing', () => {
		const logWarn = vi.fn();
		const controller = createSidebarAccountsCollapse({
			getCollapsed: () => false,
			setCollapsed: vi.fn(),
			storage: {
				getItem: () => null,
				setItem: () => {
					throw new Error('storage blocked');
				}
			},
			logWarn
		});

		controller.persist();

		expect(logWarn).toHaveBeenCalledWith(
			'Failed to save sidebar collapse state:',
			expect.any(Error)
		);
	});
});
