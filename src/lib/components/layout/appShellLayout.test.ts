import { describe, expect, it, vi } from 'vitest';
import { createAppShellLayoutController } from './appShellLayout.js';

function createMediaQueryList(matches: boolean) {
	let currentMatches = matches;
	const listeners = new Set<(event: MediaQueryListEvent) => void>();

	return {
		get matches() {
			return currentMatches;
		},
		addEventListener: vi.fn((_: 'change', listener: (event: MediaQueryListEvent) => void) => {
			listeners.add(listener);
		}),
		removeEventListener: vi.fn((_: 'change', listener: (event: MediaQueryListEvent) => void) => {
			listeners.delete(listener);
		}),
		dispatch(nextMatches: boolean) {
			currentMatches = nextMatches;
			for (const listener of listeners) {
				listener({ matches: nextMatches } as MediaQueryListEvent);
			}
		}
	};
}

describe('createAppShellLayoutController', () => {
	it('restores persisted layout and syncs responsive state on initialize', () => {
		const storage = {
			getItem: vi.fn().mockReturnValue(JSON.stringify({ sidebarCollapsed: true, mailListWidth: 420 })),
			setItem: vi.fn()
		};
		const mediaQueryList = createMediaQueryList(false);
		const setSidebarCollapsed = vi.fn();
		const setMailListWidth = vi.fn();
		const setIsMobile = vi.fn();

		const controller = createAppShellLayoutController({
			storageKey: 'mailx-layout',
			storage,
			matchMedia: vi.fn().mockReturnValue(mediaQueryList),
			getWindowWidth: () => 1440,
			getSidebarWidth: () => 240,
			getSidebarCollapsed: () => true,
			getMailListWidth: () => 420,
			getIsMobile: () => false,
			setSidebarCollapsed,
			setMailListWidth,
			setIsMobile
		});

		const cleanup = controller.initialize();

		expect(setSidebarCollapsed).toHaveBeenCalledWith(true);
		expect(setMailListWidth).toHaveBeenCalledWith(420);
		expect(setIsMobile).toHaveBeenCalledWith(false);

		mediaQueryList.dispatch(true);
		expect(setIsMobile).toHaveBeenLastCalledWith(true);

		cleanup();
		expect(mediaQueryList.removeEventListener).toHaveBeenCalled();
	});

	it('toggles the sidebar and persists the updated layout', () => {
		const storage = {
			getItem: vi.fn(),
			setItem: vi.fn()
		};
		let sidebarCollapsed = false;
		let mailListWidth = 320;

		const controller = createAppShellLayoutController({
			storageKey: 'mailx-layout',
			storage,
			matchMedia: vi.fn(),
			getWindowWidth: () => 1440,
			getSidebarWidth: () => 240,
			getSidebarCollapsed: () => sidebarCollapsed,
			getMailListWidth: () => mailListWidth,
			getIsMobile: () => false,
			setSidebarCollapsed: (value) => {
				sidebarCollapsed = value;
			},
			setMailListWidth: (value) => {
				mailListWidth = value;
			},
			setIsMobile: vi.fn()
		});

		controller.toggleSidebar();

		expect(sidebarCollapsed).toBe(true);
		expect(storage.setItem).toHaveBeenCalledWith(
			'mailx-layout',
			JSON.stringify({ sidebarCollapsed: true, mailListWidth: 320 })
		);
	});

	it('clamps resized mail list width and persists it on resize end', () => {
		const storage = {
			getItem: vi.fn(),
			setItem: vi.fn()
		};
		let mailListWidth = 320;
		let sidebarCollapsed = false;

		const controller = createAppShellLayoutController({
			storageKey: 'mailx-layout',
			storage,
			matchMedia: vi.fn(),
			getWindowWidth: () => 900,
			getSidebarWidth: () => 240,
			getSidebarCollapsed: () => sidebarCollapsed,
			getMailListWidth: () => mailListWidth,
			getIsMobile: () => false,
			setSidebarCollapsed: (value) => {
				sidebarCollapsed = value;
			},
			setMailListWidth: (value) => {
				mailListWidth = value;
			},
			setIsMobile: vi.fn()
		});

		controller.resizeMailList(500);

		expect(mailListWidth).toBe(260);

		controller.finishResize();

		expect(storage.setItem).toHaveBeenCalledWith(
			'mailx-layout',
			JSON.stringify({ sidebarCollapsed: false, mailListWidth: 260 })
		);
	});
});
