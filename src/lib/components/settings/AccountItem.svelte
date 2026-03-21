<script lang="ts">
	import type { Account, SyncState } from '$lib/types';
	import * as accounts from '$lib/accounts/index.js';
	import { onMount } from 'svelte';
	import { _ } from 'svelte-i18n';

	interface Props {
		account: Account;
		syncStatus?: SyncState;
		onEdit?: (account: Account) => void;
	 onDelete?: (account: Account) => void;
		onSync?: (account: Account) => void;
	}

	let { account, syncStatus = 'idle', onEdit, onDelete, onSync }: Props = $props();

	let syncing = $state(false);
	let lastSync = $state<number | undefined>(undefined);
	let showDeleteConfirm = $state(false);

	onMount(() => {
		// Initialize last sync time from sync status
		if (syncStatus !== 'idle') {
			lastSync = Date.now();
		}
	});

	async function handleSync() {
		if (syncing) return;
		syncing = true;

		try {
			await accounts.syncAccount(account.id);
			lastSync = Date.now();
			onSync?.(account);
		} catch (error) {
			console.error('Sync failed:', error);
		} finally {
			syncing = false;
		}
	}

	function handleDelete() {
		showDeleteConfirm = true;
	}

	async function confirmDelete() {
		try {
			await accounts.deleteAccount(account.id);
			showDeleteConfirm = false;
			onDelete?.(account);
		} catch (error) {
			console.error('Delete failed:', error);
		}
	}

	function formatTimeAgo(timestamp: number | undefined): string {
		if (!timestamp) return $_('common.never');

		const diff = Date.now() - timestamp;

		if (diff < 60000) return $_('account.justNow');
		if (diff < 3600000) return $_('account.minutesAgo', { values: { n: Math.floor(diff / 60000) } });
		if (diff < 86400000) return $_('account.hoursAgo', { values: { n: Math.floor(diff / 3600000) } });
		return $_('account.daysAgo', { values: { n: Math.floor(diff / 86400000) } });
	}

	function getStatusColor(): string {
		if (syncing) return 'text-blue-500';
		if (syncStatus === 'failed') return 'text-red-500';
		return 'text-gray-500';
	}

	function getStatusText(): string {
		if (syncing) return $_('account.syncing');
		if (syncStatus === 'failed') return $_('account.failed');
		return formatTimeAgo(lastSync);
	}
</script>

<div class="p-4 border-b hover:bg-gray-50 transition-colors">
	<div class="flex items-center justify-between">
		<div class="flex-1 min-w-0">
			<div class="flex items-center gap-3">
				<div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
					<span class="text-blue-600 font-semibold text-sm">
						{account.name.charAt(0).toUpperCase()}
					</span>
				</div>
				<div class="min-w-0 flex-1">
					<div class="flex items-center gap-2">
						<h3 class="font-medium text-gray-900 truncate">{account.name}</h3>
						<span class="text-sm text-gray-500">{account.email}</span>
					</div>
					<div class="flex items-center gap-2 mt-1">
						<span class="text-xs text-gray-500">
							{account.imap_server}:{account.imap_port}
						</span>
						<span class="text-gray-300">•</span>
						<span class="text-xs text-gray-500">
							{account.smtp_server}:{account.smtp_port}
						</span>
					</div>
				</div>
			</div>
		</div>

		<div class="flex items-center gap-3">
			<div class="text-sm {getStatusColor()}">
				{getStatusText()}
			</div>

			<button
				onclick={handleSync}
				disabled={syncing}
				class="p-2 hover:bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed"
				title={$_('account.syncAccount')}
			>
				<svg
					class="w-4 h-4 {syncing ? 'animate-spin' : ''}"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
					/>
				</svg>
			</button>

			<button
				onclick={() => onEdit?.(account)}
				class="p-2 hover:bg-gray-200 rounded"
				title={$_('account.editAccount')}
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
					/>
				</svg>
			</button>

			<button
				onclick={handleDelete}
				class="p-2 hover:bg-red-100 text-red-600 rounded"
				title={$_('account.deleteAccount')}
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
					/>
				</svg>
			</button>
		</div>
	</div>

	{#if showDeleteConfirm}
		<div class="mt-4 p-3 bg-red-50 border border-red-200 rounded">
			<p class="text-sm text-red-800 mb-2">
				{$_('account.deleteConfirm')}
			</p>
			<div class="flex gap-2">
				<button
					onclick={confirmDelete}
					class="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
				>
					{$_('common.delete')}
				</button>
				<button
					onclick={() => (showDeleteConfirm = false)}
					class="px-3 py-1 bg-white border border-gray-300 text-sm rounded hover:bg-gray-50"
				>
					{$_('common.cancel')}
				</button>
			</div>
		</div>
	{/if}
</div>
