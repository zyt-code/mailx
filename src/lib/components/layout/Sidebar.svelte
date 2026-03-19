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
		ChevronDown,
		ChevronRight
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

	const navItems: { icon: typeof Inbox; label: string; folder: Folder }[] = [
		{ icon: Inbox, label: 'Inbox', folder: 'inbox' },
		{ icon: Send, label: 'Sent', folder: 'sent' },
		{ icon: FileEdit, label: 'Drafts', folder: 'drafts' },
		{ icon: Archive, label: 'Archive', folder: 'archive' },
		{ icon: Trash2, label: 'Trash', folder: 'trash' }
	];

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
	let accountsCollapsed = $state(false);
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

	// Persist collapse state to localStorage with safe initialization
	$effect(() => {
		// Load initial value from localStorage
		const saved = localStorage.getItem('sidebar-accounts-collapsed');
		if (saved !== null) {
			accountsCollapsed = saved === 'true';
		}
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
					return `Updated ${hours}:${minutes}`;
				})()
			: null
	);

	// Check if multiple accounts exist
	let hasMultipleAccounts = $derived(allAccounts.length > 1);

	// Get account color for avatar
	function getAccountColor(email: string): string {
		const colors = [
			'bg-blue-100 text-blue-700',
			'bg-green-100 text-green-700',
			'bg-purple-100 text-purple-700',
			'bg-orange-100 text-orange-700',
			'bg-pink-100 text-pink-700',
			'bg-teal-100 text-teal-700'
		];
		let hash = 0;
		for (let i = 0; i < email.length; i++) {
			hash = email.charCodeAt(i) + ((hash << 5) - hash);
		}
		return colors[Math.abs(hash) % colors.length];
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

{#if isMobile && !collapsed}
	<button
		type="button"
		class="fixed inset-0 z-30 bg-black/5 backdrop-blur-[2px] transition-opacity duration-100"
		onclick={onToggle}
		aria-label="Close sidebar"
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
			aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
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
				aria-label="Refresh"
			>
				<RefreshCw class={cn('size-[15px]', isRefreshing && 'animate-spin')} strokeWidth={1.8} />
				{#if showShortcutHints && isAccountConfigured}
					<span class="ml-0.5 rounded-[6px] border border-[var(--border-primary)] bg-[var(--bg-primary)] px-1.5 py-0.5 text-[10px] font-semibold leading-none text-[var(--text-tertiary)] shadow-sm">R</span>
				{/if}
			</button>
		{/if}
	</div>

	{#if !collapsed || isMobile}
		<!-- Compose Button -->
		<div class="px-2.5 mt-2">
			<button
				onclick={openCompose}
				disabled={!isAccountConfigured}
				class={cn(
					"flex items-center justify-center gap-2 w-full px-3 py-2 rounded-md transition-all duration-120 font-medium text-sm",
					isAccountConfigured
						? "bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-secondary)] shadow-sm hover:shadow-md active:scale-[0.98]"
						: "bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] cursor-not-allowed"
				)}
				aria-label="New Message"
			>
				{#if isAccountConfigured}
					<SquarePen class="size-[15px]" strokeWidth={1.8} />
					<span>New Message</span>
					{#if showShortcutHints}
						<span class="ml-auto rounded-[6px] border border-white/18 bg-white/12 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white/92">C</span>
					{/if}
				{:else}
					<Lock class="size-[15px]" strokeWidth={1.8} />
					<span>Add Account</span>
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
					"flex items-center gap-2 px-2.5 py-1.5 rounded-md mx-2.5 mt-2 relative z-10 transition-all duration-120",
					selectedAccountId === null
						? "bg-[var(--bg-active)] text-[var(--text-primary)]"
						: "hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]"
				)}
				title="All Inboxes"
				aria-expanded={!accountsCollapsed}
				aria-controls="account-list"
			>
				<div class="relative">
					<div class="flex size-7 items-center justify-center rounded-md bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">
						<Layers class="size-[15px]" strokeWidth={1.8} />
					</div>
					<div class="absolute -top-0.5 -right-0.5 size-3.5 bg-[var(--accent-primary)] rounded-full flex items-center justify-center shadow-sm">
						{#if accountsCollapsed}
							<ChevronRight class="size-[8px] text-white" strokeWidth={2.5} />
						{:else}
							<ChevronDown class="size-[8px] text-white" strokeWidth={2.5} />
						{/if}
					</div>
				</div>
				<div class="flex-1 min-w-0 text-left">
					<p class="text-sm font-medium truncate">All Inboxes</p>
					{#if formattedLastSync && selectedAccountId === null}
						<p class="text-[11px] text-[var(--text-tertiary)] tabular-nums">
							{formattedLastSync}
						</p>
					{/if}
				</div>
			</button>

			<!-- Individual accounts (collapsible) -->
			<div
				id="account-list"
				role="region"
				class={cn(
					"overflow-hidden transition-[max-height] duration-150 ease-out",
					accountsCollapsed ? "max-h-0" : "max-h-[800px]"
				)}
				aria-hidden={accountsCollapsed}
			>
				{#each allAccounts as account}
					<button
						onclick={() => handleAccountClick(account.id)}
						class={cn(
							"flex items-center gap-2 px-2.5 py-1.5 rounded-md mx-1.5 relative z-10 transition-all duration-120",
							selectedAccountId === account.id
								? "bg-[var(--bg-active)] text-[var(--text-primary)]"
								: "hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]"
						)}
						title={account.email}
					>
						<div class={cn(
							"flex size-7 items-center justify-center rounded-full text-xs font-semibold shrink-0",
							getAccountColor(account.email)
						)}>
							{getInitials(account.name)}
						</div>
						<div class="flex-1 min-w-0 text-left">
							<p class="text-sm font-medium truncate">{account.name}</p>
							<p class="text-xs text-[var(--text-tertiary)] truncate">{account.email}</p>
						</div>
						{#if isRefreshing && selectedAccountId === account.id}
							<RefreshCw class="size-3 text-[var(--accent-primary)] animate-spin" strokeWidth={1.8} />
						{/if}
					</button>
				{/each}
			</div>
		{:else}
			<!-- Single account display (original layout) -->
			<div
				class={cn(
					"flex items-center gap-2 px-3 py-2 rounded-md mx-2 mt-1 relative z-10",
					isAccountConfigured ? "hover:bg-zinc-100/50" : "opacity-60"
				)}
			>
				<div class={cn(
					isAccountConfigured ? "" : "grayscale opacity-50"
				)}>
					<Avatar
						src={undefined}
						alt={currentAccount?.name || 'User'}
						fallback={currentAccount?.name}
						size="sm"
					/>
				</div>
				<div class="flex-1 min-w-0">
					<p class={cn(
						"text-sm truncate",
						isAccountConfigured ? "font-medium text-zinc-900" : "font-medium text-zinc-400"
					)}>
						{currentAccount?.name || 'No account'}
					</p>
					<p class="text-xs text-zinc-500 truncate">
						{currentAccount?.email || 'Add an account to get started'}
					</p>
					{#if isAccountConfigured && formattedLastSync}
						<p class="text-[10px] text-zinc-400">
							{formattedLastSync}
						</p>
					{/if}
				</div>
			</div>
		{/if}

		<!-- Disabled feedback tooltip -->
		{#if showDisabledTooltip}
			<div class="absolute top-16 left-1/2 -translate-x-1/2 z-50 px-3 py-1.5 bg-[var(--text-primary)] text-[var(--bg-primary)] text-xs rounded-md shadow-lg pointer-events-none animate-scale-in">
				Please add an account in Settings
			</div>
		{/if}

		<!-- Navigation -->
		<nav class="flex-1 overflow-y-auto px-2.5 mt-2">
			<div class="space-y-0.5 pb-2">
				{#each navItems as item}
					<button
						class={cn(
							'group flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-sm relative z-10 transition-all duration-120',
							isAccountConfigured && item.folder === activeFolder
								? 'bg-[var(--bg-active)] text-[var(--text-primary)] font-medium'
								: '',
							isAccountConfigured
								? 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] cursor-pointer'
								: 'text-[var(--text-quaternary)] cursor-not-allowed'
						)}
						onclick={() => handleFolderClick(item.folder)}
						disabled={!isAccountConfigured}
					>
						<item.icon class="size-[17px] shrink-0" strokeWidth={1.8} />
						<span class="flex-1 text-left truncate">
							{item.label}
						</span>
						{#if item.folder === 'inbox' && unreadCount > 0}
							<span class="text-[11px] font-semibold text-[var(--accent-primary)] bg-[var(--accent-light)] rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
								{unreadCount}
							</span>
						{/if}
					</button>
				{/each}
			</div>
		</nav>

		<!-- Footer -->
		<div class="shrink-0 px-2.5 pb-2.5 pt-1">
			<button
				onclick={navigateToSettings}
				class="settings-icon group flex items-center gap-2 w-full px-2.5 py-1.5 rounded-md text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-all duration-120 relative z-10 cursor-pointer"
				aria-label="Settings"
			>
				<Settings class="size-[17px] transition-transform duration-300 group-hover:rotate-45" strokeWidth={1.8} />
				<span class="text-sm">Settings</span>
				{#if showShortcutHints}
					<span class="ml-auto rounded-[6px] border border-[var(--border-primary)] bg-[var(--bg-primary)] px-1.5 py-0.5 text-[10px] font-semibold leading-none text-[var(--text-tertiary)] shadow-sm">Cmd/Ctrl+,</span>
				{/if}
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
				aria-label="Compose"
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
				aria-label="Settings"
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
