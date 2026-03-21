<script lang="ts">
	import { cn } from '$lib/utils.js';
	import { Avatar } from '$lib/components/ui/avatar/index.js';
	import type { Folder, Account } from '$lib/types.js';
	import { hasAccounts, activeAccount, accounts } from '$lib/stores/accountStore.js';
	import { isSyncing, lastSyncTime } from '$lib/stores/syncStore.js';
	import { inboxUnread } from '$lib/stores/unreadStore.js';
	import { selectedAccountId as storeSelectedAccountId } from '$lib/stores/mailStore.js';
	import { syncAllAccounts, syncAccount } from '$lib/sync/index.js';
	import { eventBus } from '$lib/events/index.js';
	import { preferences } from '$lib/stores/preferencesStore.js';
	import { _ } from 'svelte-i18n';
	import { i18nStore } from '$lib/stores/i18nStore.svelte.js';
	import {
		Inbox,
		Send,
		FileEdit,
		Trash2,
		PanelLeftClose,
		PanelLeftOpen,
		SquarePen,
		Archive,
		RefreshCw,
		Settings,
		Lock,
		Layers,
		ChevronDown
	} from 'lucide-svelte';
	import { ComposeModal } from '$lib/components/compose/index.js';

	interface Props {
		collapsed: boolean;
		isMobile: boolean;
		activeFolder: Folder;
		onToggle: () => void;
		onSelectFolder: (folder: Folder) => void;
		onRefresh?: () => void;
		currentRoute?: string;
		onOpenSettings?: () => void;
		onSelectAccount?: (accountId: string | null) => void;
	}

	let { collapsed, isMobile, activeFolder, onToggle, onSelectFolder, onRefresh, currentRoute = '/', onOpenSettings, onSelectAccount }: Props = $props();

	// Reactive navigation items with i18n
	const navItems = $derived([
		{ icon: Inbox, label: $_('nav.inbox'), folder: 'inbox' as const },
		{ icon: Send, label: $_('nav.sent'), folder: 'sent' as const },
		{ icon: FileEdit, label: $_('nav.drafts'), folder: 'drafts' as const },
		{ icon: Archive, label: $_('nav.archive'), folder: 'archive' as const },
		{ icon: Trash2, label: $_('nav.trash'), folder: 'trash' as const }
	] as const);

	const SIDEBAR_COLLAPSED_WIDTH = 56;

	let showCompose = $state(false);
	let isRefreshing = $state(false);
	let showDisabledTooltip = $state(false);
	let tooltipTimer = $state<number | null>(null);

	// Account state from store - subscribe to stores
	let currentAccount = $state<Account | null>(null);
	let isAccountConfigured = $state(false);
	let lastSync = $state<number | null>(null);
	let unreadCount = $state(0);
	let allAccounts = $state<Account[]>([]);
	let selectedAccountId = $state<string | null>(null); // null = All Inboxes
	let accountsCollapsed = $state(
		typeof window !== 'undefined' && localStorage.getItem('sidebar-accounts-collapsed') === 'true'
	);
	let showShortcutHints = $state(true);

	function toggleAccountsCollapse() {
		accountsCollapsed = !accountsCollapsed;
	}

	// Subscribe to store changes
	$effect(() => {
		const unsubActive = activeAccount.subscribe((value) => {
			currentAccount = value;
		});
		const unsubHas = hasAccounts.subscribe((value) => {
			isAccountConfigured = value;
		});
		const unsubSync = isSyncing.subscribe((value) => {
			isRefreshing = value;
		});
		const unsubLastSync = lastSyncTime.subscribe((value) => {
			lastSync = value;
		});
		const unsubUnread = inboxUnread.subscribe((value) => {
			unreadCount = value;
		});
		const unsubAccounts = accounts.subscribe((value) => {
			allAccounts = value;
		});
		const unsubSelectedAccount = storeSelectedAccountId.subscribe((value) => {
			selectedAccountId = value;
		});
		const unsubPreferences = preferences.subscribe((value) => {
			showShortcutHints = value.keyboard.showShortcutHints;
		});

		return () => {
			unsubActive();
			unsubHas();
			unsubSync();
			unsubLastSync();
			unsubUnread();
			unsubAccounts();
			unsubSelectedAccount();
			unsubPreferences();
		};
	});

	// Save collapse state to localStorage when it changes
	$effect(() => {
		try {
			localStorage.setItem('sidebar-accounts-collapsed', String(accountsCollapsed));
		} catch (e) {
			// Silently fail if localStorage is not available (e.g., in incognito mode)
			console.warn('Failed to save sidebar collapse state:', e);
		}
	});

	// Format last sync time as HH:MM (must be declared after lastSync)
	let formattedLastSync = $derived(
		lastSync
			? (() => {
					const date = new Date(lastSync);
					const hours = date.getHours().toString().padStart(2, '0');
					const minutes = date.getMinutes().toString().padStart(2, '0');
					return $_('account.synced', { values: { time: `${hours}:${minutes}` } });
				})()
			: null
	);

	// Check if multiple accounts exist
	let hasMultipleAccounts = $derived(allAccounts.length > 1);

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

	// Handle account selection
	function handleAccountClick(accountId: string | null) {
		selectedAccountId = accountId;
		onSelectAccount?.(accountId);
	}

	async function handleFolderClick(folder: Folder) {
		console.log('[Sidebar] Folder clicked:', folder, 'configured:', isAccountConfigured);
		if (!isAccountConfigured) {
			showDisabledFeedback();
			return;
		}
		onSelectFolder(folder);
		if (isMobile) onToggle();
	}

	function openCompose() {
		if (!isAccountConfigured) {
			showDisabledFeedback();
			return;
		}
		showCompose = true;
	}

	function closeCompose() {
		showCompose = false;
	}

	async function onComposeSent() {
		showCompose = false;
		if (onRefresh) {
			onRefresh();
		}
	}

	async function handleRefresh() {
		if (!isAccountConfigured || isRefreshing) return;
		try {
			await syncAllAccounts();
		} catch (e) {
			console.error('Refresh failed:', e);
			// Toast is already shown via sync:failed event in syncHandlers
		}
	}

	function navigateToSettings() {
		onOpenSettings?.();
		if (isMobile) onToggle();
	}

	function showDisabledFeedback() {
		// Show brief feedback
		showDisabledTooltip = true;
		if (tooltipTimer) clearTimeout(tooltipTimer);
		tooltipTimer = window.setTimeout(() => {
			showDisabledTooltip = false;
		}, 2000);
	}

	$effect(() => {
		const handleComposeOpen = () => {
			openCompose();
		};

		eventBus.on('compose:open', handleComposeOpen);
		return () => {
			eventBus.off('compose:open', handleComposeOpen);
		};
	});
