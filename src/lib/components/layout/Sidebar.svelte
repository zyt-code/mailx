<script lang="ts">
	import { cn } from '$lib/utils.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import type { Folder } from '$lib/types.js';
	import {
		Inbox,
		Send,
		FileEdit,
		Trash2,
		PanelLeftClose,
		PanelLeftOpen,
		Plus
	} from 'lucide-svelte';
	import { ComposeModal } from '$lib/components/compose/index.js';
	import * as db from '$lib/db/index.js';

	interface Props {
		collapsed: boolean;
		isMobile: boolean;
		activeFolder: Folder;
		onToggle: () => void;
		onSelectFolder: (folder: Folder) => void;
		onRefresh?: () => void;
	}

	let { collapsed, isMobile, activeFolder, onToggle, onSelectFolder, onRefresh }: Props = $props();

	const navItems: { icon: typeof Inbox; label: string; folder: Folder; count: number }[] = [
		{ icon: Inbox, label: 'Inbox', folder: 'inbox', count: 12 },
		{ icon: Send, label: 'Sent', folder: 'sent', count: 0 },
		{ icon: FileEdit, label: 'Drafts', folder: 'drafts', count: 3 },
		{ icon: Trash2, label: 'Trash', folder: 'trash', count: 0 }
	];

	let showCompose = $state(false);

	function handleFolderClick(folder: Folder) {
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
		// Refresh mail list to show new sent mail
		if (onRefresh) {
			onRefresh();
		}
	}
</script>

{#if isMobile && !collapsed}
	<!-- Backdrop for mobile overlay -->
	<button
		class="fixed inset-0 z-30 bg-black/30"
		onclick={onToggle}
		aria-label="Close sidebar"
	></button>
{/if}

<aside
	class={cn(
		'flex h-full flex-col border-r border-border bg-bg-secondary transition-[width] duration-200 overflow-hidden',
		isMobile && 'fixed inset-y-0 left-0 z-40 shadow-lg',
		isMobile && collapsed && '-translate-x-full'
	)}
	style:width={collapsed && !isMobile ? '64px' : '250px'}
>
	<!-- Toggle button -->
	<div class="flex h-12 items-center px-3 border-b border-border">
		<Button variant="ghost" size="icon-sm" onclick={onToggle} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
			{#if collapsed && !isMobile}
				<PanelLeftOpen class="size-4" />
			{:else}
				<PanelLeftClose class="size-4" />
			{/if}
		</Button>
		{#if !collapsed}
			<span class="ml-2 text-sm font-semibold text-text">Mailx</span>
		{/if}
	</div>

	<!-- Compose button -->
	<div class="p-2">
		<button
			class={cn(
				'flex w-full items-center justify-center gap-2 rounded-md bg-accent px-3 py-2 text-sm font-medium text-white transition-colors hover:opacity-90',
				collapsed && !isMobile && 'px-0'
			)}
			onclick={openCompose}
		>
			<Plus class="size-4 shrink-0" />
			{#if !collapsed || isMobile}
				<span class="ml-2">Compose</span>
			{/if}
		</button>
	</div>

	<!-- Navigation -->
	<nav class="flex-1 p-2 space-y-0.5">
		{#each navItems as item}
			<button
				class={cn(
					'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
					item.folder === activeFolder
						? 'bg-bg-hover text-text font-medium'
						: 'text-text-muted hover:bg-bg-hover',
					collapsed && !isMobile && 'justify-center px-0'
				)}
				onclick={() => handleFolderClick(item.folder)}
			>
				<item.icon class="size-4 shrink-0" />
				{#if !collapsed || isMobile}
					<span class="truncate">{item.label}</span>
					{#if item.count > 0}
						<span class="ml-auto text-xs text-text-muted">{item.count}</span>
					{/if}
				{/if}
			</button>
		{/each}
	</nav>

	<!-- Compose Modal -->
	<ComposeModal
		isOpen={showCompose}
		onClose={closeCompose}
		onSent={onComposeSent}
	/>
</aside>
