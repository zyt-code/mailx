import { describe, expect, it, vi } from 'vitest';
import { bindSidebarComposeEvents } from './sidebarComposeEvents.js';

describe('bindSidebarComposeEvents', () => {
	it('opens compose when the compose:open event is emitted', () => {
		let registeredHandler: (() => void) | undefined;
		const openCompose = vi.fn();
		const cleanup = bindSidebarComposeEvents({
			eventBus: {
				on: vi.fn((event, callback) => {
					if (event === 'compose:open') {
						registeredHandler = callback;
					}
				}),
				off: vi.fn()
			},
			openCompose
		});

		registeredHandler?.();

		expect(openCompose).toHaveBeenCalledTimes(1);
		cleanup();
	});

	it('removes the compose:open listener during cleanup', () => {
		let registeredHandler: (() => void) | undefined;
		const off = vi.fn();
		const cleanup = bindSidebarComposeEvents({
			eventBus: {
				on: vi.fn((event, callback) => {
					if (event === 'compose:open') {
						registeredHandler = callback;
					}
				}),
				off
			},
			openCompose: vi.fn()
		});

		cleanup();

		expect(off).toHaveBeenCalledWith('compose:open', registeredHandler);
	});
});
