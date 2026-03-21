<script lang="ts">
	import { goto } from '$app/navigation';
	import { invoke } from '@tauri-apps/api/core';
	import { Plus, Loader2, AtSign, Trash2, RefreshCw, Edit, MoreVertical, CheckCircle, XCircle, Clock } from 'lucide-svelte';
	import * as db from '$lib/db/index.js';
	import { syncAccount } from '$lib/sync/index.js';
	import type { SyncStatus } from '$lib/types.js';
	import { _ } from 'svelte-i18n';

	interface Account {
		id: string;
		email: string;
		name: string;
		imap_server: string;
		smtp_server: string;
		is_active: boolean;
	}

	let accounts = $state<Account[]>([]);
	let syncStatuses = $state<Record<string, SyncStatus>>({});
	let isLoading = $state(true);
	let error = $state<string | null>(null);
	let isClearing = $state(false);
	let syncingAccountId = $state<string | null>(null);

	interface StatusInfo {
		text: string;
		iconName: string;
		colorClass: string;
		animate?: boolean;
	}

	async function loadAccounts() {
		isLoading = true;
		error = null;
		try {
			const result = await invoke('get_accounts');
			accounts = result as Account[];
			// Load sync status for each account
			await loadSyncStatus();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load accounts';
		} finally {
			isLoading = false;
		}
	}

	async function loadSyncStatus() {
		try {
			const statuses = await invoke<SyncStatus[]>('get_sync_status');
			syncStatuses = Object.fromEntries(
				statuses.map(s => [s.account_id, s])
			);
		} catch (e) {
			console.error('Failed to load sync status:', e);
		}
	}

	$effect(() => {
		loadAccounts();
		// Poll sync status every 5 seconds
		const interval = setInterval(loadSyncStatus, 5000);
		return () => clearInterval(interval);
	});

	function openAddForm() {
		goto('/settings/accounts/new');
	}

	function editAccount(id: string) {
		goto(`/settings/accounts/${id}`);
	}

	function getInitials(email: string) {
		return email.charAt(0).toUpperCase();
	}

	function getDisplayName(account: Account) {
		return account.name || account.email;
	}

	function getSyncStatus(accountId: string) {
		return syncStatuses[accountId];
	}

	function formatLastSync(timestamp?: number): string {
		if (!timestamp) return $_('common.never');
		const now = Date.now();
		const diff = now - timestamp;
		if (diff < 60000) return $_('account.justNow');
		if (diff < 3600000) return $_('account.minutesAgo', { values: { n: Math.floor(diff / 60000) } });
		if (diff < 86400000) return $_('account.hoursAgo', { values: { n: Math.floor(diff / 3600000) } });
		return $_('account.daysAgo', { values: { n: Math.floor(diff / 86400000) } });
	}

	function getSyncStatusInfo(status: SyncStatus | undefined): StatusInfo {
		if (!status) {
			return { text: $_('common.unknown'), iconName: 'Clock', colorClass: 'text-gray-500' };
		}
		switch (status.status) {
			case 'idle':
				return { text: $_('account.synced', { values: { time: formatLastSync(status.last_sync) } }), iconName: 'CheckCircle', colorClass: 'text-green-500' };
			case 'syncing':
				return { text: $_('account.syncing'), iconName: 'Loader2', colorClass: 'text-blue-500', animate: true };
			case 'failed':
				return { text: status.error_message || $_('account.syncFailed'), iconName: 'XCircle', colorClass: 'text-red-500' };
			case 'cancelled':
				return { text: $_('account.cancelled'), iconName: 'XCircle', colorClass: 'text-gray-500' };
			default:
				return { text: $_('common.unknown'), iconName: 'Clock', colorClass: 'text-gray-500' };
		}
	}

	async function handleClearDatabase() {
		if (!confirm($_('account.clearDbConfirm'))) {
			return;
		}
		isClearing = true;
		try {
			await db.clearDatabase();
			alert($_('account.clearDbSuccess'));
		} catch (e) {
			alert('Failed to clear database: ' + (e instanceof Error ? e.message : String(e)));
		} finally {
			isClearing = false;
		}
	}

	async function handleSyncAccount(accountId: string, event: Event) {
		event.stopPropagation();
		syncingAccountId = accountId;
		try {
			await syncAccount(accountId);
		} catch (e) {
			console.error('Sync failed:', e);
			alert('Sync failed: ' + (e instanceof Error ? e.message : String(e)));
		} finally {
			syncingAccountId = null;
		}
	}

	function handleDeleteAccount(accountId: string, event: Event) {
		event.stopPropagation();
		if (confirm($_('account.deleteConfirm'))) {
			goto(`/settings/accounts/${accountId}/delete`);
		}
	}
