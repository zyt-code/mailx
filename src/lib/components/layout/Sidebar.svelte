<script lang="ts">
	import { cn } from '$lib/utils.js';
	import { Avatar } from '$lib/components/ui/avatar/index.js';
	import type { Folder, Account } from '$lib/types.js';
	import { hasAccounts, activeAccount, accounts } from '$lib/stores/accountStore.js';
	import { isSyncing, lastSyncTime, syncingAccountId } from '$lib/stores/syncStore.js';
	import { folderUnreadCounts } from '$lib/stores/unreadStore.js';
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

	const navItems = [
		{ icon: Inbox, labelKey: 'nav.inbox', folder: 'inbox' as const },
		{ icon: Send, labelKey: 'nav.sent', folder: 'sent' as const },
		{ icon: FileEdit, labelKey: 'nav.drafts', folder: 'drafts' as const },
		{ icon: Archive, labelKey: 'nav.archive', folder: 'archive' as const },
		{ icon: Trash2, labelKey: 'nav.trash', folder: 'trash' as const }
	] as const;

	const SIDEBAR_COLLAPSED_WIDTH = 56;

	let showCompose = $state(false);
	let isRefreshing = $state(false);
	let isRefreshPending = $state(false);
	let showDisabledTooltip = $state(false);
	let tooltipTimer = $state<number | null>(null);

	// Account state from store - subscribe to stores
	let currentAccount = $state<Account | null>(null);
	let isAccountConfigured = $state(false);
	let lastSync = $state<number | null>(null);
	let unreadCounts = $state<Record<Folder, number>>({
		inbox: 0,
		sent: 0,
		drafts: 0,
		archive: 0,
		trash: 0
	});
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
		const unsubUnread = folderUnreadCounts.subscribe((value) => {
			unreadCounts = value;
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
		if (isRefreshing || isRefreshPending) return;
		if (!isAccountConfigured) {
			showDisabledFeedback();
			return;
		}

		isRefreshPending = true;
		try {
			if (selectedAccountId) {
				await syncAccount(selectedAccountId);
			} else if (currentAccount?.id) {
				await syncAccount(currentAccount.id);
			} else {
				await syncAllAccounts();
			}
			await onRefresh?.();
		} catch (e) {
			console.error('Refresh failed:', e);
			// Toast is already shown via sync:failed event in syncHandlers
		} finally {
			isRefreshPending = false;
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
		class="fixed inset-0 z-30 bg-black/5 backdrop-blur-[2px] transition-opacity duration-100 dark:bg-black/35"
		onclick={onToggle}
		aria-label={$_('common.close')}
	></button>
{/if}

<aside
	class={cn(
		'sidebar-shell flex h-full flex-col bg-[var(--bg-secondary)] text-[var(--text-primary)] shrink-0 select-none [-webkit-user-select:none] [user-select:none] dark:bg-[var(--bg-secondary)] dark:text-[var(--text-primary)]',
		isMobile && 'fixed inset-y-0 left-0 z-40 shadow-lg',
		isMobile && collapsed && '-translate-x-full'
	)}
	data-testid="app-sidebar"
	data-collapsed={collapsed && !isMobile}
	style:width={collapsed && !isMobile ? `${SIDEBAR_COLLAPSED_WIDTH}px` : 'var(--spacing-sidebar)'}
>
	<!-- Top controls -->
	<div class="sidebar-topbar flex h-10 items-center justify-between px-2.5 shrink-0">
		<button
			type="button"
			onclick={onToggle}
			class="sidebar-chrome-button flex size-8 items-center justify-center rounded-xl text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-all"
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
				type="button"
				onclick={() => void handleRefresh()}
				disabled={isRefreshing || isRefreshPending}
				class={cn(
					'sidebar-chrome-button sidebar-sync-button flex size-auto min-w-8 items-center justify-center gap-1 rounded-xl px-2.5 text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-all',
					!isAccountConfigured && 'opacity-70'
				)}
				aria-label={$_('account.refresh')}
				aria-busy={isRefreshing || isRefreshPending}
			>
				<RefreshCw class={cn('size-[15px]', (isRefreshing || isRefreshPending) && 'animate-spin')} strokeWidth={1.8} />
			</button>
		{/if}
	</div>

	<div class="sidebar-main" class:is-collapsed={collapsed && !isMobile}>
		<ComposeButton
			isAccountConfigured={isAccountConfigured}
			collapsed={collapsed}
			isMobile={isMobile}
			onOpenCompose={openCompose}
		/>

		{#if !collapsed || isMobile}
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
		{/if}

		{#if showDisabledTooltip}
			<div class="absolute top-16 left-1/2 -translate-x-1/2 z-50 px-3 py-1.5 bg-[var(--text-primary)] text-[var(--bg-primary)] text-xs rounded-md shadow-lg pointer-events-none animate-scale-in">
				{$_('account.addFirst')}
			</div>
		{/if}

		<FolderNavigation
			navItems={navItems}
			activeFolder={activeFolder}
			isAccountConfigured={isAccountConfigured}
			unreadCounts={unreadCounts}
			collapsed={collapsed}
			isMobile={isMobile}
			onSelectFolder={handleFolderClick}
		/>
	</div>

	<!-- Spacer to push settings to bottom -->
	<div class="flex-1"></div>

	<!-- Settings button - bottom left -->
	<div class="shrink-0 px-2.5 pb-2.5">
		<button
			type="button"
			onclick={() => onOpenSettings?.()}
			class="sidebar-chrome-button flex size-8 items-center justify-center rounded-xl text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-all"
			aria-label={$_('nav.settings')}
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
	.sidebar-shell {
		position: relative;
		overflow: hidden;
		isolation: isolate;
		background-color: var(--bg-secondary);
		backface-visibility: hidden;
		transform: translateZ(0);
		transition:
			width 380ms cubic-bezier(0.22, 1, 0.36, 1),
			transform 340ms cubic-bezier(0.22, 1, 0.36, 1),
			box-shadow 320ms cubic-bezier(0.22, 1, 0.36, 1);
		background:
			linear-gradient(180deg, color-mix(in srgb, var(--bg-secondary) 96%, transparent), color-mix(in srgb, var(--bg-primary) 92%, transparent));
	}

	.sidebar-shell::before {
		content: '';
		position: absolute;
		inset: 0;
		pointer-events: none;
		background:
			radial-gradient(circle at 12% 10%, color-mix(in srgb, var(--accent-primary) 10%, transparent), transparent 28%),
			radial-gradient(circle at 82% 84%, color-mix(in srgb, var(--accent-light) 34%, transparent), transparent 34%);
		opacity: 0.85;
	}

	.sidebar-topbar,
	.sidebar-shell > :global(*) {
		position: relative;
		z-index: 1;
	}

	.sidebar-main {
		display: flex;
		flex: 1;
		flex-direction: column;
		min-height: 0;
		overflow: hidden;
		contain: paint;
		transition:
			padding 320ms cubic-bezier(0.22, 1, 0.36, 1),
			gap 320ms cubic-bezier(0.22, 1, 0.36, 1),
			opacity 220ms cubic-bezier(0.22, 1, 0.36, 1);
	}

	.sidebar-main.is-collapsed {
		animation: sidebar-content-settle 320ms cubic-bezier(0.22, 1, 0.36, 1);
	}

	.sidebar-chrome-button {
		will-change: transform;
	}

	.sidebar-chrome-button:hover {
		transform: translate3d(0, -1px, 0);
		box-shadow: var(--shadow-xs);
	}

	.sidebar-chrome-button:active {
		transform: scale(0.96);
	}

	.sidebar-sync-button {
		backdrop-filter: blur(14px);
	}

	.sidebar-sync-button[aria-busy='true'] {
		background: color-mix(in srgb, var(--accent-primary) 12%, var(--bg-hover));
		color: var(--accent-primary);
		box-shadow:
			var(--shadow-xs),
			0 0 0 1px color-mix(in srgb, var(--accent-primary) 12%, transparent);
	}

	:global(.dark) .sidebar-shell {
		background:
			linear-gradient(180deg, color-mix(in srgb, var(--bg-secondary) 94%, rgba(255, 255, 255, 0.02)), color-mix(in srgb, var(--bg-primary) 94%, transparent));
	}

	:global(.dark) .sidebar-shell::before {
		background:
			radial-gradient(circle at 14% 12%, color-mix(in srgb, var(--accent-primary) 16%, transparent), transparent 28%),
			radial-gradient(circle at 82% 84%, color-mix(in srgb, var(--accent-light) 28%, transparent), transparent 34%);
	}

	.sidebar-shell[data-collapsed='true']::before {
		opacity: 0.62;
		transition: opacity 320ms cubic-bezier(0.22, 1, 0.36, 1);
	}

	.sidebar-shell[data-collapsed='false']::before {
		transition: opacity 320ms cubic-bezier(0.22, 1, 0.36, 1);
	}

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

	@keyframes sidebar-content-settle {
		from {
			opacity: 0.88;
			transform: translate3d(-4px, 0, 0);
		}

		to {
			opacity: 1;
			transform: translate3d(0, 0, 0);
		}
	}
</style>
