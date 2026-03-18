<script lang="ts">
	import { goto } from '$app/navigation';
	import { invoke } from '@tauri-apps/api/core';
	import { Plus, Loader2, AtSign, Trash2 } from 'lucide-svelte';
	import * as db from '$lib/db/index.js';

	interface Account {
		id: string;
		email: string;
		name: string;
		imap_server: string;
		smtp_server: string;
		is_active: boolean;
	}

	let accounts = $state<Account[]>([]);
	let isLoading = $state(true);
	let error = $state<string | null>(null);
	let isClearing = $state(false);

	async function loadAccounts() {
		isLoading = true;
		error = null;
		try {
			const result = await invoke('get_accounts');
			accounts = result as Account[];
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load accounts';
		} finally {
			isLoading = false;
		}
	}

	$effect(() => {
		loadAccounts();
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

	async function handleClearDatabase() {
		if (!confirm('Are you sure you want to clear all emails from the database? This will delete all synced emails and cannot be undone.')) {
			return;
		}
		isClearing = true;
		try {
			await db.clearDatabase();
			alert('Database cleared successfully. Please re-sync your accounts to fetch clean emails.');
		} catch (e) {
			alert('Failed to clear database: ' + (e instanceof Error ? e.message : String(e)));
		} finally {
			isClearing = false;
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
			<h2 class="page-title">Accounts</h2>
			<p class="page-subtitle">
				{accounts.length === 0
					? 'Add your email account to get started'
					: `${accounts.length} ${accounts.length === 1 ? 'account' : 'accounts'} connected`}
			</p>
		</div>
	</div>
	{#if accounts.length > 0}
		<button
			onclick={openAddForm}
			class="add-account-button"
		>
			<Plus class="size-4" />
			<span>Add Account</span>
		</button>
	{/if}
</header>

<!-- Developer Tools Section -->
<div class="devtools-section">
	<h3 class="devtools-title">Developer Tools</h3>
	<p class="devtools-description">Temporary tools for testing and development</p>
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
		<span>{isClearing ? 'Clearing...' : 'Clear Database'}</span>
	</button>
	<p class="devtools-hint">Clears all emails from the database. Re-sync accounts to fetch clean data.</p>
</div>

<!-- Error State -->
{#if error}
	<div class="error-banner">
		<div class="error-icon">⚠️</div>
		<div>
			<p class="error-title">Error loading accounts</p>
			<p class="error-message">{error}</p>
		</div>
	</div>
{/if}

<!-- Loading State -->
{#if isLoading}
	<div class="loading-state">
		<Loader2 class="size-8 animate-spin text-violet-500" />
		<p class="loading-text">Loading your accounts...</p>
	</div>
{:else if accounts.length === 0}
	<!-- Empty State -->
	<div class="empty-state">
		<div class="empty-illustration">
			<div class="illustration-circle">
				<AtSign class="size-12 text-violet-500" />
			</div>
		</div>
		<h3 class="empty-title">No accounts yet</h3>
		<p class="empty-description">
			Connect your first email account to start sending and receiving messages.
			We support IMAP providers like Gmail, Outlook, and more.
		</p>
		<button
			onclick={openAddForm}
			class="empty-cta"
		>
			<Plus class="size-5" />
			<span>Add Your First Account</span>
		</button>

		<p class="empty-hint-text">Your credentials are stored securely on this device</p>
	</div>
{:else}
	<!-- Accounts List -->
	<div class="accounts-grid">
		{#each accounts as account (account.id)}
			<button
				onclick={() => editAccount(account.id)}
				class="account-card"
			>
				<div class="account-avatar">
					<span class="avatar-text">{getInitials(account.email)}</span>
				</div>
				<div class="account-info">
					<h4 class="account-name">{getDisplayName(account)}</h4>
					<p class="account-email">{account.email}</p>
				</div>
				<div class="account-status">
					<div class="status-dot"></div>
					<span class="status-text">Connected</span>
				</div>
				<div class="account-action">
					<span>Manage</span>
					<svg class="arrow-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
						<path d="M6 3L11 8L6 13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
					</svg>
				</div>
			</button>
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
	}

	.status-dot {
		width: 6px;
		height: 6px;
		background: #22c55e;
		border-radius: 50%;
		animation: pulse 2s ease-in-out infinite;
	}

	@keyframes pulse {
		0%, 100% {
			opacity: 1;
		}
		50% {
			opacity: 0.5;
		}
	}

	.status-text {
		font-size: 0.75rem;
		font-weight: 540;
		color: #16a34a;
	}

	.account-action {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.5rem 0.75rem;
		font-size: 0.8125rem;
		color: #6b6b6b;
		background: transparent;
		border: none;
		border-radius: 8px;
		position: relative;
		z-index: 1;
		opacity: 0;
		transform: translateX(-8px);
		transition: all 0.25s ease;
	}

	.account-card:hover .account-action {
		opacity: 1;
		transform: translateX(0);
	}

	.arrow-icon {
		color: #6b6b6b;
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
