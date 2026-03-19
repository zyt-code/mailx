<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import {
		Reply,
		ReplyAll,
		Forward,
		Archive,
		ArchiveRestore,
		Trash2,
		Star,
		StarOff,
		MoreHorizontal
	} from 'lucide-svelte';
	import type { Mail, Folder } from '$lib/types.js';

	interface Props {
		mail: Mail;
		onReply: (mail: Mail) => void;
		onReplyAll: (mail: Mail) => void;
		onForward: (mail: Mail) => void;
		onArchive: (mail: Mail) => void;
		onUnarchive?: (mail: Mail) => void;
		onDelete: (mail: Mail) => void;
		onToggleStar: (mail: Mail) => void;
	}

	let { mail, onReply, onReplyAll, onForward, onArchive, onUnarchive, onDelete, onToggleStar }: Props =
		$props();

	let showDropdown = $state(false);

	// Use $derived to reactively compute isArchive
	let isArchive = $derived(mail.folder === 'archive');

	function handleReply() {
		onReply(mail);
		showDropdown = false;
	}

	function handleReplyAll() {
		onReplyAll(mail);
		showDropdown = false;
	}

	function handleForward() {
		onForward(mail);
		showDropdown = false;
	}

	function handleArchive() {
		if (mail.folder === 'archive') {
			onUnarchive?.(mail);
		} else {
			onArchive(mail);
		}
		showDropdown = false;
	}

	function handleDelete() {
		onDelete(mail);
		showDropdown = false;
	}

	function handleToggleStar() {
		onToggleStar(mail);
		showDropdown = false;
	}
</script>

<div class="flex items-center gap-0.5 border-b border-[var(--border-primary)] bg-[var(--bg-primary)] px-3 py-1.5 sticky top-0 z-10">
	<!-- Primary actions -->
	<Button
		variant="ghost"
		size="sm"
		onclick={handleReply}
		aria-label="Reply"
		title="Reply (R)"
		class="text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
	>
		<Reply strokeWidth={1.8} class="size-4" />
		<span class="ml-1.5 hidden sm:inline">Reply</span>
	</Button>

	<Button
		variant="ghost"
		size="sm"
		onclick={handleReplyAll}
		aria-label="Reply all"
		title="Reply All (A)"
		class="text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
	>
		<ReplyAll strokeWidth={1.8} class="size-4" />
		<span class="ml-1.5 hidden sm:inline">Reply All</span>
	</Button>

	<Button
		variant="ghost"
		size="sm"
		onclick={handleForward}
		aria-label="Forward"
		title="Forward (F)"
		class="text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
	>
		<Forward strokeWidth={1.8} class="size-4" />
		<span class="ml-1.5 hidden sm:inline">Forward</span>
	</Button>

	<!-- Divider -->
	<div class="mx-1 h-4 w-px bg-[var(--border-primary)]"></div>

	<!-- Archive/Unarchive -->
	<Button
		variant="ghost"
		size="sm"
		onclick={handleArchive}
		aria-label={isArchive ? 'Unarchive' : 'Archive'}
		title={isArchive ? 'Unarchive (E)' : 'Archive (E)'}
		class="text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
	>
		{#if isArchive}
			<ArchiveRestore strokeWidth={1.8} class="size-4" />
			<span class="ml-1.5 hidden sm:inline">Unarchive</span>
		{:else}
			<Archive strokeWidth={1.8} class="size-4" />
			<span class="ml-1.5 hidden sm:inline">Archive</span>
		{/if}
	</Button>

	<!-- Star -->
	<Button
		variant="ghost"
		size="sm"
		onclick={handleToggleStar}
		aria-label={mail.starred ? 'Unstar' : 'Star'}
		title={mail.starred ? 'Unstar (S)' : 'Star (S)'}
		class={mail.starred ? 'text-[var(--accent-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'}
	>
		{#if mail.starred}
			<Star strokeWidth={1.8} class="size-4 fill-[var(--accent-primary)]" />
			<span class="ml-1.5 hidden sm:inline">Starred</span>
		{:else}
			<Star strokeWidth={1.8} class="size-4" />
			<span class="ml-1.5 hidden sm:inline">Star</span>
		{/if}
	</Button>

	<!-- Delete -->
	<Button
		variant="ghost"
		size="sm"
		onclick={handleDelete}
		aria-label="Delete"
		title="Delete"
		class="text-[var(--text-secondary)] hover:text-[var(--error)] hover:bg-[var(--error-light)]"
	>
		<Trash2 strokeWidth={1.8} class="size-4" />
		<span class="ml-1.5 hidden sm:inline">Delete</span>
	</Button>

	<!-- More dropdown (for mobile) -->
	<div class="relative sm:hidden">
		<Button variant="ghost" size="icon-sm" onclick={() => (showDropdown = !showDropdown)} aria-label="More actions">
			<MoreHorizontal strokeWidth={1.5} class="size-4" />
		</Button>

		{#if showDropdown}
			<div
				class="absolute right-0 top-full z-10 w-48 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)] shadow-lg"
				role="menu"
				tabindex="-1"
			>
				<button
					onclick={handleReply}
					class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
					role="menuitem"
				>
					<Reply strokeWidth={1.5} class="size-4" />
					Reply
				</button>
				<button
					onclick={handleReplyAll}
					class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
					role="menuitem"
				>
					<ReplyAll strokeWidth={1.5} class="size-4" />
					Reply All
				</button>
				<button
					onclick={handleForward}
					class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
					role="menuitem"
				>
					<Forward strokeWidth={1.5} class="size-4" />
					Forward
				</button>
				<div class="border-t border-[var(--border-primary)]"></div>
				<button
					onclick={handleArchive}
					class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
					role="menuitem"
				>
					{#if isArchive}
						<ArchiveRestore strokeWidth={1.5} class="size-4" />
						Unarchive
					{:else}
						<Archive strokeWidth={1.5} class="size-4" />
						Archive
					{/if}
				</button>
				<button
					onclick={handleToggleStar}
					class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
					role="menuitem"
				>
					{#if mail.starred}
						<StarOff strokeWidth={1.5} class="size-4" />
						Unstar
					{:else}
						<Star strokeWidth={1.5} class="size-4" />
						Star
					{/if}
				</button>
				<button
					onclick={handleDelete}
					class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[var(--error)] hover:bg-[var(--error-light)]"
					role="menuitem"
				>
					<Trash2 strokeWidth={1.5} class="size-4" />
					Delete
				</button>
			</div>
		{/if}
	</div>
</div>
