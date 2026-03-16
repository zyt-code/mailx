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
		Plus,
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
		class="fixed inset-0 z-30 bg-black/10 backdrop-blur-sm transition-opacity duration-200"
		onclick={onToggle}
		aria-label="Close sidebar"
	></div>
{/if}

<aside
	class={cn(
		'flex h-full flex-col bg-zinc-50/80 backdrop-blur-md transition-all duration-300 ease-out',
		isMobile && 'fixed inset-y-0 left-0 z-40 shadow-2xl',
		isMobile && collapsed && '-translate-x-full',
		!isMobile && 'border-r border-zinc-200/60'
	)}
	style:width={collapsed && !isMobile ? '64px' : '280px'}
>
	<!-- Toggle button (top, inline with layout) -->
	<div class="flex h-9 items-center justify-between px-3">
		<button
			onclick={onToggle}
			class="flex size-7 items-center justify-center rounded-lg text-zinc-500 transition-all duration-200 hover:bg-zinc-200/80 hover:text-zinc-700 active:scale-95"
			aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
		>
			{#if collapsed && !isMobile}
				<PanelLeftOpen class="size-4" />
			{:else}
				<PanelLeftClose class="size-4" />
			{/if}
		</button>
		{#if !collapsed && onRefresh}
			<button
				onclick={handleRefresh}
				disabled={isRefreshing}
				class="flex size-7 items-center justify-center rounded-lg text-zinc-500 transition-all duration-200 hover:bg-zinc-200/80 hover:text-zinc-700 active:scale-95 disabled:opacity-40"
				aria-label="Refresh"
			>
				<RefreshCw class={cn('size-4', isRefreshing && 'animate-spin')} />
			</button>
		{/if}
	</div>

	<!-- Compose Button -->
	<div class="px-3 pt-3 pb-3">
		<button
			class={cn(
				'group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-zinc-900/20 transition-all duration-200 hover:bg-zinc-800 hover:shadow-xl hover:shadow-zinc-900/30 active:scale-[0.97]',
				collapsed && !isMobile && 'px-0'
			)}
			onclick={openCompose}
		>
			<Plus class="size-4 shrink-0" />
			{#if !collapsed || isMobile}
				<span class="font-medium tracking-tight">New Message</span>
			{/if}
		</button>
	</div>

	<!-- Navigation -->
	<nav class="flex-1 overflow-y-auto px-2 pb-2">
		<div class="space-y-0.5">
			{#each navItems as item}
				<button
					class={cn(
						'group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
						item.folder === activeFolder
							? 'bg-accent text-zinc-900'
							: 'text-zinc-600 hover:bg-accent/60',
						collapsed && !isMobile && 'justify-center px-3'
					)}
					onclick={() => handleFolderClick(item.folder)}
				>
					<item.icon class={cn(
						'size-4 shrink-0',
						item.folder === activeFolder && 'text-zinc-900',
						item.folder === activeFolder && item.icon === Inbox && 'fill-current'
					)} />
					{#if !collapsed || isMobile}
						<span class="flex-1 text-left truncate font-medium">
							{item.label}
						</span>
						{#if item.count > 0}
							<span class="flex size-5 items-center justify-center rounded-full bg-zinc-200 text-xs font-semibold text-zinc-600 group-hover:bg-zinc-300 transition-colors">
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
