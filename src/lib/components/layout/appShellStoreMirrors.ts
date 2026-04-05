import type { Mail } from '$lib/types.js';

type ReadableStore<T> = {
	subscribe: (run: (value: T) => void) => () => void;
};

type AppShellStoreMirrorsDeps = {
	displayedEmailsStore: ReadableStore<Mail[]>;
	hasAccountsStore: ReadableStore<boolean>;
	isSyncingStore: ReadableStore<boolean>;
	setStoreMails: (value: Mail[]) => void;
	setIsAccountConfigured: (value: boolean) => void;
	setSyncing: (value: boolean) => void;
};

export function bindAppShellStoreMirrors({
	displayedEmailsStore,
	hasAccountsStore,
	isSyncingStore,
	setStoreMails,
	setIsAccountConfigured,
	setSyncing
}: AppShellStoreMirrorsDeps): () => void {
	const unsubscribers = [
		displayedEmailsStore.subscribe((value) => {
			setStoreMails(value);
		}),
		hasAccountsStore.subscribe((value) => {
			setIsAccountConfigured(value);
		}),
		isSyncingStore.subscribe((value) => {
			setSyncing(value);
		})
	];

	return () => {
		for (const unsubscribe of unsubscribers) {
			unsubscribe();
		}
	};
}
