import { derived, get, writable, type Readable } from 'svelte/store';
import * as db from '$lib/db/index.js';
import { eventBus } from '$lib/events/index.js';
import { accounts as accountListStore } from '$lib/stores/accountStore.js';
import type { Folder, Mail } from '$lib/types.js';
import { createMailboxActions } from './mailboxActions.js';
import { resolveFallbackAccountId, resolveMailboxScope } from './mailboxScope.js';

const PAGE_SIZE = 50;

type AccountLike = {
	id: string;
	is_active: boolean;
};

type EventBusLike = {
	on: (event: string, callback: (payload?: unknown) => void | Promise<void>) => void;
	onTauri: (event: string, callback: (payload?: unknown) => void | Promise<void>) => Promise<void> | void;
	emit: (event: string, payload?: unknown) => void;
};

type MailDb = {
	getMails: (
		folder: Folder,
		accountId: string | null,
		limit: number,
		offset: number
	) => Promise<Mail[]>;
	getMailsCount: (folder: Folder, accountId: string | null) => Promise<number>;
	markMailRead: (mailId: string, read: boolean) => Promise<void>;
};

type MailboxStoreDeps = {
	db: MailDb;
	accountsStore: Readable<AccountLike[]>;
	eventBus?: EventBusLike;
};

function ensureReadState(mail: Mail, read: boolean): Mail {
	return {
		...mail,
		is_read: read,
		unread: !read
	};
}

function normalizeMail(mail: Mail): Mail {
	if (typeof mail.is_read === 'boolean') {
		return {
			...mail,
			unread: mail.unread ?? !mail.is_read
		};
	}

	return ensureReadState(mail, !(mail.unread ?? true));
}

