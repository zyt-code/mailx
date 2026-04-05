import { describe, expect, it, vi } from 'vitest';
import { createSidebarComposeState } from './sidebarComposeState.js';

describe('createSidebarComposeState', () => {
	it('opens compose when an account is configured', () => {
		let showCompose = false;
		const showDisabledFeedback = vi.fn();
		const composeState = createSidebarComposeState({
			getIsAccountConfigured: () => true,
			setShowCompose: (value) => {
				showCompose = value;
			},
			showDisabledFeedback
		});

		composeState.openCompose();

		expect(showCompose).toBe(true);
		expect(showDisabledFeedback).not.toHaveBeenCalled();
	});

	it('shows disabled feedback instead of opening compose when no account is configured', () => {
		let showCompose = false;
		const showDisabledFeedback = vi.fn();
		const composeState = createSidebarComposeState({
			getIsAccountConfigured: () => false,
			setShowCompose: (value) => {
				showCompose = value;
			},
			showDisabledFeedback
		});

		composeState.openCompose();

		expect(showCompose).toBe(false);
		expect(showDisabledFeedback).toHaveBeenCalledTimes(1);
	});

	it('closes compose explicitly', () => {
		let showCompose = true;
		const composeState = createSidebarComposeState({
			getIsAccountConfigured: () => true,
			setShowCompose: (value) => {
				showCompose = value;
			}
		});

		composeState.closeCompose();

		expect(showCompose).toBe(false);
	});

	it('closes compose and refreshes after send', async () => {
		let showCompose = true;
		const onRefresh = vi.fn();
		const composeState = createSidebarComposeState({
			getIsAccountConfigured: () => true,
			setShowCompose: (value) => {
				showCompose = value;
			},
			onRefresh
		});

		await composeState.onComposeSent();

		expect(showCompose).toBe(false);
		expect(onRefresh).toHaveBeenCalledTimes(1);
	});
});
