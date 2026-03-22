<script lang="ts">
	import { cn } from '$lib/utils.js';
	import type { Folder } from '$lib/types.js';
	import { _ } from 'svelte-i18n';
	import { Inbox, Send, FileEdit, Archive, Trash2 } from 'lucide-svelte';

	interface Props {
		navItems: ReadonlyArray<{ readonly icon: any; readonly label: string; readonly folder: Folder }>;
		activeFolder: Folder;
		isAccountConfigured: boolean;
		unreadCount: number;
		collapsed: boolean;
		isMobile: boolean;
		onSelectFolder: (folder: Folder) => void;
	}

	let {
		navItems,
		activeFolder,
		isAccountConfigured,
		unreadCount,
		collapsed,
		isMobile,
		onSelectFolder,
	}: Props = $props();

	function handleFolderClick(folder: Folder) {
		if (!isAccountConfigured) {
			// Show feedback disabled in parent
			return;
		}
		onSelectFolder(folder);
		if (isMobile) {
			// Toggle sidebar on mobile after selection
			// This should be handled by parent
		}
	}
</script>

{#if !collapsed || isMobile}
	<!-- Expanded navigation -->
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
{:else}
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
{/if}