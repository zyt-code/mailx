import type { Folder } from '$lib/types.js';

type AccountLike = {
	id: string;
	is_active: boolean;
};

export function resolveFallbackAccountId(accounts: AccountLike[]): string | null {
	return accounts.find((account) => account.is_active)?.id ?? accounts[0]?.id ?? null;
}

export function normalizeMailboxSelection(
	folder: Folder,
	selectedAccountId: string | null,
	accounts: AccountLike[]
): string | null {
	if (folder === 'inbox') {
		return selectedAccountId;
	}

	return selectedAccountId ?? resolveFallbackAccountId(accounts);
}

export function resolveMailboxScope(
	folder: Folder,
	selectedAccountId: string | null,
	accounts: AccountLike[]
): {
	selectedAccountId: string | null;
	effectiveAccountId: string | null;
} {
	const normalizedSelection = normalizeMailboxSelection(folder, selectedAccountId, accounts);

	return {
		selectedAccountId: normalizedSelection,
		effectiveAccountId: folder === 'inbox' && normalizedSelection === null ? null : normalizedSelection
	};
}
