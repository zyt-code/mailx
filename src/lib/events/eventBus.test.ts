import { describe, expect, it, vi } from 'vitest';
import { EventBus } from './eventBus.js';

describe('EventBus', () => {
	it('emitAsync awaits async listeners before resolving', async () => {
		const bus = new EventBus();
		let releaseListener: (() => void) | undefined;
		const listener = vi.fn().mockImplementation(
			() =>
				new Promise<void>((resolve) => {
					releaseListener = resolve;
				})
		);

		bus.on('sync:trigger', listener);

		const emitPromise = bus.emitAsync('sync:trigger', { accountId: 'acc-1' });

		expect(listener).toHaveBeenCalledWith({ accountId: 'acc-1' });

		let settled = false;
		void emitPromise.then(() => {
			settled = true;
		});
		await Promise.resolve();

		expect(settled).toBe(false);

		releaseListener?.();
		await emitPromise;

		expect(settled).toBe(true);
	});
});