export function createMailboxStore({ db, accountsStore, eventBus }: MailboxStoreDeps) {
	const _mails = writable<Mail[]>([]);
	const _activeFolder = writable<Folder>('inbox');
	const _selectedAccountId = writable<string | null>(null);
	const _effectiveAccountId = writable<string | null>(null);
	const _isLoading = writable(false);
	const _isLoadingMore = writable(false);
	const _error = writable<string | null>(null);
	const _hasMore = writable(true);
	const _totalCount = writable(0);

	let currentOffset = 0;
	let initialized = false;

	function updateMailInStore(mailId: string, updater: (mail: Mail) => Mail): Mail | null {
		let updated: Mail | null = null;
		_mails.update((current) => {
			const index = current.findIndex((mail) => mail.id === mailId);
			if (index === -1) return current;
			const next = [...current];
			next[index] = updater(next[index]);
			updated = next[index];
			return next;
		});
		return updated;
	}

	async function loadMails(folder: Folder = get(_activeFolder)): Promise<void> {
		return loadMailsForAccounts(folder, get(accountsStore));
	}

	async function loadMailsForAccounts(folder: Folder, accounts: AccountLike[]): Promise<void> {
		_isLoading.set(true);
		_error.set(null);
		currentOffset = 0;

		try {
			const scope = resolveMailboxScope(folder, get(_selectedAccountId), accounts);
			const [data, count] = await Promise.all([
				db.getMails(folder, scope.effectiveAccountId, PAGE_SIZE, 0),
				db.getMailsCount(folder, scope.effectiveAccountId)
			]);

			_activeFolder.set(folder);
			_selectedAccountId.set(scope.selectedAccountId);
			_effectiveAccountId.set(scope.effectiveAccountId);
			_mails.set(data.map(normalizeMail));
			_totalCount.set(count);
			_hasMore.set(data.length < count);
			currentOffset = data.length;
			eventBus?.emit('mails:loaded', {
				folder,
				accountId: scope.effectiveAccountId
			});
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			console.error('[mailboxStore] Failed to load mails:', message);
			_error.set(message);
		} finally {
			_isLoading.set(false);
		}
	}

	async function loadMoreMails(): Promise<void> {
		if (get(_isLoadingMore) || !get(_hasMore)) {
			return;
		}

		_isLoadingMore.set(true);

		try {
			const folder = get(_activeFolder);
			const accountId = get(_effectiveAccountId);
			const data = await db.getMails(folder, accountId, PAGE_SIZE, currentOffset);

			if (data.length > 0) {
				const normalized = data.map(normalizeMail);
				_mails.update((current) => {
					const existingIds = new Set(current.map((mail) => mail.id));
					const appended = normalized.filter((mail) => !existingIds.has(mail.id));
					return [...current, ...appended];
				});
				currentOffset += data.length;
			}

			_hasMore.set(data.length >= PAGE_SIZE);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			console.error('[mailboxStore] Failed to load more mails:', message);
			_error.set(message);
		} finally {
			_isLoadingMore.set(false);
		}
	}

	async function switchFolder(folder: Folder): Promise<void> {
		await loadMails(folder);
	}

	function setSelectedAccount(accountId: string | null): void {
		_selectedAccountId.set(accountId);
	}

	async function selectAccount(accountId: string | null): Promise<void> {
		setSelectedAccount(accountId);
		await loadMails();
	}

	function shouldReloadForAccountUpdate(updatedAccountId?: string): boolean {
		if (!updatedAccountId) {
			return true;
		}

		return (
			get(_selectedAccountId) === updatedAccountId || get(_effectiveAccountId) === updatedAccountId
		);
	}

	function shouldReloadForAccountDeletion(deletedAccountId: string): boolean {
		return (
			get(_selectedAccountId) === deletedAccountId ||
			get(_effectiveAccountId) === deletedAccountId ||
			(get(_selectedAccountId) === null && get(_effectiveAccountId) === null)
		);
	}

	function init(): void {
		if (initialized) {
			return;
		}

		initialized = true;

		accountsStore.subscribe((accounts) => {
			const selected = get(_selectedAccountId);
			if (!selected) {
				return;
			}

			const selectedStillExists = accounts.some((account) => account.id === selected);
			if (selectedStillExists) {
				return;
			}

			const fallbackAccountId = resolveFallbackAccountId(accounts);
			_selectedAccountId.set(fallbackAccountId);
			void loadMails();
		});

		if (eventBus) {
			void eventBus.onTauri('mails:updated', async () => {
				await loadMails();
			});

			void eventBus.onTauri('account:deleted', async (payload) => {
				const id = (payload as { id?: string } | undefined)?.id;
				if (!id) return;
				const remainingAccounts = get(accountsStore).filter((account) => account.id !== id);
				const needsReload = shouldReloadForAccountDeletion(id);

				_mails.update((current) => current.filter((mail) => mail.account_id !== id));

				if (get(_selectedAccountId) === id) {
					_selectedAccountId.set(resolveFallbackAccountId(remainingAccounts));
				}

				if (!needsReload) {
					return;
				}

				await loadMailsForAccounts(get(_activeFolder), remainingAccounts);
			});

			void eventBus.onTauri('account:created', async () => {
				await loadMails();
			});

			void eventBus.onTauri('account:updated', async (payload) => {
				const id = (payload as { id?: string } | undefined)?.id;
				if (!shouldReloadForAccountUpdate(id)) {
					return;
				}

				await loadMails();
			});

			eventBus.on('folder:change', async (payload) => {
				const folder = (payload as { folder?: Folder } | undefined)?.folder;
				if (!folder) return;
				await switchFolder(folder);
			});
		}

		void loadMails();
	}

	const actions = createMailboxActions({
		db,
		updateMail: updateMailInStore,
		emit: eventBus?.emit ?? (() => {})
	});

	return {
		mails: { subscribe: _mails.subscribe },
		displayedEmails: derived(_mails, ($mails) => $mails),
		activeFolder: { subscribe: _activeFolder.subscribe },
		selectedAccountId: { subscribe: _selectedAccountId.subscribe },
		effectiveAccountId: { subscribe: _effectiveAccountId.subscribe },
		isLoading: { subscribe: _isLoading.subscribe },
		isLoadingMore: { subscribe: _isLoadingMore.subscribe },
		mailError: { subscribe: _error.subscribe },
		hasMore: { subscribe: _hasMore.subscribe },
		totalCount: { subscribe: _totalCount.subscribe },
		loadMails,
		loadMoreMails,
		switchFolder,
		setSelectedAccount,
		selectAccount,
		init,
		markMailReadLocally: actions.markMailReadLocally,
		markMailUnreadLocally: actions.markMailUnreadLocally
	};
}

const mailboxStore = createMailboxStore({
	db,
	accountsStore: accountListStore,
	eventBus
});

export const mails = mailboxStore.mails;
export const displayedEmails = mailboxStore.displayedEmails;
export const activeFolder = mailboxStore.activeFolder;
export const selectedAccountId = mailboxStore.selectedAccountId;
export const effectiveAccountId = mailboxStore.effectiveAccountId;
export const isLoading = mailboxStore.isLoading;
export const isLoadingMore = mailboxStore.isLoadingMore;
export const mailError = mailboxStore.mailError;
export const hasMore = mailboxStore.hasMore;
export const totalCount = mailboxStore.totalCount;
export const loadMails = mailboxStore.loadMails;
export const loadMoreMails = mailboxStore.loadMoreMails;
export const switchFolder = mailboxStore.switchFolder;
export const setSelectedAccount = mailboxStore.setSelectedAccount;
export const initMailStore = mailboxStore.init;
export const markMailReadLocally = mailboxStore.markMailReadLocally;
export const markMailUnreadLocally = mailboxStore.markMailUnreadLocally;
