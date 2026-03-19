<script lang="ts">
	import { cn } from '$lib/utils.js';
	import * as ContextMenu from '$lib/components/ui/context-menu/index.js';
	import { Search, Paperclip, MailOpen, Mail as MailIcon, Archive, Trash2, FolderInput, Inbox, Send, FileText } from 'lucide-svelte';
	import type { Mail, Folder, Account } from '$lib/types.js';
	import { accounts } from '$lib/stores/accountStore.js';
	import { displayedEmails, activeFolder as storeActiveFolder, markMailReadLocally } from '$lib/stores/mailStore.js';
	import { markMailAsRead } from '$lib/db/index.js';

	interface Props {
		selectedMailId: string | null;
		onSelectMail: (id: string) => void;
		onMarkRead?: (mail: Mail, read: boolean) => void;
		onDelete?: (mail: Mail) => void;
		onArchive?: (mail: Mail) => void;
		onMoveTo?: (mail: Mail, folder: Folder) => void;
		width: number | undefined;
		isAccountConfigured?: boolean;
		isSyncing?: boolean;
	}

	let { selectedMailId, onSelectMail, onMarkRead, onDelete, onArchive, onMoveTo, width, isAccountConfigured = true, isSyncing = false }: Props = $props();

	// Get all accounts for account indicators
	let allAccounts = $state<Account[]>([]);

	$effect(() => {
		const unsub = accounts.subscribe((accs) => {
			allAccounts = accs;
		});
		return unsub;
	});

	// Use displayedEmails from mailStore (already filtered by folder and account)
	let displayedMails = $state<Mail[]>([]);

	$effect(() => {
		const unsub = displayedEmails.subscribe((mails) => {
			displayedMails = mails;
		});
		return unsub;
	});

	// Get activeFolder from store for label display
	let activeFolder: Folder = $state('inbox');

	$effect(() => {
		const unsub = storeActiveFolder.subscribe((folder) => {
			activeFolder = folder;
		});
		return unsub;
	});

	let searchQuery = $state('');

	let filteredMails = $derived(
		searchQuery.trim()
			? displayedMails.filter((m) => {
					const q = searchQuery.toLowerCase();
					return (
						m.from_name.toLowerCase().includes(q) ||
						m.from_email.toLowerCase().includes(q) ||
						m.subject.toLowerCase().includes(q) ||
						m.preview.toLowerCase().includes(q)
					);
				})
			: displayedMails
	);

	// No date grouping - flat list like Apple Mail
	let flatMails = $derived(filteredMails);

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

	// Get account color for a mail based on account_id
	function getAccountColor(mail: Mail): string {
		if (!mail.account_id) return 'bg-zinc-300';
		const colors = [
			'bg-blue-500',
			'bg-green-500',
			'bg-purple-500',
			'bg-orange-500',
			'bg-pink-500',
			'bg-teal-500',
			'bg-cyan-500',
			'bg-red-500'
		];
		// Use account_id to generate consistent color
		let hash = 0;
		for (let i = 0; i < mail.account_id.length; i++) {
			hash = mail.account_id.charCodeAt(i) + ((hash << 5) - hash);
		}
		return colors[Math.abs(hash) % colors.length];
	}

	// Get account for a mail
	function getAccountForMail(mail: Mail): Account | undefined {
		if (!mail.account_id) return undefined;
		return allAccounts.find((acc) => acc.id === mail.account_id);
	}

	// Check if multiple accounts exist
	let hasMultipleAccounts = $derived(allAccounts.length > 1);

	// Handle mail selection with server read sync
	function handleSelectMail(mailId: string) {
		// Step 1: UI feedback — highlight immediately
		onSelectMail(mailId);

		const mail = displayedMails.find((m) => m.id === mailId);
		if (!mail) return;

		const wasUnread = !(mail.is_read ?? false);

		if (wasUnread) {
			// Step 2: Local optimistic update
			markMailReadLocally(mailId);

			// Step 3: Background sync — fire and forget
			if (mail.account_id && typeof mail.uid === 'number') {
				markMailAsRead(mail.uid, mail.account_id).catch((error) => {
					console.error('[MailList] Failed to sync read status:', error);
				});
			} else {
				console.warn('[MailList] Missing account_id or uid, skipping server sync', {
					accountId: mail.account_id,
					uid: mail.uid
				});
			}
		}
	}
</script>

<div
	class="flex h-full flex-col bg-white select-none overflow-hidden shrink-0 border-r border-zinc-100 [-webkit-user-select:none] [user-select:none]"
	style:width={width !== undefined ? `${width}px` : undefined}
	class:w-full={width === undefined}
