import { fireEvent, render, screen } from '@testing-library/svelte';
import { writable } from 'svelte/store';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AppShell from './AppShell.svelte';

const {
	switchFolderMock,
	setSelectedAccountMock,
	loadMailsMock,
	syncAccountMock,
	syncAllAccountsMock,
	eventBusEmitMock,
	eventBusEmitAsyncMock
} = vi.hoisted(() => ({
	switchFolderMock: vi.fn(),
	setSelectedAccountMock: vi.fn(),
	loadMailsMock: vi.fn(),
	syncAccountMock: vi.fn().mockResolvedValue(undefined),
	syncAllAccountsMock: vi.fn().mockResolvedValue(undefined),
	eventBusEmitMock: vi.fn(),
	eventBusEmitAsyncMock: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('./Sidebar.svelte', async () => {
	const { default: SidebarMock } = await import('$lib/test/AppShellSidebarMock.svelte');
	return { default: SidebarMock };
});

vi.mock('./MailList.svelte', async () => {
	const { default: Mock } = await import('$lib/test/EmptyComponentMock.svelte');
	return { default: Mock };
});

vi.mock('./Resizer.svelte', async () => {
	const { default: Mock } = await import('$lib/test/EmptyComponentMock.svelte');
	return { default: Mock };
});

vi.mock('./ReadingPane.svelte', async () => {
	const { default: Mock } = await import('$lib/test/EmptyComponentMock.svelte');
	return { default: Mock };
});

vi.mock('$lib/components/get-started/index.js', async () => {
	const { default: Mock } = await import('$lib/test/EmptyComponentMock.svelte');
	return { GetStarted: Mock };
});

vi.mock('$lib/stores/accountStore.js', () => ({
	hasAccounts: writable(true),
	activeAccount: writable({
		id: 'acc-1',
		name: 'Primary',
		email: 'primary@example.com',
		is_active: true
	})
}));

vi.mock('$lib/stores/syncStore.js', () => ({
	initSyncStore: vi.fn(),
	isSyncing: writable(false)
}));

vi.mock('$lib/stores/unreadStore.js', () => ({
	initUnreadStore: vi.fn()
}));

vi.mock('$lib/stores/preferencesStore.js', () => ({
	preferences: writable({
		appearance: {
			accentTone: 'blue',
			mailDensity: 'comfortable',
			showPreviewSnippets: true,
			showAccountColor: true,
			theme: 'system'
		},
		notifications: {
			desktopNotifications: true,
			syncSuccessToasts: true,
			syncFailureToasts: true,
			quietHoursEnabled: false,
			quietHoursStart: '22:00',
			quietHoursEnd: '07:00'
		},
		keyboard: {
			singleKeyShortcuts: true,
			showShortcutHints: true,
			sendWithModEnter: true
		},
		privacy: {
			blockExternalImages: true,
			blockRemoteFonts: true,
			remoteContentAction: 'always_ask',
			readReceiptPolicy: 'never_send',
			htmlRenderingMode: 'sanitized',
			blockFormsInEmails: true,
			showSecurityWarnings: true,
			warnBeforeSuspiciousLinks: true,
			showFullUrlOnHover: true
		},
		language: {
			locale: 'en',
			autoDetect: true
		}
	})
}));

vi.mock('$lib/stores/mailStore.js', () => ({
	initMailStore: vi.fn(),
	switchFolder: switchFolderMock,
	setSelectedAccount: setSelectedAccountMock,
	markMailReadLocally: vi.fn(),
	markMailUnreadLocally: vi.fn(),
	displayedEmails: writable([]),
	loadMails: loadMailsMock
}));

vi.mock('$lib/events/index.js', () => ({
	initSyncHandlers: vi.fn(),
	initSyncOrchestrator: vi.fn(),
	eventBus: {
		on: vi.fn(),
		off: vi.fn(),
		emit: eventBusEmitMock,
		emitAsync: eventBusEmitAsyncMock
	}
}));

vi.mock('$lib/sync/index.js', () => ({
	syncAccount: syncAccountMock,
	syncAllAccounts: syncAllAccountsMock
}));

vi.mock('$app/navigation', () => ({
	goto: vi.fn()
}));

vi.mock('$app/environment', () => ({
	browser: false
}));

vi.mock('$lib/db/index.js', () => ({
	moveToTrash: vi.fn(),
	updateMail: vi.fn(),
	moveToArchive: vi.fn()
}));

describe('AppShell mailbox workflow', () => {
	beforeEach(() => {
		switchFolderMock.mockReset();
		setSelectedAccountMock.mockReset();
		loadMailsMock.mockReset();
		syncAccountMock.mockClear();
		syncAllAccountsMock.mockClear();
		eventBusEmitMock.mockReset();
		eventBusEmitAsyncMock.mockReset();
		eventBusEmitAsyncMock.mockResolvedValue(undefined);
	});

	it('routes account selection through selected-account state and folder switch without forcing an extra reload', async () => {
		render(AppShell);

		await fireEvent.click(screen.getByRole('button', { name: 'mock-select-account' }));

		expect(setSelectedAccountMock).toHaveBeenCalledWith('acc-1');
		expect(switchFolderMock).toHaveBeenCalledWith('inbox');
		expect(loadMailsMock).not.toHaveBeenCalled();
	});

	it('routes the refresh shortcut through sync intent instead of direct sync commands', async () => {
		render(AppShell);
		await Promise.resolve();
		eventBusEmitAsyncMock.mockClear();

		await fireEvent.keyDown(document.body, { key: 'r' });

		expect(eventBusEmitAsyncMock).toHaveBeenCalledWith('sync:trigger');
		expect(syncAllAccountsMock).not.toHaveBeenCalled();
	});
});
