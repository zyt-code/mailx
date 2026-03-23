<script lang="ts">
	import { cn } from '$lib/utils.js';
	import { Avatar } from '$lib/components/ui/avatar/index.js';
	import type { Account } from '$lib/types.js';
	import { Layers, ChevronDown, RefreshCw } from 'lucide-svelte';
	import { _ } from 'svelte-i18n';

	interface Props {
		accounts: Account[];
		selectedAccountId: string | null;
		hasMultipleAccounts: boolean;
		formattedLastSync: string | null;
		accountsCollapsed: boolean;
		currentSyncAccountId: string | null;
		isRefreshing: boolean;
		isAccountConfigured: boolean;
		currentAccount: Account | null;
		onSelectAccount: (accountId: string | null) => void;
		onToggleAccountsCollapse: () => void;
	}

	let {
		accounts,
		selectedAccountId,
		hasMultipleAccounts,
		formattedLastSync,
		accountsCollapsed,
		currentSyncAccountId,
		isRefreshing,
		isAccountConfigured,
		currentAccount,
		onSelectAccount,
		onToggleAccountsCollapse,
	}: Props = $props();

	// Get account color for avatar — vivid gradient pairs for clear differentiation
	function getAccountColor(email: string): { bg: string; text: string } {
		const palettes = [
			{ bg: '#3B82F6', text: '#FFFFFF' }, // Blue
			{ bg: '#8B5CF6', text: '#FFFFFF' }, // Violet
			{ bg: '#EC4899', text: '#FFFFFF' }, // Pink
			{ bg: '#F97316', text: '#FFFFFF' }, // Orange
			{ bg: '#10B981', text: '#FFFFFF' }, // Emerald
			{ bg: '#06B6D4', text: '#FFFFFF' }, // Cyan
			{ bg: '#EF4444', text: '#FFFFFF' }, // Red
			{ bg: '#6366F1', text: '#FFFFFF' }, // Indigo
		];
		let hash = 0;
		for (let i = 0; i < email.length; i++) {
			hash = email.charCodeAt(i) + ((hash << 5) - hash);
		}
		return palettes[Math.abs(hash) % palettes.length];
	}

	// Get initials for avatar
	function getInitials(name: string): string {
		return name
			.split(' ')
			.map((n) => n.charAt(0).toUpperCase())
			.slice(0, 2)
			.join('');
	}

	function handleAccountClick(accountId: string | null) {
		selectedAccountId = accountId;
		onSelectAccount(accountId);
	}
</script>