>
	<!-- Search - Notion Quick Find style -->
	<div class="flex items-center gap-2 px-4 py-2.5 border-b border-zinc-100 shrink-0 sticky top-0 bg-white z-10">
		<Search class={cn(
			"size-4 shrink-0",
			isAccountConfigured ? "text-zinc-300" : "text-zinc-200"
		)} strokeWidth={1.5} />
		<input
			type="text"
			placeholder="Search {folderLabels[activeFolder].toLowerCase()}..."
			disabled={!isAccountConfigured}
			class={cn(
				"flex-1 bg-transparent text-[13px] outline-none placeholder:text-zinc-400 transition-colors duration-75 rounded-md px-2 -mx-2",
				isAccountConfigured
					? "text-zinc-900 focus:bg-zinc-100/50"
					: "text-zinc-300 cursor-not-allowed placeholder:text-zinc-300"
			)}
			bind:value={searchQuery}
		/>
	</div>

	<!-- Sync loading bar -->
	{#if isSyncing}
		<div class="shrink-0 h-[2px] w-full bg-zinc-100 overflow-hidden">
			<div class="h-full w-1/3 bg-blue-500 rounded-full animate-[shimmer_1.5s_ease-in-out_infinite]"></div>
		</div>
	{/if}

	<!-- Mail items - independent scroll -->
	<div class="flex-1 overflow-y-auto min-h-0">
		{#if filteredMails.length === 0}
			<div class="flex flex-col items-center justify-center px-6 py-16">
				<p class="text-[13px] text-zinc-400">No emails found</p>
			</div>
		{:else}
			<div class="px-2 py-1">
				{#each flatMails as mail}
					{@const isSelected = mail.id === selectedMailId}
					{@const isUnread = !(mail.is_read ?? false)}
					<ContextMenu.Root>
						<ContextMenu.Trigger>
							<button
								class={cn(
									'relative flex w-full items-center text-left select-none [-webkit-user-select:none] [user-select:none] cursor-default mx-2 my-1 rounded-lg',
									isSelected
										? 'bg-[#007AFF] text-white'
										: 'bg-white hover:bg-zinc-50'
								)}
								style="height: 92px; padding-left: 2.5rem; padding-right: 1rem; padding-top: 0.5rem; padding-bottom: 0.5rem;"
								onclick={() => handleSelectMail(mail.id)}
							>
								<!-- Unread blue dot - only show when not selected -->
								{#if isUnread && !isSelected}
									<div class="absolute left-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[#007AFF]"></div>
								{/if}

									<!-- Account indicator dot (when multiple accounts) -->
									{#if hasMultipleAccounts && mail.account_id}
										<div class="flex-shrink-0 mr-2">
											<div
												class={cn(
													'size-2 rounded-full',
													getAccountColor(mail),
													isSelected && 'opacity-70'
												)}
												title={getAccountForMail(mail)?.email || 'Unknown account'}
											></div>
										</div>
									{/if}

									<!-- Content - fixed height container -->
									<div class="flex-1 min-w-0 flex flex-col justify-center h-full overflow-hidden">
										<!-- Top: Sender + Time -->
										<div class="flex items-baseline justify-between gap-2 overflow-hidden">
											<span
												class={cn(
													'truncate text-[13px]',
													isSelected
														? 'text-white font-bold'
														: isUnread
															? 'font-bold text-zinc-900'
															: 'font-normal text-zinc-500'
												)}
											>
												{mail.from_name}
											</span>
											<span class={cn(
												'text-[11px] tabular-nums shrink-0',
												isSelected ? 'text-white' : 'text-zinc-400'
											)}>
												{formatMailTime(mail.timestamp)}
											</span>
										</div>

										<!-- Middle: Subject - single line truncate -->
										<div class="overflow-hidden">
											<span class={cn(
												'block truncate text-[13px]',
												isSelected
													? 'text-white font-bold'
													: isUnread
														? 'font-bold text-zinc-900'
														: 'font-normal text-zinc-500'
											)}>
												{mail.subject}
											</span>
										</div>

										<!-- Bottom: Preview snippet - always 2 lines height -->
										<div class="overflow-hidden">
											<p class={cn(
												'line-clamp-2 text-[12px] leading-tight',
												isSelected ? 'text-white' : 'text-zinc-400'
											)}>
												{mail.preview || ' '}
											</p>
										</div>
									</div>

									<!-- Attachment indicator -->
									{#if mail.has_attachments}
										<div class="flex-shrink-0 mx-3">
											<Paperclip class={cn(
												'size-3.5',
												isSelected ? 'text-white' : 'text-zinc-300'
											)} strokeWidth={1.5} />
										</div>
									{/if}
								</button>
							</ContextMenu.Trigger>

							<ContextMenu.Content>
								<!-- Mark Read/Unread -->
								{#if !(mail.is_read ?? false)}
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
			</div>
		{/if}
	</div>
</div>
