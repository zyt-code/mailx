import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSidebarDisabledFeedback } from './sidebarDisabledFeedback.js';

describe('createSidebarDisabledFeedback', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('shows the tooltip immediately and hides it after the timeout', async () => {
		let visible = false;
		const feedback = createSidebarDisabledFeedback({
			setVisible: (value) => {
				visible = value;
			},
			durationMs: 2000
		});

		feedback.show();

		expect(visible).toBe(true);

		await vi.advanceTimersByTimeAsync(2000);

		expect(visible).toBe(false);
	});

	it('resets the hide timer when feedback is shown again before the timeout finishes', async () => {
		let visible = false;
		const feedback = createSidebarDisabledFeedback({
			setVisible: (value) => {
				visible = value;
			},
			durationMs: 2000
		});

		feedback.show();
		await vi.advanceTimersByTimeAsync(1500);
		feedback.show();
		await vi.advanceTimersByTimeAsync(1500);

		expect(visible).toBe(true);

		await vi.advanceTimersByTimeAsync(500);

		expect(visible).toBe(false);
	});

	it('clears the pending timeout on cleanup', async () => {
		let visible = false;
		const feedback = createSidebarDisabledFeedback({
			setVisible: (value) => {
				visible = value;
			},
			durationMs: 2000
		});

		feedback.show();
		feedback.cleanup();
		await vi.advanceTimersByTimeAsync(2000);

		expect(visible).toBe(true);
	});
});