{#if hasMultipleAccounts && accounts.length > 0}
	<!-- "All Inboxes" option -->
	<button
		type="button"
		onclick={() => {
			if (selectedAccountId !== null) {
				handleAccountClick(null);
			}
			onToggleAccountsCollapse();
		}}
		class={cn(
			"group flex items-center gap-2.5 px-2.5 py-2 rounded-lg mx-2 mt-3 relative transition-all duration-150",
			selectedAccountId === null
				? "bg-[var(--bg-active)] text-[var(--text-primary)] shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
				: "hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]"
		)}
		title={$_('nav.allInboxes')}
		aria-expanded={!accountsCollapsed}
		aria-controls="account-list"
	>
		{#if selectedAccountId === null}
			<div class="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full bg-[var(--accent-primary)] transition-all duration-200"></div>
		{/if}
		<div class="flex size-7 items-center justify-center rounded-md bg-[var(--bg-tertiary)] text-[var(--text-secondary)] transition-colors duration-150 group-hover:bg-[var(--bg-hover)]">
			<Layers class="size-[15px]" strokeWidth={1.8} />
		</div>
		<div class="flex-1 min-w-0 text-left">
			<p class="text-[13px] font-semibold truncate">{$_('nav.allInboxes')}</p>
			{#if formattedLastSync && selectedAccountId === null}
				<p class="text-[11px] text-[var(--text-tertiary)] tabular-nums">
					{formattedLastSync}
				</p>
			{/if}
		</div>
		<div class={cn(
			"transition-transform duration-200 text-[var(--text-quaternary)]",
			accountsCollapsed ? "-rotate-90" : "rotate-0"
		)}>
			<ChevronDown class="size-3.5" strokeWidth={1.8} />
		</div>
	</button>

	<!-- Individual accounts (collapsible with CSS grid) -->
	<div
		id="account-list"
		role="region"
		class="account-collapse-wrapper mx-2"
		class:collapsed={accountsCollapsed}
		aria-hidden={accountsCollapsed}
	>
		<div class="overflow-hidden">
			<div class="pt-1 space-y-0.5">
				{#each accounts as account}
					{@const color = getAccountColor(account.email)}
					<button
						type="button"
						onclick={() => handleAccountClick(account.id)}
						class={cn(
							"group flex items-center gap-2.5 px-2.5 py-2 rounded-lg w-full relative transition-all duration-150",
							selectedAccountId === account.id
								? "bg-[var(--bg-active)] text-[var(--text-primary)] shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
								: "hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]"
						)}
						title={account.email}
					>
						{#if selectedAccountId === account.id}
							<div class="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full bg-[var(--accent-primary)] transition-all duration-200"></div>
						{/if}
						<div
							class="flex size-7 items-center justify-center rounded-md text-[11px] font-bold shrink-0 transition-transform duration-150 group-hover:scale-105 group-active:scale-95"
							style:background-color={color.bg}
							style:color={color.text}
						>
							{getInitials(account.name)}
						</div>
						<div class="flex-1 min-w-0 text-left">
							<p class="text-[13px] font-medium truncate">{account.name}</p>
							<p class="text-[11px] text-[var(--text-tertiary)] truncate">{account.email}</p>
						</div>
						{#if isRefreshing && (currentSyncAccountId === account.id || currentSyncAccountId === null)}
							<RefreshCw class="size-3 text-[var(--accent-primary)] animate-spin shrink-0" strokeWidth={1.8} />
						{/if}
					</button>
				{/each}
			</div>
		</div>
	</div>

	<!-- Separator -->
	<div class="mx-4 mt-2 mb-1 h-px bg-[var(--border-primary)] opacity-60"></div>
{:else}
	<!-- Single account display (original layout) -->
	<div
		class={cn(
			"flex items-center gap-2.5 px-2.5 py-2 rounded-lg mx-2 mt-3 relative",
			isAccountConfigured ? "hover:bg-[var(--bg-hover)]" : "opacity-60"
		)}
	>
		<div class={cn(
			isAccountConfigured ? "" : "grayscale opacity-50"
		)}>
			<Avatar
				src={undefined}
				alt={currentAccount?.name || $_('account.noAccounts')}
				fallback={currentAccount?.name}
				size="sm"
			/>
		</div>
		<div class="flex-1 min-w-0">
			<p class={cn(
				"text-sm truncate",
				isAccountConfigured ? "font-medium text-[var(--text-primary)]" : "font-medium text-[var(--text-quaternary)]"
			)}>
				{currentAccount?.name || $_('account.noAccounts')}
			</p>
			<p class="text-xs text-[var(--text-tertiary)] truncate">
				{currentAccount?.email || $_('account.addFirst')}
			</p>
			{#if isAccountConfigured && formattedLastSync}
				<p class="text-[10px] text-[var(--text-quaternary)]">
					{formattedLastSync}
				</p>
			{/if}
		</div>
	</div>
{/if}

<style>
	/* CSS grid-based collapse animation — height-aware, smooth */
	.account-collapse-wrapper {
		display: grid;
		grid-template-rows: 1fr;
		transition: grid-template-rows 200ms cubic-bezier(0.4, 0, 0.2, 1);
	}

	.account-collapse-wrapper.collapsed {
		grid-template-rows: 0fr;
	}

	.account-collapse-wrapper > div {
		min-height: 0;
	}

	button {
		will-change: transform;
	}
</style>
