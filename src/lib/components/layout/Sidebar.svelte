<script lang="ts">
	import { cn } from '$lib/utils.js';
	import { Avatar } from '$lib/components/ui/avatar/index.js';
	import ScrollArea from '$lib/components/ui/scroll-area/scroll-area.svelte';
	import type { Folder, Account } from '$lib/types.js';
	import { hasAccounts, activeAccount } from '$lib/stores/accountStore.js';
	import { isSyncing } from '$lib/stores/syncStore.js';
	import { syncAllAccounts } from '$lib/sync/index.js';
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
		CircleHelp,
		Lock
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
	}

	let { collapsed, isMobile, activeFolder, onToggle, onSelectFolder, onRefresh, currentRoute = '/', onOpenSettings }: Props = $props();

	const navItems: { icon: typeof Inbox; label: string; folder: Folder; count: number }[] = [
		{ icon: Inbox, label: 'Inbox', folder: 'inbox', count: 12 },
		{ icon: Send, label: 'Sent', folder: 'sent', count: 0 },
		{ icon: FileEdit, label: 'Drafts', folder: 'drafts', count: 3 },
		{ icon: Archive, label: 'Archive', folder: 'archive', count: 0 },
		{ icon: Trash2, label: 'Trash', folder: 'trash', count: 0 }
	];

	let showCompose = $state(false);
	let isRefreshing = $state(false);
	let showDisabledTooltip = $state(false);
	let tooltipTimer = $state<number | null>(null);

	// Account state from store - subscribe to stores
	let currentAccount = $state<Account | null>(null);
	let isAccountConfigured = $state(false);

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

		return () => {
			unsubActive();
			unsubHas();
			unsubSync();
		};
	});

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
			if (onRefresh) await onRefresh();
		}
	}

	function navigateToSettings() {
		onOpenSettings?.();
		if (isMobile) onToggle();
	}

	function openHelp() {
		// TODO: Implement help dialog
		console.log('Open help');
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
		'flex h-full flex-col bg-white',
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
		<!-- Account Header -->
		<div
			class={cn(
				"flex items-center gap-2 px-3 py-2 rounded-md mx-2 mt-1 relative z-10",
				isAccountConfigured ? "hover:bg-zinc-100/50 cursor-pointer" : "opacity-60"
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
			</div>
			<button
				onclick={openCompose}
				disabled={!isAccountConfigured}
				class={cn(
					"flex size-7 rounded-md transition-all duration-150",
					isAccountConfigured
						? "text-zinc-400 hover:bg-zinc-200 hover:text-zinc-700 opacity-0 group-hover:opacity-100"
						: "text-zinc-300 cursor-not-allowed"
				)}
				aria-label="Compose"
			>
				{#if isAccountConfigured}
					<SquarePen class="size-[15px]" strokeWidth={1.5} />
				{:else}
					<Lock class="size-[15px]" strokeWidth={1.5} />
				{/if}
			</button>
		</div>

		<!-- Disabled feedback tooltip -->
		{#if showDisabledTooltip}
			<div class="absolute top-20 left-1/2 -translate-x-1/2 z-50 px-3 py-2 bg-zinc-900 text-white text-xs rounded-lg shadow-lg pointer-events-none animate-in fade-in slide-in-from-top-2 duration-200">
				Please add an account in Settings
			</div>
		{/if}

		<!-- Navigation -->
		<nav class="flex-1 overflow-y-auto px-2 mt-1">
			<div class="space-y-0.5">
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
						{#if item.count > 0 && isAccountConfigured}
							<span class="text-[11px] font-medium text-zinc-400 tabular-nums">
								{item.count}
							</span>
						{/if}
					</button>
				{/each}
			</div>
		</nav>

		<!-- Footer -->
		<div class="shrink-0 px-2 pb-2">
			<div class="space-y-0.5">
				<button
					onclick={navigateToSettings}
					class="group flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] text-zinc-500 hover:bg-zinc-50 hover:text-zinc-700 relative z-10 cursor-pointer"
				>
					<Settings class="size-[18px] shrink-0" strokeWidth={1.5} />
					<span class="flex-1 text-left">Settings</span>
				</button>
				<button
					onclick={openHelp}
					class="group flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] text-zinc-500 hover:bg-zinc-50 hover:text-zinc-700 relative z-10 cursor-pointer"
				>
					<CircleHelp class="size-[18px] shrink-0" strokeWidth={1.5} />
					<span class="flex-1 text-left">Help & Support</span>
				</button>
			</div>
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
			<div class="flex flex-col items-center gap-1">
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
						<item.icon class="size-[18px]" strokeWidth={1.5} />
					</button>
				{/each}
			</div>
		</nav>

		<!-- Collapsed footer -->
		<div class="shrink-0 px-2 pb-2">
			<div class="flex flex-col items-center gap-1">
				<button
					onclick={navigateToSettings}
					class="flex size-8 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-50 hover:text-zinc-700 relative z-10 cursor-pointer"
					aria-label="Settings"
				>
					<Settings class="size-[18px]" strokeWidth={1.5} />
				</button>
				<button
					onclick={openHelp}
					class="flex size-8 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-50 hover:text-zinc-700 relative z-10 cursor-pointer"
					aria-label="Help"
				>
					<CircleHelp class="size-[18px]" strokeWidth={1.5} />
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
