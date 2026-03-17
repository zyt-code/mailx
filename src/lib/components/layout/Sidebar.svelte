<script lang="ts">
	import { cn } from '$lib/utils.js';
	import type { Folder } from '$lib/types.js';
	import {
		Inbox,
		Send,
		FileEdit,
		Trash2,
		PanelLeftClose,
		PanelLeftOpen,
		SquarePen,
		Archive,
		RefreshCw
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
	}

	let { collapsed, isMobile, activeFolder, onToggle, onSelectFolder, onRefresh, currentRoute = '/' }: Props = $props();

	const navItems: { icon: typeof Inbox; label: string; folder: Folder; count: number }[] = [
		{ icon: Inbox, label: 'Inbox', folder: 'inbox', count: 12 },
		{ icon: Send, label: 'Sent', folder: 'sent', count: 0 },
		{ icon: FileEdit, label: 'Drafts', folder: 'drafts', count: 3 },
		{ icon: Archive, label: 'Archive', folder: 'archive', count: 0 },
		{ icon: Trash2, label: 'Trash', folder: 'trash', count: 0 }
	];

	let showCompose = $state(false);
	let isRefreshing = $state(false);

	async function handleFolderClick(folder: Folder) {
		onSelectFolder(folder);
		if (isMobile) onToggle();
	}

	function openCompose() {
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
		if (!onRefresh || isRefreshing) return;
		isRefreshing = true;
		try {
			await onRefresh();
		} finally {
			isRefreshing = false;
		}
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
		'flex h-full flex-col bg-white transition-all duration-200 ease-out',
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
				disabled={isRefreshing}
				class="flex size-7 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-100/60 hover:text-zinc-600 disabled:opacity-30"
				aria-label="Refresh"
			>
				<RefreshCw class={cn('size-[15px]', isRefreshing && 'animate-spin')} strokeWidth={1.5} />
			</button>
		{/if}
	</div>

	<!-- Compose Button - Notion Mail subtle style -->
	<div class="px-3 pb-4 pt-1">
		<button
			class={cn(
				'group flex w-full items-center justify-center gap-2 rounded-lg bg-white border border-zinc-200 shadow-sm px-3 py-2 text-[13px] font-medium text-zinc-700 hover:bg-zinc-50 hover:border-zinc-300 active:scale-[0.98] transition-all duration-150',
				collapsed && !isMobile && 'px-0'
			)}
			onclick={openCompose}
		>
			<SquarePen class="size-4 shrink-0 text-zinc-500" strokeWidth={1.5} />
			{#if !collapsed || isMobile}
				<span class="text-zinc-700">Compose</span>
			{/if}
		</button>
	</div>

	<!-- Navigation -->
	<nav class="flex-1 overflow-y-auto px-2">
		<div class="space-y-0.5">
			{#each navItems as item}
				<button
					class={cn(
						'group flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] transition-all duration-150',
						item.folder === activeFolder
							? 'bg-zinc-100 text-zinc-900 font-semibold'
							: 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-700',
						collapsed && !isMobile && 'justify-center px-2'
					)}
					onclick={() => handleFolderClick(item.folder)}
				>
					<item.icon class="size-[18px] shrink-0" strokeWidth={1.5} />
					{#if !collapsed || isMobile}
						<span class="flex-1 text-left truncate">
							{item.label}
						</span>
						{#if item.count > 0}
							<span class="text-[11px] font-medium text-zinc-400 tabular-nums">
								{item.count}
							</span>
						{/if}
					{/if}
				</button>
			{/each}
		</div>
	</nav>

	<!-- Compose Modal -->
	<ComposeModal
		isOpen={showCompose}
		onClose={closeCompose}
		onSent={onComposeSent}
	/>
</aside>
