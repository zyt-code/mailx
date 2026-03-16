<script lang="ts">
	import { cn } from '$lib/utils.js';
	import ScrollArea from '$lib/components/ui/scroll-area/scroll-area.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import { Search, Star, Paperclip } from 'lucide-svelte';
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
						m.from_name.toLowerCase().includes(q) ||
						m.from_email.toLowerCase().includes(q) ||
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
		trash: 'Trash',
		archive: 'Archive'
	};

	// Professional date formatting
	function formatMailTime(timestamp: number): string {
		const now = new Date();
		const mailDate = new Date(timestamp);

		// Reset time to compare dates only
		const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		const mailDay = new Date(mailDate.getFullYear(), mailDate.getMonth(), mailDate.getDate());

		const diffDays = Math.floor((today.getTime() - mailDay.getTime()) / (1000 * 60 * 60 * 24));

		if (diffDays === 0) {
			// Today: show time
			return mailDate.toLocaleTimeString('en-US', {
				hour: 'numeric',
				minute: '2-digit',
				hour12: true
			});
		} else if (diffDays === 1) {
			// Yesterday
			return 'Yesterday';
		} else if (diffDays < 7) {
			// This week: show day name
			return mailDate.toLocaleDateString('en-US', { weekday: 'short' });
		} else {
			// Older: show date
			return mailDate.toLocaleDateString('en-US', {
				month: 'short',
				day: 'numeric'
			});
		}
	}
</script>

<div
	class="flex h-full flex-col border-r border-zinc-200/60 bg-white/60 backdrop-blur-sm"
	style:width={width !== undefined ? `${width}px` : undefined}
	class:w-full={width === undefined}
>
	<!-- Header with Search -->
	<div class="flex items-center gap-2.5 border-b border-zinc-200/60 p-4">
		<Search class="size-4 text-zinc-400 shrink-0" />
		<Input
			type="search"
			placeholder="Search {folderLabels[activeFolder].toLowerCase()}..."
			class="h-8 border-none bg-transparent shadow-none focus-visible:ring-0 placeholder:text-zinc-400 text-sm"
			bind:value={searchQuery}
		/>
	</div>

	<!-- Mail items -->
	<ScrollArea class="flex-1">
		{#if filteredMails.length === 0}
			<div class="flex h-40 flex-col items-center justify-center p-8">
				<Search class="size-10 text-zinc-300 mb-3" />
				<p class="text-sm font-medium text-zinc-500">No emails found</p>
				<p class="text-xs text-zinc-400 mt-1">Try a different search term</p>
			</div>
		{:else}
			<div class="divide-y divide-zinc-100/80">
				{#each filteredMails as mail}
					<button
						class={cn(
							'group relative flex w-full gap-3 p-4 text-left transition-all duration-200',
							mail.id === selectedMailId
								? 'bg-white'
								: 'hover:bg-zinc-100/50',
							mail.unread && mail.id !== selectedMailId && 'bg-zinc-50/40'
						)}
						onclick={() => onSelectMail(mail.id)}
					>
						<!-- Unread indicator -->
						<div class="flex-shrink-0 pt-1">
							{#if mail.unread && mail.id !== selectedMailId}
								<div class="size-2 rounded-full bg-blue-500"></div>
							{:else}
								<div class="size-2"></div>
							{/if}
						</div>

						<!-- Main content -->
						<div class="flex-1 min-w-0">
							<!-- Sender row with date -->
							<div class="flex items-start justify-between gap-2 mb-1">
								<span
									class={cn(
										'truncate text-sm font-semibold',
										mail.unread && mail.id !== selectedMailId
											? 'text-zinc-900'
											: 'text-zinc-700'
									)}
								>
									{mail.from_name}
								</span>
								<span class="text-xs text-zinc-400 tabular-nums shrink-0">
									{formatMailTime(mail.timestamp)}
								</span>
							</div>

							<!-- Subject -->
							<div class={cn(
								'truncate text-sm mb-1 leading-snug font-medium',
								mail.unread && mail.id !== selectedMailId
									? 'font-semibold text-zinc-800'
									: 'text-zinc-600'
							)}>
								{mail.subject}
							</div>

							<!-- Preview -->
							<p class="line-clamp-2 text-xs text-zinc-400 leading-relaxed">
								{mail.preview}
							</p>
						</div>

						<!-- Actions column -->
						<div class="flex flex-col items-end gap-1 flex-shrink-0">
							{#if mail.starred}
								<Star class="size-4 fill-amber-400 text-amber-400" />
							{/if}
							{#if mail.has_attachments}
								<Paperclip class="size-3.5 text-zinc-400" />
							{/if}
						</div>
					</button>
				{/each}
			</div>
		{/if}
	</ScrollArea>
</div>
