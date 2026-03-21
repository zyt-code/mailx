import { browser } from '$app/environment';
import { writable, derived, type Readable } from 'svelte/store';
import type { Account } from '$lib/types.js';
import * as accountApi from '$lib/accounts/index.js';

/**
 * Account store - manages account state globally
 * Compatible with Svelte 5
 */

// State using writable stores
const _accounts = writable<Account[]>([]);
const _isLoading = writable(false);
const _error = writable<string | null>(null);

// Computed values using derived stores
export const hasAccounts: Readable<boolean> = derived(_accounts, ($accounts) => $accounts.length > 0);
export const accounts: Readable<Account[]> = { subscribe: _accounts.subscribe };
export const isLoading: Readable<boolean> = { subscribe: _isLoading.subscribe };
export const error: Readable<string | null> = { subscribe: _error.subscribe };

// Get the active account
export const activeAccount: Readable<Account | null> = derived(_accounts, ($accounts) =>
	$accounts.find((a) => a.is_active) || $accounts[0] || null
);

// Actions
export async function loadAccounts() {
	if (!browser) return;

	_isLoading.set(true);
	_error.set(null);

	try {
		const accountList = await accountApi.getAccounts();
		_accounts.set(accountList);
	} catch (e) {
		_error.set(e instanceof Error ? e.message : 'Failed to load accounts');
		console.error('Failed to load accounts:', e);
	} finally {
		_isLoading.set(false);
	}
}

export async function refreshAccounts() {
	await loadAccounts();
}

// Initialize store on module load (browser only)
if (browser) {
	loadAccounts();

	// Listen for account events
	accountApi.onAccountCreated(() => loadAccounts());
	accountApi.onAccountUpdated(() => loadAccounts());
	accountApi.onAccountDeleted(() => loadAccounts());
}
