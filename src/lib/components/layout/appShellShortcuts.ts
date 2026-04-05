type KeyboardPreferencesLike = {
	singleKeyShortcuts: boolean;
};

type ShortcutBindingTarget = Pick<Window, 'addEventListener' | 'removeEventListener'>;

type AppShellShortcutsDeps = {
	getKeyboardPreferences: () => KeyboardPreferencesLike;
	isModalOpen: () => boolean;
	stepMailSelection: (delta: number) => void;
	openCompose: () => void;
	triggerSync: () => Promise<unknown>;
	logSyncError?: (error: unknown) => void;
	target?: ShortcutBindingTarget;
};

function isTypingTarget(target: EventTarget | null): boolean {
	if (!(target instanceof Element)) {
		return false;
	}

	const element = target as HTMLElement;
	const tagName = element.tagName;
	return (
		element.isContentEditable ||
		tagName === 'INPUT' ||
		tagName === 'TEXTAREA' ||
		tagName === 'SELECT' ||
		Boolean(element.closest('[contenteditable="true"]'))
	);
}

export function bindAppShellShortcuts({
	getKeyboardPreferences,
	isModalOpen,
	stepMailSelection,
	openCompose,
	triggerSync,
	logSyncError = (error) => console.error('[AppShell] Shortcut sync failed:', error),
	target = window
}: AppShellShortcutsDeps): () => void {
	const handleKeydown = (event: KeyboardEvent) => {
		const keyboardPreferences = getKeyboardPreferences();

		if (!keyboardPreferences.singleKeyShortcuts) return;
		if (event.defaultPrevented) return;
		if (event.metaKey || event.ctrlKey || event.altKey) return;
		if (isTypingTarget(event.target)) return;
		if (isModalOpen()) return;

		switch (event.key.toLowerCase()) {
			case 'j':
				event.preventDefault();
				stepMailSelection(1);
				break;
			case 'k':
				event.preventDefault();
				stepMailSelection(-1);
				break;
			case 'c':
				event.preventDefault();
				openCompose();
				break;
			case 'r':
				event.preventDefault();
				void triggerSync().catch(logSyncError);
				break;
		}
	};

	target.addEventListener('keydown', handleKeydown);
	return () => {
		target.removeEventListener('keydown', handleKeydown);
	};
}
