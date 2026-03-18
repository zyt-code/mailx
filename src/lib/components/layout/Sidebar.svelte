<script lang="ts">
	import { cn } from '$lib/utils.js';
	import { Avatar } from '$lib/components/ui/avatar/index.js';
	import type { Folder, Account } from '$lib/types.js';
	import { hasAccounts, activeAccount, accounts } from '$lib/stores/accountStore.js';
	import { isSyncing, lastSyncTime } from '$lib/stores/syncStore.js';
	import { inboxUnread } from '$lib/stores/unreadStore.js';
	import { selectedAccountId as storeSelectedAccountId } from '$lib/stores/mailStore.js';
	import { syncAllAccounts, syncAccount } from '$lib/sync/index.js';
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
		Layers
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

		return () => {
			unsubActive();
			unsubHas();
			unsubSync();
			unsubLastSync();
			unsubUnread();
			unsubAccounts();
			unsubSelectedAccount();
		};
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
</script>

{#if isMobile && !collapsed}
	<div
		class="fixed inset-0 z-30 bg-black/5 backdrop-blur-[2px] transition-opacity duration-200"
		onclick={onToggle}
		aria-label="Close sidebar"
	></div>
{/if}

<aside
	class={cn(
		'flex h-full flex-col bg-white shrink-0',
		isMobile && 'fixed inset-y-0 left-0 z-40 shadow-lg',
		isMobile && collapsed && '-translate-x-full',
		!isMobile && 'border-r border-zinc-100'
	)}
	style:width={collapsed && !isMobile ? '56px' : '240px'}
>
	<!-- Top controls -->
	<div class="flex h-10 items-center justify-between px-3 shrink-0">
		<button
			onclick={onToggle}
			class="flex size-7 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-100/60 hover:text-zinc-600"
			aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
		>
			{#if collapsed && !isMobile}
				<PanelLeftOpen class="size-[18px]" strokeWidth={1.5} />
			{:else}
				<PanelLeftClose class="size-[18px]" strokeWidth={1.5} />
			{/if}
		</button>
		{#if !collapsed && onRefresh}
			<button
				onclick={handleRefresh}
				disabled={!isAccountConfigured}
				class="flex size-7 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-100/60 hover:text-zinc-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-150"
				aria-label="Refresh"
			>
				<RefreshCw class={cn('size-[15px]', isRefreshing && 'animate-spin')} strokeWidth={1.5} />
			</button>
		{/if}
	</div>

	{#if !collapsed || isMobile}
		<!-- Global Compose Button (Notion Style) -->
		<div class="px-2 mt-1">
			<button
				onclick={openCompose}
				disabled={!isAccountConfigured}
				class={cn(
					"flex items-center justify-center gap-2 w-full px-3 py-2.5 rounded-lg transition-all duration-200",
					isAccountConfigured
						? "bg-zinc-900 text-white hover:bg-zinc-800 shadow-sm"
						: "bg-zinc-200 text-zinc-400 cursor-not-allowed"
				)}
				aria-label="New Message"
			>
				{#if isAccountConfigured}
					<SquarePen class="size-[16px]" strokeWidth={1.5} />
					<span class="text-sm font-medium">New Message</span>
				{:else}
					<Lock class="size-[16px]" strokeWidth={1.5} />
					<span class="text-sm font-medium">Add Account</span>
				{/if}
			</button>
		</div>

		<!-- Account Rail (Multi-Account Support) -->
		{#if hasMultipleAccounts && allAccounts.length > 0}
			<!-- "All Inboxes" option -->
			<button
				onclick={() => handleAccountClick(null)}
				class={cn(
					"flex items-center gap-2 px-3 py-2 rounded-md mx-2 mt-1 relative z-10 transition-colors",
					selectedAccountId === null
						? "bg-zinc-100 text-zinc-900"
						: "hover:bg-zinc-50 text-zinc-600"
				)}
				title="All Inboxes"
			>
				<div class="flex size-7 items-center justify-center rounded-md bg-zinc-200 text-zinc-600">
					<Layers class="size-[15px]" strokeWidth={1.5} />
				</div>
				<div class="flex-1 min-w-0 text-left">
					<p class="text-sm font-medium truncate">All Inboxes</p>
					{#if formattedLastSync && selectedAccountId === null}
						<p class="text-[10px] text-zinc-400">
							{formattedLastSync}
						</p>
					{/if}
				</div>
			</button>

			<!-- Individual accounts -->
			{#each allAccounts as account}
				<button
					onclick={() => handleAccountClick(account.id)}
					class={cn(
						"flex items-center gap-2 px-3 py-2 rounded-md mx-1 relative z-10 transition-colors",
						selectedAccountId === account.id
							? "bg-zinc-100 text-zinc-900"
							: "hover:bg-zinc-50 text-zinc-600"
					)}
					title={account.email}
				>
					<div class={cn(
						"flex size-7 items-center justify-center rounded-full text-xs font-medium shrink-0",
						getAccountColor(account.email)
					)}>
						{getInitials(account.name)}
					</div>
					<div class="flex-1 min-w-0 text-left">
						<p class="text-sm font-medium truncate">{account.name}</p>
						<p class="text-xs text-zinc-500 truncate">{account.email}</p>
					</div>
					{#if isRefreshing && selectedAccountId === account.id}
						<RefreshCw class="size-3 text-zinc-400 animate-spin" strokeWidth={1.5} />
					{/if}
				</button>
			{/each}
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
			<div class="absolute top-20 left-1/2 -translate-x-1/2 z-50 px-3 py-2 bg-zinc-900 text-white text-xs rounded-lg shadow-lg pointer-events-none animate-in fade-in slide-in-from-top-2 duration-200">
				Please add an account in Settings
			</div>
		{/if}

		<!-- Navigation -->
		<nav class="flex-1 overflow-y-auto px-2 mt-1">
			<div class="space-y-0.5 pb-2">
				{#each navItems as item}
					<button
						class={cn(
							'group flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] relative z-10',
							isAccountConfigured && item.folder === activeFolder
								? 'bg-zinc-100 text-zinc-900 font-semibold'
								: '',
							isAccountConfigured
								? 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-700 cursor-pointer'
								: 'text-zinc-300 cursor-not-allowed'
						)}
						onclick={() => handleFolderClick(item.folder)}
						disabled={!isAccountConfigured}
					>
						<item.icon class="size-[18px] shrink-0" strokeWidth={1.5} />
						<span class="flex-1 text-left truncate">
							{item.label}
						</span>
						{#if item.folder === 'inbox' && unreadCount > 0}
							<span class="text-[11px] font-medium text-blue-600 bg-blue-50 rounded-full px-1.5">
								{unreadCount}
							</span>
						{/if}
					</button>
				{/each}
			</div>
		</nav>

		<!-- Footer -->
		<div class="shrink-0 px-2 pb-2">
			<button
				onclick={navigateToSettings}
				class="settings-icon group flex items-center justify-center w-9 h-9 rounded-md text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-all duration-200 relative z-10 cursor-pointer"
				aria-label="Settings"
			>
				<Settings class="size-[18px] transition-transform duration-500 group-hover:rotate-45" strokeWidth={1.5} />
			</button>
		</div>
	{:else}
		<!-- Collapsed state - show compose icon button -->
		<div class="flex flex-col items-center gap-1 px-2 mt-2">
			<button
				onclick={openCompose}
				disabled={!isAccountConfigured}
				class={cn(
					"flex size-8 items-center justify-center rounded-lg relative z-10",
					isAccountConfigured
						? "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 cursor-pointer"
						: "text-zinc-300 cursor-not-allowed"
				)}
				aria-label="Compose"
			>
				{#if isAccountConfigured}
					<SquarePen class="size-[16px]" strokeWidth={1.5} />
				{:else}
					<Lock class="size-[16px]" strokeWidth={1.5} />
				{/if}
			</button>
		</div>

		<!-- Collapsed navigation -->
		<nav class="flex-1 overflow-y-auto px-2 mt-2">
			<div class="flex flex-col items-center gap-1 pb-2">
				{#each navItems as item}
					<button
						class={cn(
							'group flex size-8 items-center justify-center rounded-md relative z-10',
							isAccountConfigured && item.folder === activeFolder
								? 'bg-zinc-100 text-zinc-900'
								: '',
							isAccountConfigured
								? 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-700 cursor-pointer'
								: 'text-zinc-300 cursor-not-allowed'
						)}
						onclick={() => handleFolderClick(item.folder)}
						disabled={!isAccountConfigured}
						aria-label={item.label}
					>
						<div class="relative">
							<item.icon class="size-[18px]" strokeWidth={1.5} />
							{#if item.folder === 'inbox' && unreadCount > 0}
								<span class="absolute -top-0.5 -right-0.5 size-2.5 bg-blue-500 rounded-full border-2 border-white"></span>
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
					class="settings-icon group flex size-8 items-center justify-center rounded-md text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-all duration-200 relative z-10 cursor-pointer"
					aria-label="Settings"
				>
					<Settings class="size-[18px] transition-transform duration-500 group-hover:rotate-45" strokeWidth={1.5} />
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
