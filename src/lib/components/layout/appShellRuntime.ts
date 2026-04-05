import { initSyncStore } from '$lib/stores/syncStore.js';
import { initMailStore } from '$lib/stores/mailStore.js';
import { initSyncHandlers, initSyncOrchestrator } from '$lib/events/index.js';
import { initUnreadStore } from '$lib/stores/unreadStore.js';

type AppShellRuntimeDeps = {
	initSyncStore: () => void;
	initMailStore: () => void;
	initSyncOrchestrator: () => void;
	initSyncHandlers: () => void;
	initUnreadStore: () => void;
};

const defaultDeps: AppShellRuntimeDeps = {
	initSyncStore,
	initMailStore,
	initSyncOrchestrator,
	initSyncHandlers,
	initUnreadStore
};

let initialized = false;

export function initAppShellRuntime(deps: AppShellRuntimeDeps = defaultDeps): void {
	if (deps === defaultDeps && initialized) {
		return;
	}

	if (deps === defaultDeps) {
		initialized = true;
	}

	deps.initSyncStore();
	deps.initMailStore();
	deps.initSyncOrchestrator();
	deps.initSyncHandlers();
	deps.initUnreadStore();
}
