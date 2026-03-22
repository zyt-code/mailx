<script lang="ts">
	import { cn } from '$lib/utils.js';
	import { Avatar } from '$lib/components/ui/avatar/index.js';
	import type { Folder, Account } from '$lib/types.js';
	import { hasAccounts, activeAccount, accounts } from '$lib/stores/accountStore.js';
	import { isSyncing, lastSyncTime, syncingAccountId } from '$lib/stores/syncStore.js';
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
		Lock,
		Layers,
		ChevronDown,
		Settings
	} from 'lucide-svelte';
	import { ComposeModal } from '$lib/components/compose/index.js';
	import ComposeButton from './ComposeButton.svelte';
	import AccountSelector from './AccountSelector.svelte';
	import FolderNavigation from './FolderNavigation.svelte';

	interface Props {
		collapsed: boolean;
		isMobile: boolean;
		activeFolder: Folder;
		onToggle: () => void;
		onSelectFolder: (folder: Folder) => void;
		onRefresh?: () => void;
		currentRoute?: string;
		onSelectAccount?: (accountId: string | null) => void;
		onOpenSettings?: () => void;
	}

	let { collapsed, isMobile, activeFolder, onToggle, onSelectFolder, onRefresh, currentRoute = '/', onSelectAccount, onOpenSettings }: Props = $props();

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
	let currentSyncAccountId = $state<string | null>(null); // which account is currently syncing
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
		const unsubSyncAccount = syncingAccountId.subscribe((value) => {
			currentSyncAccountId = value;
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
			unsubSyncAccount();
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
		<ComposeButton
			isAccountConfigured={isAccountConfigured}
			collapsed={collapsed}
			isMobile={isMobile}
			onOpenCompose={openCompose}
		/>

		<!-- Account Selector -->
		<AccountSelector
			accounts={allAccounts}
			selectedAccountId={selectedAccountId}
			hasMultipleAccounts={hasMultipleAccounts}
			formattedLastSync={formattedLastSync}
			accountsCollapsed={accountsCollapsed}
			currentSyncAccountId={currentSyncAccountId}
			isRefreshing={isRefreshing}
			isAccountConfigured={isAccountConfigured}
			currentAccount={currentAccount}
			onSelectAccount={handleAccountClick}
			onToggleAccountsCollapse={toggleAccountsCollapse}
		/>

		<!-- Disabled feedback tooltip -->
		{#if showDisabledTooltip}
			<div class="absolute top-16 left-1/2 -translate-x-1/2 z-50 px-3 py-1.5 bg-[var(--text-primary)] text-[var(--bg-primary)] text-xs rounded-md shadow-lg pointer-events-none animate-scale-in">
				{$_('account.addFirst')}
			</div>
		{/if}

		<!-- Navigation -->
		<FolderNavigation
			navItems={navItems}
			activeFolder={activeFolder}
			isAccountConfigured={isAccountConfigured}
			unreadCount={unreadCount}
			collapsed={collapsed}
			isMobile={isMobile}
			onSelectFolder={handleFolderClick}
		/>
	{:else}
		<!-- Collapsed state - show compose icon button -->
		<ComposeButton
			isAccountConfigured={isAccountConfigured}
			collapsed={collapsed}
			isMobile={isMobile}
			onOpenCompose={openCompose}
		/>

		<!-- Collapsed navigation -->
		<FolderNavigation
			navItems={navItems}
			activeFolder={activeFolder}
			isAccountConfigured={isAccountConfigured}
			unreadCount={unreadCount}
			collapsed={collapsed}
			isMobile={isMobile}
			onSelectFolder={handleFolderClick}
		/>

	{/if}

	<!-- Spacer to push settings to bottom -->
	<div class="flex-1"></div>

	<!-- Settings button - bottom left -->
	<div class="shrink-0 px-2.5 pb-2.5">
		<button
			onclick={() => onOpenSettings?.()}
			class="flex size-8 items-center justify-center rounded-md text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-all"
			aria-label={$_('common.settings')}
		>
			<Settings class="size-[16px]" strokeWidth={1.8} />
		</button>
	</div>

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