</script>

{#if !i18nStore.isLoading}
	{#if isMobile && !collapsed}
	<button
		type="button"
		class="fixed inset-0 z-30 bg-black/5 backdrop-blur-[2px] transition-opacity duration-100"
		onclick={onToggle}
		aria-label={$_('common.close')}
	></button>
{/if}

<aside
	class={cn(
		'flex h-full flex-col bg-[var(--bg-secondary)] shrink-0 select-none [-webkit-user-select:none] [user-select:none]',
		isMobile && 'fixed inset-y-0 left-0 z-40 shadow-lg',
		isMobile && collapsed && '-translate-x-full',
		!isMobile && 'border-r border-[var(--border-primary)]'
	)}
	style:width={collapsed && !isMobile ? `${SIDEBAR_COLLAPSED_WIDTH}px` : 'var(--spacing-sidebar)'}
>
	<!-- Top controls -->
	<div class="flex h-9 items-center justify-between px-2.5 shrink-0">
		<button
			onclick={onToggle}
			class="flex size-7 items-center justify-center rounded-md text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-all"
			aria-label={collapsed ? $_('sidebar.expand') : $_('sidebar.collapse')}
		>
			{#if collapsed && !isMobile}
				<PanelLeftOpen class="size-[16px]" strokeWidth={1.8} />
			{:else}
				<PanelLeftClose class="size-[16px]" strokeWidth={1.8} />
			{/if}
		</button>
		{#if !collapsed && onRefresh}
			<button
				onclick={handleRefresh}
				disabled={!isAccountConfigured}
				class="flex size-auto min-w-7 items-center justify-center gap-1 rounded-md px-2 text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
				aria-label={$_('mail.refresh')}
			>
				<RefreshCw class={cn('size-[15px]', isRefreshing && 'animate-spin')} strokeWidth={1.8} />
			</button>
		{/if}
	</div>

	{#if !collapsed || isMobile}
		<!-- Compose Button -->
		<div class="px-2.5 mt-2.5">
			<button
				onclick={openCompose}
				disabled={!isAccountConfigured}
				class={cn(
					"flex items-center justify-center gap-2 w-full px-3 py-2 rounded-lg transition-all duration-150 font-semibold text-[13px]",
					isAccountConfigured
						? "bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-secondary)] shadow-sm hover:shadow-md active:scale-[0.97]"
						: "bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] cursor-not-allowed"
				)}
				aria-label={$_('nav.newMessage')}
			>
				{#if isAccountConfigured}
					<SquarePen class="size-[15px]" strokeWidth={1.8} />
					<span>{$_('nav.newMessage')}</span>
				{:else}
					<Lock class="size-[15px]" strokeWidth={1.8} />
					<span>{$_('account.add')}</span>
				{/if}
			</button>
		</div>

		<!-- Account Rail (Multi-Account Support) -->
		{#if hasMultipleAccounts && allAccounts.length > 0}
			<!-- "All Inboxes" option -->
			<button
				onclick={() => {
					if (selectedAccountId !== null) {
						handleAccountClick(null);
					}
					toggleAccountsCollapse();
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
						{#each allAccounts as account}
							{@const color = getAccountColor(account.email)}
							<button
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
								{#if isRefreshing && (selectedAccountId === account.id || selectedAccountId === null)}
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

		<!-- Disabled feedback tooltip -->
		{#if showDisabledTooltip}
			<div class="absolute top-16 left-1/2 -translate-x-1/2 z-50 px-3 py-1.5 bg-[var(--text-primary)] text-[var(--bg-primary)] text-xs rounded-md shadow-lg pointer-events-none animate-scale-in">
				{$_('account.addFirst')}
			</div>
		{/if}

		<!-- Navigation -->
		<nav class="flex-1 overflow-y-auto px-2 mt-1">
			<div class="space-y-0.5 pb-2">
				{#each navItems as item}
					<button
						class={cn(
							'group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] relative transition-all duration-150',
							isAccountConfigured && item.folder === activeFolder
								? 'bg-[var(--bg-active)] text-[var(--text-primary)] font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.04)]'
								: '',
							isAccountConfigured
								? 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] cursor-pointer active:scale-[0.98]'
								: 'text-[var(--text-quaternary)] cursor-not-allowed'
						)}
						onclick={() => handleFolderClick(item.folder)}
						disabled={!isAccountConfigured}
					>
						{#if isAccountConfigured && item.folder === activeFolder}
							<div class="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full bg-[var(--accent-primary)] transition-all duration-200"></div>
						{/if}
						<item.icon class={cn(
							"size-[17px] shrink-0 transition-colors duration-150",
							isAccountConfigured && item.folder === activeFolder && "text-[var(--accent-primary)]"
						)} strokeWidth={1.8} />
						<span class="flex-1 text-left truncate">
							{item.label}
						</span>
						{#if item.folder === 'inbox' && unreadCount > 0}
							<span class="text-[11px] font-semibold text-[var(--accent-primary)] bg-[var(--accent-light)] rounded-full px-1.5 py-0.5 min-w-[20px] text-center tabular-nums">
								{unreadCount}
							</span>
						{/if}
					</button>
				{/each}
			</div>
		</nav>

		<!-- Footer -->
		<div class="shrink-0 px-2 pb-2.5 pt-1">
			<div class="mx-2 h-px bg-[var(--border-primary)] opacity-40 mb-2"></div>
			<button
				onclick={navigateToSettings}
				class="settings-icon group flex items-center gap-2.5 w-full px-2.5 py-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-all duration-150 cursor-pointer active:scale-[0.98]"
				aria-label={$_('settings.title')}
				title={showShortcutHints ? 'Cmd/Ctrl+,' : $_('settings.title')}
			>
				<Settings class="size-[17px] transition-transform duration-300 group-hover:rotate-45" strokeWidth={1.8} />
				<span class="text-[13px]">{$_('settings.title')}</span>
			</button>
		</div>
	{:else}
		<!-- Collapsed state - show compose icon button -->
		<div class="flex flex-col items-center gap-1 px-2 mt-2">
			<button
				onclick={openCompose}
				disabled={!isAccountConfigured}
				class={cn(
					"flex size-8 items-center justify-center rounded-md relative z-10 transition-all duration-120",
					isAccountConfigured
						? "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] cursor-pointer"
						: "text-[var(--text-quaternary)] cursor-not-allowed"
				)}
				aria-label={$_('mail.compose')}
			>
				{#if isAccountConfigured}
					<SquarePen class="size-[16px]" strokeWidth={1.8} />
				{:else}
					<Lock class="size-[16px]" strokeWidth={1.8} />
				{/if}
			</button>
		</div>

		<!-- Collapsed navigation -->
		<nav class="flex-1 overflow-y-auto px-2 mt-1">
			<div class="flex flex-col items-center gap-0.5 pb-2">
				{#each navItems as item}
					<button
						class={cn(
							'group flex size-8 items-center justify-center rounded-md relative z-10 transition-all duration-120',
							isAccountConfigured && item.folder === activeFolder
								? 'bg-[var(--bg-active)] text-[var(--text-primary)]'
								: '',
							isAccountConfigured
								? 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] cursor-pointer'
								: 'text-[var(--text-quaternary)] cursor-not-allowed'
						)}
						onclick={() => handleFolderClick(item.folder)}
						disabled={!isAccountConfigured}
						aria-label={item.label}
					>
						<div class="relative">
							<item.icon class="size-[17px]" strokeWidth={1.8} />
							{#if item.folder === 'inbox' && unreadCount > 0}
								<span class="absolute -top-0.5 -right-0.5 size-2 bg-[var(--accent-primary)] rounded-full border-2 border-[var(--bg-secondary)]"></span>
							{/if}
						</div>
					</button>
				{/each}
			</div>
		</nav>

		<!-- Collapsed footer -->
		<div class="shrink-0 px-2 pb-2">
			<div class="flex flex-col items-center gap-1">
			<button
				onclick={navigateToSettings}
				class="settings-icon group flex size-8 items-center justify-center rounded-md text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-all duration-120 relative z-10 cursor-pointer"
				aria-label={$_('settings.title')}
				title={showShortcutHints ? 'Cmd/Ctrl+,' : $_('settings.title')}
			>
				<Settings class="size-[17px] transition-transform duration-300 group-hover:rotate-45" strokeWidth={1.8} />
			</button>
			</div>
		</div>
	{/if}

	<!-- Compose Modal -->
	<ComposeModal
		isOpen={showCompose}
		onClose={closeCompose}
		onSent={onComposeSent}
	/>
</aside>
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
</style>
