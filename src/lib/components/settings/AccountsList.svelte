<script lang="ts">
	import type { Account, SyncState } from '$lib/types';
	import * as accounts from '$lib/accounts/index.js';
	import AccountForm from './AccountForm.svelte';
	import AccountItem from './AccountItem.svelte';
	import SyncStatus from './SyncStatus.svelte';
	import { onMount, onDestroy } from 'svelte';

	interface Props {
		onNavigate?: (route: string) => void;
	}

	let { onNavigate }: Props = $props();

	let accountList = $state<Account[]>([]);
	let syncStatuses = $state<Record<string, SyncState>>({});
	let showForm = $state(false);
	let editingAccount = $state<Account | undefined>(undefined);
	let loading = $state(false);

	let unlistenFns: Array<() => void> = [];

	onMount(async () => {
		await loadAccounts();
		await loadSyncStatus();

		// Listen for account events
		unlistenFns.push(await accounts.onAccountCreated(() => loadAccounts()));
		unlistenFns.push(await accounts.onAccountUpdated(() => loadAccounts()));
		unlistenFns.push(await accounts.onAccountDeleted(() => loadAccounts()));
		unlistenFns.push(await accounts.onSyncStarted((event) => {
			syncStatuses[event.account_id] = 'syncing';
		}));
		unlistenFns.push(await accounts.onSyncCompleted((status) => {
			syncStatuses[status.account_id] = status.status;
		}));
	});

	onDestroy(() => {
		for (const unlisten of unlistenFns) {
			unlisten();
		}
	});

	async function loadAccounts() {
		loading = true;
		try {
			accountList = await accounts.getAccounts();
		} catch (error) {
			console.error('Failed to load accounts:', error);
		} finally {
			loading = false;
		}
	}

	async function loadSyncStatus() {
		try {
			const statuses = await accounts.getSyncStatus();
			syncStatuses = statuses.reduce((acc, status) => {
				acc[status.account_id] = status.status;
				return acc;
			}, {} as Record<string, SyncState>);
		} catch (error) {
			console.error('Failed to load sync status:', error);
		}
	}

	function handleAddAccount() {
		editingAccount = undefined;
		showForm = true;
	}

	function handleEditAccount(account: Account) {
		editingAccount = account;
		showForm = true;
	}

	function handleSave() {
		showForm = false;
		editingAccount = undefined;
		loadAccounts();
	}

	function handleCancel() {
		showForm = false;
		editingAccount = undefined;
	}

	async function handleSyncAccount(account: Account) {
		try {
			await accounts.syncAccount(account.id);
			await loadSyncStatus();
		} catch (error) {
			console.error('Failed to sync account:', error);
		}
	}

	async function handleDeleteAccount(account: Account) {
		try {
			await accounts.deleteAccount(account.id);
			await loadAccounts();
			delete syncStatuses[account.id];
		} catch (error) {
			console.error('Failed to delete account:', error);
		}
	}

	async function handleSyncAll() {
		try {
			await accounts.syncAllAccounts();
			await loadSyncStatus();
		} catch (error) {
			console.error('Failed to sync all accounts:', error);
		}
	}
</script>

<div class="p-6">
	<div class="flex items-center justify-between mb-6">
		<div>
			<h1 class="text-2xl font-semibold text-gray-900">Accounts</h1>
			<p class="text-sm text-gray-500 mt-1">
				Manage your email accounts and sync settings
			</p>
		</div>
		<div class="flex gap-2">
			{#if accountList.length > 0}
				<button
					onclick={handleSyncAll}
					class="px-4 py-2 text-blue-600 border border-blue-600 rounded hover:bg-blue-50"
				>
					Sync All
				</button>
			{/if}
			<button
				onclick={handleAddAccount}
				class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
			>
				Add Account
			</button>
		</div>
	</div>

	{#if loading}
		<div class="flex justify-center items-center py-12">
			<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
		</div>
	{:else if showForm}
		<AccountForm account={editingAccount} onSave={handleSave} onCancel={handleCancel} />
	{:else}
		<div class="bg-white rounded-lg border">
			{#if accountList.length === 0}
				<div class="p-12 text-center">
					<div class="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
						<svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
							/>
						</svg>
					</div>
					<h3 class="text-lg font-medium text-gray-900 mb-2">No accounts yet</h3>
					<p class="text-gray-500 mb-4">
						Add your first email account to start sending and receiving emails.
					</p>
					<button
						onclick={handleAddAccount}
						class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
					>
						Add Account
					</button>
				</div>
			{:else}
				<div class="divide-y">
					{#each accountList as account (account.id)}
						<AccountItem
							account={account}
							syncStatus={syncStatuses[account.id]}
							onEdit={handleEditAccount}
							onDelete={handleDeleteAccount}
							onSync={handleSyncAccount}
						/>
					{/each}
				</div>
			{/if}
		</div>

		{#if accountList.length > 0}
			<SyncStatus />
		{/if}
	{/if}
</div>
