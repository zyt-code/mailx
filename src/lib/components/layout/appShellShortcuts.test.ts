import { describe, expect, it, vi } from 'vitest';
import { bindAppShellShortcuts } from './appShellShortcuts.js';

function dispatchKeydown(target: EventTarget, key: string, options: KeyboardEventInit = {}) {
	target.dispatchEvent(
		new KeyboardEvent('keydown', {
			bubbles: true,
			key,
			...options
		})
	);
}

describe('bindAppShellShortcuts', () => {
	it('routes j, c, and r through the injected AppShell intents', async () => {
		const stepMailSelection = vi.fn();
		const openCompose = vi.fn();
		const triggerSync = vi.fn().mockResolvedValue(undefined);

		const cleanup = bindAppShellShortcuts({
			getKeyboardPreferences: () => ({ singleKeyShortcuts: true }),
			isModalOpen: () => false,
			stepMailSelection,
			openCompose,
			triggerSync
		});

		dispatchKeydown(document.body, 'j');
		dispatchKeydown(document.body, 'c');
		dispatchKeydown(document.body, 'r');
		await Promise.resolve();

		expect(stepMailSelection).toHaveBeenCalledWith(1);
		expect(openCompose).toHaveBeenCalledTimes(1);
		expect(triggerSync).toHaveBeenCalledTimes(1);

		cleanup();
	});

	it('ignores shortcuts while typing in editable targets', async () => {
		const stepMailSelection = vi.fn();
		const openCompose = vi.fn();
		const triggerSync = vi.fn().mockResolvedValue(undefined);
		const input = document.createElement('input');
		document.body.appendChild(input);

		const cleanup = bindAppShellShortcuts({
			getKeyboardPreferences: () => ({ singleKeyShortcuts: true }),
			isModalOpen: () => false,
			stepMailSelection,
			openCompose,
			triggerSync
		});

		dispatchKeydown(input, 'j');
		dispatchKeydown(input, 'c');
		dispatchKeydown(input, 'r');
		await Promise.resolve();

		expect(stepMailSelection).not.toHaveBeenCalled();
		expect(openCompose).not.toHaveBeenCalled();
		expect(triggerSync).not.toHaveBeenCalled();

		cleanup();
		input.remove();
	});

	it('logs sync shortcut failures instead of throwing', async () => {
		const logSyncError = vi.fn();
		const triggerSync = vi.fn().mockRejectedValue(new Error('sync failed'));

		const cleanup = bindAppShellShortcuts({
			getKeyboardPreferences: () => ({ singleKeyShortcuts: true }),
			isModalOpen: () => false,
			stepMailSelection: vi.fn(),
			openCompose: vi.fn(),
			triggerSync,
			logSyncError
		});

		dispatchKeydown(document.body, 'r');
		await Promise.resolve();
		await Promise.resolve();

		expect(logSyncError).toHaveBeenCalled();

		cleanup();
	});
});