</script>

<!-- Header Section -->
<header class="page-header">
	<div class="header-content">
		<div class="header-icon">
			<AtSign class="size-6" />
		</div>
		<div>
			<h2 class="page-title">{$_('settings.accounts')}</h2>
			<p class="page-subtitle">
				{accounts.length === 0
					? $_('account.addDescription')
					: `${accounts.length} ${accounts.length === 1 ? $_('account.single') : $_('account.multiple')}`}
			</p>
		</div>
	</div>
	{#if accounts.length > 0}
		<button
			onclick={openAddForm}
			class="add-account-button"
		>
			<Plus class="size-4" />
			<span>{$_('account.add')}</span>
		</button>
	{/if}
</header>

<!-- Developer Tools Section -->
<div class="devtools-section">
	<h3 class="devtools-title">{$_('account.devTools')}</h3>
	<p class="devtools-description">{$_('account.devToolsDescription')}</p>
	<button
		onclick={handleClearDatabase}
		disabled={isClearing}
		class="clear-db-button"
	>
		{#if isClearing}
			<Loader2 class="size-4 animate-spin" />
		{:else}
			<Trash2 class="size-4" />
		{/if}
		<span>{isClearing ? $_('account.clearingDatabase') : $_('account.clearDatabase')}</span>
	</button>
	<p class="devtools-hint">{$_('account.clearDbHint')}</p>
</div>

<!-- Error State -->
{#if error}
	<div class="error-banner">
		<div class="error-icon">⚠️</div>
		<div>
			<p class="error-title">{$_('account.errorLoading')}</p>
			<p class="error-message">{error}</p>
		</div>
	</div>
{/if}

<!-- Loading State -->
{#if isLoading}
	<div class="loading-state">
		<Loader2 class="size-8 animate-spin text-violet-500" />
		<p class="loading-text">{$_('account.loadingAccounts')}</p>
	</div>
{:else if accounts.length === 0}
	<!-- Empty State -->
	<div class="empty-state">
		<div class="empty-illustration">
			<div class="illustration-circle">
				<AtSign class="size-12 text-violet-500" />
			</div>
		</div>
		<h3 class="empty-title">{$_('account.noAccountsYet')}</h3>
		<p class="empty-description">
			{$_('account.noAccountsDescription')}
		</p>
		<button
			onclick={openAddForm}
			class="empty-cta"
		>
			<Plus class="size-5" />
			<span>{$_('account.addFirstAccount')}</span>
		</button>

		<p class="empty-hint-text">{$_('account.credentialsSecure')}</p>
	</div>
{:else}
	<!-- Accounts List -->
	<div class="accounts-grid">
		{#each accounts as account (account.id)}
			{@const syncStatus = getSyncStatus(account.id)}
			{@const statusInfo = getSyncStatusInfo(syncStatus)}
			<div
				onclick={() => editAccount(account.id)}
				class="account-card"
				role="button"
				tabindex="0"
				onkeydown={(e) => e.key === 'Enter' && editAccount(account.id)}
			>
				<div class="account-avatar">
					<span class="avatar-text">{getInitials(account.email)}</span>
				</div>
				<div class="account-info">
					<h4 class="account-name">{getDisplayName(account)}</h4>
					<p class="account-email">{account.email}</p>
				</div>
				<div class="account-status" class:syncing={syncStatus?.status === 'syncing'}>
					<div class="status-icon" class:animate={statusInfo.animate}>
						{#if statusInfo.iconName === 'CheckCircle'}
							<CheckCircle class="size-3.5" strokeWidth={2} />
						{:else if statusInfo.iconName === 'Loader2'}
							<Loader2 class="size-3.5 animate-spin" strokeWidth={2} />
						{:else if statusInfo.iconName === 'XCircle'}
							<XCircle class="size-3.5" strokeWidth={2} />
						{:else}
							<Clock class="size-3.5" strokeWidth={2} />
						{/if}
					</div>
					<span class="status-text">{statusInfo.text}</span>
				</div>
				<div class="account-actions">
					<button
						onclick={(e) => handleSyncAccount(account.id, e)}
						disabled={syncingAccountId === account.id}
						class="action-button sync-button"
						title={$_('account.syncAccount')}
					>
						{#if syncingAccountId === account.id}
							<Loader2 class="size-4 animate-spin" />
						{:else}
							<RefreshCw class="size-4" />
						{/if}
					</button>
					<button
						onclick={() => editAccount(account.id)}
						class="action-button edit-button"
						title={$_('account.editAccount')}
					>
						<Edit class="size-4" />
					</button>
					<button
						onclick={(e) => handleDeleteAccount(account.id, e)}
						class="action-button delete-button"
						title={$_('account.deleteAccount')}
					>
						<Trash2 class="size-4" />
					</button>
				</div>
			</div>
		{/each}
	</div>
{/if}

<style>
	.page-header {
		margin-bottom: 2.5rem;
	}

	.header-content {
		display: flex;
		align-items: flex-start;
		gap: 1rem;
	}

	.header-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 48px;
		height: 48px;
		background: linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%);
		border-radius: 14px;
		color: white;
		box-shadow: 0 4px 12px -2px rgba(139, 92, 246, 0.3);
	}

	.page-title {
		font-size: 2rem;
		font-weight: 680;
		letter-spacing: -0.03em;
		color: #1d1d1f;
		margin-bottom: 0.25rem;
	}

	.page-subtitle {
		font-size: 0.9375rem;
		color: #6b6b6b;
		font-weight: 400;
	}

	.add-account-button {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-top: 1.5rem;
		padding: 0.75rem 1.5rem;
		font-size: 0.875rem;
		font-weight: 540;
		color: white;
		background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
		border: none;
		border-radius: 12px;
		cursor: pointer;
		box-shadow: 0 4px 14px -2px rgba(139, 92, 246, 0.35);
		transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
	}

	.add-account-button:hover {
		transform: translateY(-1px);
		box-shadow: 0 6px 20px -2px rgba(139, 92, 246, 0.45);
	}

	.add-account-button:active {
		transform: translateY(0);
	}

	/* Error Banner */
	.error-banner {
		display: flex;
		align-items: flex-start;
		gap: 1rem;
		padding: 1rem 1.25rem;
		background: linear-gradient(135deg, #fef2f2 0%, #fef0f0 100%);
		border: 1px solid #fecaca;
		border-radius: 14px;
		margin-bottom: 1.5rem;
		animation: slideIn 0.3s ease-out;
	}

	.error-icon {
		font-size: 1.25rem;
		flex-shrink: 0;
	}

	.error-title {
		font-size: 0.875rem;
		font-weight: 560;
		color: #991b1b;
		margin-bottom: 0.125rem;
	}

	.error-message {
		font-size: 0.8125rem;
		color: #b91c1c;
	}

	/* Loading State */
	.loading-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 4rem 2rem;
		animation: fadeIn 0.4s ease-out;
	}

	.loading-text {
		margin-top: 1rem;
		font-size: 0.9375rem;
		color: #6b6b6b;
		font-weight: 500;
	}

	/* Empty State */
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		padding: 4rem 2rem;
		animation: fadeIn 0.5s ease-out;
	}

	.empty-illustration {
		margin-bottom: 2rem;
	}

	.illustration-circle {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 96px;
		height: 96px;
		background: linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%);
		border-radius: 28px;
		box-shadow:
			0 4px 24px -4px rgba(139, 92, 246, 0.15),
			inset 0 1px 0 0 rgba(255, 255, 255, 0.5);
		animation: float 3s ease-in-out infinite;
	}

	@keyframes float {
		0%, 100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(-8px);
		}
	}

	.empty-title {
		font-size: 1.5rem;
		font-weight: 620;
		letter-spacing: -0.02em;
		color: #1d1d1f;
		margin-bottom: 0.75rem;
	}

	.empty-description {
		font-size: 0.9375rem;
		color: #6b6b6b;
		max-width: 400px;
		line-height: 1.6;
		margin-bottom: 2rem;
	}

	.empty-cta {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		padding: 0.875rem 2rem;
		font-size: 0.9375rem;
		font-weight: 540;
		color: white;
		background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
		border: none;
		border-radius: 14px;
		cursor: pointer;
		box-shadow: 0 6px 24px -4px rgba(139, 92, 246, 0.4);
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
	}

	.empty-cta:hover {
		transform: translateY(-2px);
		box-shadow: 0 8px 32px -4px rgba(139, 92, 246, 0.5);
	}

	.empty-cta:active {
		transform: translateY(0);
	}

	.empty-hint-text {
		margin-top: 1.5rem;
		font-size: 11px;
		color: #a1a1aa;
	}

	/* Accounts Grid */
	.accounts-grid {
		display: grid;
		gap: 0.75rem;
		animation: fadeIn 0.4s ease-out;
	}

	.account-card {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1.25rem 1.5rem;
		background: rgba(255, 255, 255, 0.7);
		backdrop-filter: blur(10px);
		border: 1px solid rgba(0, 0, 0, 0.06);
		border-radius: 16px;
		cursor: pointer;
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
		text-align: left;
		position: relative;
		overflow: hidden;
	}

	.account-card::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 100%;
		background: linear-gradient(135deg, rgba(139, 92, 246, 0.05) 0%, rgba(124, 58, 237, 0.03) 100%);
		opacity: 0;
		transition: opacity 0.3s ease;
	}

	.account-card:hover {
		border-color: rgba(139, 92, 246, 0.2);
		transform: translateX(4px);
		box-shadow: 0 8px 32px -8px rgba(0, 0, 0, 0.08);
	}

	.account-card:hover::before {
		opacity: 1;
	}

	.account-avatar {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 48px;
		height: 48px;
		background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
		border-radius: 14px;
		color: white;
		font-size: 1.125rem;
		font-weight: 600;
		box-shadow: 0 4px 12px -2px rgba(139, 92, 246, 0.3);
		flex-shrink: 0;
		position: relative;
		z-index: 1;
	}

	.account-info {
		flex: 1;
		min-width: 0;
		position: relative;
		z-index: 1;
	}

	.account-name {
		font-size: 0.9375rem;
		font-weight: 560;
		letter-spacing: -0.01em;
		color: #1d1d1f;
		margin-bottom: 0.125rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.account-email {
		font-size: 0.8125rem;
		color: #6b6b6b;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.account-status {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.375rem 0.75rem;
		background: rgba(34, 197, 94, 0.1);
		border-radius: 8px;
		position: relative;
		z-index: 1;
		transition: background 0.2s ease;
	}

	.account-status.syncing {
		background: rgba(59, 130, 246, 0.1);
	}

	.status-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.account-status:not(.syncing) .status-icon {
		color: #16a34a;
	}

	.account-status.syncing .status-icon {
		color: #3b82f6;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	.status-text {
		font-size: 0.75rem;
		font-weight: 540;
		color: #16a34a;
	}

	.account-status.syncing .status-text {
		color: #3b82f6;
	}

	.account-actions {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		position: relative;
		z-index: 1;
	}

	.action-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		padding: 0;
		font-size: 0.8125rem;
		color: #6b6b6b;
		background: transparent;
		border: none;
		border-radius: 8px;
		cursor: pointer;
		transition: all 0.2s ease;
		opacity: 0;
		transform: translateX(-8px);
	}

	.account-card:hover .action-button {
		opacity: 1;
		transform: translateX(0);
	}

	.action-button:hover {
		background: rgba(0, 0, 0, 0.06);
		transform: scale(1.05);
	}

	.action-button.sync-button:hover {
		color: #8b5cf6;
		background: rgba(139, 92, 246, 0.1);
	}

	.action-button.edit-button:hover {
		color: #0ea5e9;
		background: rgba(14, 165, 233, 0.1);
	}

	.action-button.delete-button:hover {
		color: #ef4444;
		background: rgba(239, 68, 68, 0.1);
	}

	.action-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* Animations */
	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(12px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@keyframes slideIn {
		from {
			opacity: 0;
			transform: translateX(-8px);
		}
		to {
			opacity: 1;
			transform: translateX(0);
		}
	}

	/* Devtools Section */
	.devtools-section {
		padding: 1.5rem;
		margin-bottom: 1.5rem;
		background: rgba(255, 255, 255, 0.7);
		backdrop-filter: blur(10px);
		border: 1px solid rgba(0, 0, 0, 0.06);
		border-radius: 16px;
		animation: fadeIn 0.4s ease-out;
	}

	.devtools-title {
		font-size: 1rem;
		font-weight: 560;
		letter-spacing: -0.01em;
		color: #1d1d1f;
		margin-bottom: 0.25rem;
	}

	.devtools-description {
		font-size: 0.8125rem;
		color: #6b6b6b;
		margin-bottom: 1rem;
	}

	.clear-db-button {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.625rem 1rem;
		font-size: 0.8125rem;
		font-weight: 500;
		color: #dc2626;
		background: rgba(220, 38, 38, 0.08);
		border: 1px solid rgba(220, 38, 38, 0.2);
		border-radius: 10px;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.clear-db-button:hover:not(:disabled) {
		background: rgba(220, 38, 38, 0.12);
		border-color: rgba(220, 38, 38, 0.3);
	}

	.clear-db-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.devtools-hint {
		margin-top: 0.75rem;
		font-size: 11px;
		color: #a1a1aa;
		line-height: 1.4;
	}
</style>
