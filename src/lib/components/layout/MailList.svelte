<script lang="ts">
	import { cn } from '$lib/utils.js';
	import ScrollArea from '$lib/components/ui/scroll-area/scroll-area.svelte';
	import * as ContextMenu from '$lib/components/ui/context-menu/index.js';
	import { Search, Paperclip, MailOpen, Mail as MailIcon, Archive, Trash2, FolderInput, Inbox, Send, FileText } from 'lucide-svelte';
	import type { Mail, Folder } from '$lib/types.js';

	interface Props {
		mails: Mail[];
		activeFolder: Folder;
		selectedMailId: string | null;
		onSelectMail: (id: string) => void;
		onMarkRead?: (mail: Mail, read: boolean) => void;
		onDelete?: (mail: Mail) => void;
		onArchive?: (mail: Mail) => void;
		onMoveTo?: (mail: Mail, folder: Folder) => void;
		width: number | undefined;
		isAccountConfigured?: boolean;
	}

	let { mails, activeFolder, selectedMailId, onSelectMail, onMarkRead, onDelete, onArchive, onMoveTo, width, isAccountConfigured = true }: Props = $props();

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

	// Group mails by date category
	interface MailGroup {
		label: string;
		mails: Mail[];
	}

	let groupedMails = $derived.by(() => {
		const now = new Date();
		const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		const yesterday = new Date(today.getTime() - 86400000);
		const weekAgo = new Date(today.getTime() - 7 * 86400000);
		const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

		const groups: Map<string, Mail[]> = new Map();
		const order: string[] = [];

		function getGroup(mail: Mail): string {
			const d = new Date(mail.timestamp);
			const mailDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());

			if (mailDay.getTime() >= today.getTime()) return 'Today';
			if (mailDay.getTime() >= yesterday.getTime()) return 'Yesterday';
			if (mailDay.getTime() >= weekAgo.getTime()) return 'Last 7 Days';
			if (mailDay.getTime() >= thisMonth.getTime()) return 'This Month';
			return d.toLocaleDateString('en-US', { month: 'long', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
		}

		for (const mail of filteredMails) {
			const label = getGroup(mail);
			if (!groups.has(label)) {
				groups.set(label, []);
				order.push(label);
			}
			groups.get(label)!.push(mail);
		}

		return order.map((label) => ({ label, mails: groups.get(label)! }));
	});

	const folderLabels: Record<Folder, string> = {
		inbox: 'Inbox',
		sent: 'Sent',
		drafts: 'Drafts',
		trash: 'Trash',
		archive: 'Archive'
	};

	function formatMailTime(timestamp: number): string {
		const now = new Date();
		const mailDate = new Date(timestamp);
		const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		const mailDay = new Date(mailDate.getFullYear(), mailDate.getMonth(), mailDate.getDate());
		const diffDays = Math.floor((today.getTime() - mailDay.getTime()) / 86400000);

		if (diffDays === 0) {
			return mailDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
		} else if (diffDays === 1) {
			return 'Yesterday';
		} else if (diffDays < 7) {
			return mailDate.toLocaleDateString('en-US', { weekday: 'short' });
		} else {
			return mailDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
		}
	}
</script>

<div
	class="flex h-full flex-col bg-white"
	style:width={width !== undefined ? `${width}px` : undefined}
	class:w-full={width === undefined}
>
	<!-- Search - Notion Quick Find style -->
	<div class="flex items-center gap-2 px-4 py-2.5 border-b border-zinc-100">
		<Search class={cn(
			"size-4 shrink-0",
			isAccountConfigured ? "text-zinc-300" : "text-zinc-200"
		)} strokeWidth={1.5} />
		<input
			type="text"
			placeholder="Search {folderLabels[activeFolder].toLowerCase()}..."
			disabled={!isAccountConfigured}
			class={cn(
				"flex-1 bg-transparent text-[13px] outline-none placeholder:text-zinc-400 transition-colors duration-150 rounded-md px-2 -mx-2",
				isAccountConfigured
					? "text-zinc-900 focus:bg-zinc-100/50"
					: "text-zinc-300 cursor-not-allowed placeholder:text-zinc-300"
			)}
			bind:value={searchQuery}
		/>
	</div>

	<!-- Mail items -->
	<ScrollArea class="flex-1">
		{#if filteredMails.length === 0}
			<div class="flex flex-col items-center justify-center px-6 py-16">
				<p class="text-[13px] text-zinc-400">No emails found</p>
			</div>
		{:else}
			<div class="px-2 py-1">
				{#each groupedMails as group}
					<!-- Date group header - Linear style -->
					<div class="px-3 pt-6 pb-2">
						<span class="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
							{group.label}
						</span>
					</div>

					<!-- Mails in group -->
					{#each group.mails as mail}
						<ContextMenu.Root>
							<ContextMenu.Trigger>
								<button
									class={cn(
										'group relative flex w-full items-start gap-3 text-left transition-colors duration-150 border-b border-zinc-50',
										'px-5 py-4',
										mail.id === selectedMailId
											? 'bg-zinc-50'
											: 'hover:bg-zinc-50/50'
									)}
									onclick={() => onSelectMail(mail.id)}
								>
									<!-- Unread blue border indicator - absolute positioned -->
									{#if mail.unread && mail.id !== selectedMailId}
										<div class="absolute left-0 top-0 bottom-0 w-[2px] bg-blue-500"></div>
									{/if}

									<!-- Content -->
									<div class="flex-1 min-w-0 flex flex-col gap-1">
										<!-- Row 1: Sender + Time -->
										<div class="flex items-baseline justify-between gap-2">
											<span
												class={cn(
													'truncate text-[13px]',
													mail.unread && mail.id !== selectedMailId
														? 'font-semibold text-zinc-900'
														: 'font-medium text-zinc-600'
												)}
											>
												{mail.from_name}
											</span>
											<span class="text-[11px] text-zinc-400 font-normal tabular-nums shrink-0">
												{formatMailTime(mail.timestamp)}
											</span>
										</div>

										<!-- Row 2: Subject -->
										<div class={cn(
											'truncate text-[13px]',
											mail.unread && mail.id !== selectedMailId
												? 'text-zinc-900'
												: 'text-zinc-500'
										)}>
											{mail.subject}
										</div>

										<!-- Row 3: Preview -->
										<p class="line-clamp-1 text-[12px] text-zinc-400 leading-relaxed">
											{mail.preview}
										</p>
									</div>

									<!-- Attachment indicator -->
									{#if mail.has_attachments}
										<div class="flex-shrink-0 pt-1">
											<Paperclip class="size-3.5 text-zinc-300" strokeWidth={1.5} />
										</div>
									{/if}
								</button>
							</ContextMenu.Trigger>

							<ContextMenu.Content>
								<!-- Mark Read/Unread -->
								{#if mail.unread}
									<ContextMenu.Item onclick={() => onMarkRead?.(mail, true)}>
										<MailOpen class="size-4 text-zinc-500" strokeWidth={1.5} />
										Mark as Read
									</ContextMenu.Item>
								{:else}
									<ContextMenu.Item onclick={() => onMarkRead?.(mail, false)}>
										<MailIcon class="size-4 text-zinc-500" strokeWidth={1.5} />
										Mark as Unread
									</ContextMenu.Item>
								{/if}

								<ContextMenu.Separator />

								<!-- Archive -->
								<ContextMenu.Item onclick={() => onArchive?.(mail)}>
									<Archive class="size-4 text-zinc-500" strokeWidth={1.5} />
									{mail.folder === 'archive' ? 'Move to Inbox' : 'Archive'}
								</ContextMenu.Item>

								<!-- Move to... -->
								<ContextMenu.Sub>
									<ContextMenu.SubTrigger>
										<FolderInput class="size-4 text-zinc-500" strokeWidth={1.5} />
										Move to...
									</ContextMenu.SubTrigger>
									<ContextMenu.SubContent>
										{#if mail.folder !== 'inbox'}
											<ContextMenu.Item onclick={() => onMoveTo?.(mail, 'inbox')}>
												<Inbox class="size-4 text-zinc-500" strokeWidth={1.5} />
												Inbox
											</ContextMenu.Item>
										{/if}
										{#if mail.folder !== 'sent'}
											<ContextMenu.Item onclick={() => onMoveTo?.(mail, 'sent')}>
												<Send class="size-4 text-zinc-500" strokeWidth={1.5} />
												Sent
											</ContextMenu.Item>
										{/if}
										{#if mail.folder !== 'drafts'}
											<ContextMenu.Item onclick={() => onMoveTo?.(mail, 'drafts')}>
												<FileText class="size-4 text-zinc-500" strokeWidth={1.5} />
												Drafts
											</ContextMenu.Item>
										{/if}
										{#if mail.folder !== 'archive'}
											<ContextMenu.Item onclick={() => onMoveTo?.(mail, 'archive')}>
												<Archive class="size-4 text-zinc-500" strokeWidth={1.5} />
												Archive
											</ContextMenu.Item>
										{/if}
										{#if mail.folder !== 'trash'}
											<ContextMenu.Item onclick={() => onMoveTo?.(mail, 'trash')}>
												<Trash2 class="size-4 text-zinc-500" strokeWidth={1.5} />
												Trash
											</ContextMenu.Item>
										{/if}
									</ContextMenu.SubContent>
								</ContextMenu.Sub>

								<ContextMenu.Separator />

								<!-- Delete -->
								<ContextMenu.Item class="text-red-500 data-[highlighted]:text-red-600" onclick={() => onDelete?.(mail)}>
									<Trash2 class="size-4" strokeWidth={1.5} />
									Delete
								</ContextMenu.Item>
							</ContextMenu.Content>
						</ContextMenu.Root>
					{/each}
				{/each}
			</div>
		{/if}
	</ScrollArea>
</div>
