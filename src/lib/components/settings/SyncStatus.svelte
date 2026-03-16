<script lang="ts">
	import * as accounts from '$lib/accounts/index.js';
	import type { SyncStatus } from '$lib/types';
	import { onMount, onDestroy } from 'svelte';

	let syncStatuses = $state<SyncStatus[]>([]);
	let refreshing = $state(false);

	let unlistenFns: Array<() => void> = [];

	onMount(async () => {
		await loadSyncStatus();

		// Listen for sync events
		unlistenFns.push(await accounts.onSyncCompleted(() => loadSyncStatus()));
		unlistenFns.push(await accounts.onSyncStarted(() => loadSyncStatus()));

		// Refresh sync status every 30 seconds
		const interval = setInterval(() => {
			loadSyncStatus();
		}, 30000);

		onDestroy(() => {
			clearInterval(interval);
		});
	});

	onDestroy(() => {
		for (const unlisten of unlistenFns) {
			unlisten();
		}
	});

	async function loadSyncStatus() {
		try {
			syncStatuses = await accounts.getSyncStatus();
		} catch (error) {
			console.error('Failed to load sync status:', error);
		}
	}

	async function handleRefresh() {
		refreshing = true;
		await loadSyncStatus();
		refreshing = false;
	}

	function formatTimeAgo(timestamp: number | undefined): string {
		if (!timestamp) return 'Never';

		const seconds = Math.floor((Date.now() - timestamp) / 1000);

		if (seconds < 60) return 'Just now';
		if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
		if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
		return `${Math.floor(seconds / 86400)}d ago`;
	}

	function getStatusIcon(status: string) {
		switch (status) {
			case 'syncing':
				return `<svg class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
				</svg>`;
			case 'failed':
				return `<svg class="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>`;
			case 'idle':
			default:
				return `<svg class="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
				</svg>`;
		}
	}
</script>

<div class="mt-6 p-4 bg-white rounded-lg border">
	<div class="flex items-center justify-between mb-3">
		<h3 class="text-sm font-medium text-gray-700">Sync Status</h3>
		<button
			onclick={handleRefresh}
			disabled={refreshing}
			class="text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
		>
			{refreshing ? 'Refreshing...' : 'Refresh'}
		</button>
	</div>

	{#if syncStatuses.length === 0}
		<p class="text-sm text-gray-500">No accounts configured</p>
	{:else}
		<div class="space-y-2">
			{#each syncStatuses as status (status.account_id)}
				<div class="flex items-center justify-between text-sm">
					<div class="flex items-center gap-2">
						{@html getStatusIcon(status.status)}
						<span class="text-gray-700">{status.account_email}</span>
					</div>
					<div class="text-gray-500">
						{#if status.status === 'syncing'}
							Syncing...
						{:else if status.error_message}
							<span class="text-red-600">{status.error_message}</span>
						{:else}
							Last sync: {formatTimeAgo(status.last_sync)}
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
