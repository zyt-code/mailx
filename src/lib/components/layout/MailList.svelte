<script lang="ts">
	import { cn } from '$lib/utils.js';
	import ScrollArea from '$lib/components/ui/scroll-area/scroll-area.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import { Search } from 'lucide-svelte';
	import type { Mail, Folder } from '$lib/types.js';

	interface Props {
		mails: Mail[];
		activeFolder: Folder;
		selectedMailId: string | null;
		onSelectMail: (id: string) => void;
		width: number | undefined;
	}

	let { mails, activeFolder, selectedMailId, onSelectMail, width }: Props = $props();

	let searchQuery = $state('');

	let folderMails = $derived(mails.filter((m) => m.folder === activeFolder));

	let filteredMails = $derived(
		searchQuery.trim()
			? folderMails.filter((m) => {
					const q = searchQuery.toLowerCase();
					return (
						m.from.toLowerCase().includes(q) ||
						m.subject.toLowerCase().includes(q) ||
						m.preview.toLowerCase().includes(q)
					);
				})
			: folderMails
	);

	const folderLabels: Record<Folder, string> = {
		inbox: 'Inbox',
		sent: 'Sent',
		drafts: 'Drafts',
		trash: 'Trash'
	};
</script>

<div
	class="flex h-full flex-col border-r border-border bg-bg-primary"
	style:width={width !== undefined ? `${width}px` : undefined}
	class:w-full={width === undefined}
>
	<!-- Header -->
	<div class="flex items-center gap-2 border-b border-border p-3" class:pl-12={width === undefined}>
		<Search class="size-4 text-text-muted shrink-0" />
		<Input
			type="search"
			placeholder="Search {folderLabels[activeFolder].toLowerCase()}..."
			class="h-8 border-none shadow-none focus-visible:ring-0"
			bind:value={searchQuery}
		/>
	</div>

	<!-- Mail items -->
	<ScrollArea class="flex-1">
		{#if filteredMails.length === 0}
			<div class="flex h-32 items-center justify-center">
				<p class="text-sm text-text-muted">No emails found</p>
			</div>
		{:else}
			<div class="divide-y divide-border">
				{#each filteredMails as mail}
					<button
						class={cn(
							'flex w-full flex-col gap-1 p-3 text-left transition-colors',
							mail.id === selectedMailId
								? 'bg-accent/10 border-l-2 border-l-accent'
								: 'hover:bg-bg-hover',
							mail.unread && mail.id !== selectedMailId && 'bg-bg-secondary'
						)}
						onclick={() => onSelectMail(mail.id)}
					>
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-2">
								{#if mail.unread}
									<span class="size-2 rounded-full bg-accent shrink-0"></span>
								{/if}
								<span
									class={cn('text-sm text-text', mail.unread && 'font-semibold')}
								>
									{mail.from}
								</span>
							</div>
							<span class="text-xs text-text-muted">{mail.time}</span>
						</div>
						<span class="text-sm text-text">{mail.subject}</span>
						<span class="truncate text-xs text-text-muted">{mail.preview}</span>
					</button>
				{/each}
			</div>
		{/if}
	</ScrollArea>
</div>
