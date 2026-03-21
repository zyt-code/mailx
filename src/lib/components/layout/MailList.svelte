<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { VList } from 'virtua/svelte';
	import { cn } from '$lib/utils.js';
	import * as ContextMenu from '$lib/components/ui/context-menu/index.js';
	import { Search, Paperclip, MailOpen, Mail as MailIcon, Archive, Trash2, FolderInput, Inbox, Send, FileText } from 'lucide-svelte';
	import type { Mail, Folder } from '$lib/types.js';
	import {
		displayedEmails,
		activeFolder as storeActiveFolder,
		markMailReadLocally,
		selectedAccountId as selectedAccountFilterId,
		isLoadingMore as storeIsLoadingMore,
		hasMore as storeHasMore,
		loadMoreMails
	} from '$lib/stores/mailStore.js';
	import { markMailAsRead } from '$lib/db/index.js';
	import { preferences } from '$lib/stores/preferencesStore.js';

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

	const ESTIMATED_HEIGHTS = {
		compact: 68,
		comfortable: 82,
		airy: 96
	};

	let { selectedMailId, onSelectMail, onMarkRead, onDelete, onArchive, onMoveTo, width, isAccountConfigured = true, isSyncing = false }: Props = $props();

	// State
	let displayedMails = $state<Mail[]>([]);
	let currentSelectedAccountId = $state<string | null>(null);
	let activeFolder: Folder = $state('inbox');
	let searchQuery = $state('');
	let isLoadingMore = $state(false);
	let canLoadMore = $state(true);

	// Appearance preferences
	let mailDensity = $state<'compact' | 'comfortable' | 'airy'>('comfortable');
	let showPreviewSnippets = $state(true);

	// Subscriptions
	$effect(() => {
		const unsub = displayedEmails.subscribe((mails) => {
			displayedMails = mails;
		});
		return unsub;
	});

	$effect(() => {
		const unsub = preferences.subscribe((value) => {
			mailDensity = value.appearance.mailDensity;
			showPreviewSnippets = value.appearance.showPreviewSnippets;
		});
		return unsub;
	});

	$effect(() => {
		const unsub = selectedAccountFilterId.subscribe((accountId) => {
			currentSelectedAccountId = accountId;
		});
		return unsub;
	});

	$effect(() => {
		const unsub = storeActiveFolder.subscribe((folder) => {
			activeFolder = folder;
		});
		return unsub;
	});

	$effect(() => {
		const unsub = storeIsLoadingMore.subscribe((v) => {
			isLoadingMore = v;
		});
		return unsub;
	});

	$effect(() => {
		const unsub = storeHasMore.subscribe((v) => {
			canLoadMore = v;
		});
		return unsub;
	});

	// Derived
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

	// Logic
	const folderLabels = $derived<Record<Folder, string>>({
		inbox: $_('nav.inbox'),
		sent: $_('nav.sent'),
		drafts: $_('nav.drafts'),
		trash: $_('nav.trash'),
		archive: $_('nav.archive')
	});

	function formatMailTime(timestamp: number): string {
		const now = new Date();
		const mailDate = new Date(timestamp);
		const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		const mailDay = new Date(mailDate.getFullYear(), mailDate.getMonth(), mailDate.getDate());
		const diffDays = Math.floor((today.getTime() - mailDay.getTime()) / 86400000);

		if (diffDays === 0) {
			return mailDate.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true });
		} else if (diffDays === 1) {
			return $_('mail.yesterday');
		} else if (diffDays < 7) {
			return mailDate.toLocaleDateString(undefined, { weekday: 'short' });
		}
		return mailDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
	}

	let vlistRef = $state<{ getScrollOffset: () => number; getScrollSize: () => number; getViewportSize: () => number } | null>(null);

	function handleSelectMail(mailId: string) {
		onSelectMail(mailId);
		const mail = displayedMails.find((m) => m.id === mailId);
		if (!mail) return;
		if (!(mail.is_read ?? false)) {
			markMailReadLocally(mailId);
			if (mail.account_id && typeof mail.uid === 'number') {
				markMailAsRead(mail.uid, mail.account_id).catch((error) => {
					console.error('[MailList] Failed to sync read status:', error);
				});
			}
		}
	}

	function handleScroll(offset: number) {
		if (!canLoadMore || isLoadingMore || searchQuery.trim() || !vlistRef) return;
		const scrollSize = vlistRef.getScrollSize();
		const viewportSize = vlistRef.getViewportSize();
		// Trigger load when within 300px of the bottom
		if (scrollSize - offset - viewportSize < 300) {
			void loadMoreMails();
		}
	}

	function maybeLoadMore() {
		if (!canLoadMore || isLoadingMore || searchQuery.trim()) return;
		void loadMoreMails();
	}
</script>

<div
	class="flex h-full flex-col bg-[var(--bg-primary)] select-none overflow-hidden shrink-0 border-r border-[var(--border-primary)] [-webkit-user-select:none] [user-select:none]"
	style:width={width !== undefined ? `${width}px` : undefined}
	class:w-full={width === undefined}
>
	<div class="flex items-center gap-2 px-3 py-2 border-b border-[var(--border-primary)] shrink-0 sticky top-0 bg-[var(--bg-primary)] z-10">
		<Search class={cn(
			"size-4 shrink-0",
			isAccountConfigured ? "text-[var(--text-tertiary)]" : "text-[var(--text-quaternary)]"
		)} strokeWidth={1.8} />
		<input
			type="text"
			placeholder={$_('mail.searchFolder', { values: { folder: folderLabels[activeFolder] } })}
			disabled={!isAccountConfigured}
			class={cn(
				"flex-1 bg-transparent text-[13px] outline-none placeholder:text-[var(--text-tertiary)] transition-colors duration-150 rounded-md px-2 -mx-2",
				isAccountConfigured
					? "text-[var(--text-primary)] focus:bg-[var(--bg-secondary)]"
					: "text-[var(--text-quaternary)] cursor-not-allowed placeholder:text-[var(--text-quaternary)]"
			)}
			bind:value={searchQuery}
		/>
	</div>

	{#if isSyncing}
		<div class="shrink-0 h-[1px] w-full bg-[var(--border-primary)] overflow-hidden">
			<div class="h-full w-1/4 bg-[var(--accent-primary)] animate-shimmer"></div>
		</div>
	{/if}

	<div class="flex-1 min-h-0">
		{#if filteredMails.length === 0}
			<div class="flex flex-col items-center justify-center px-6 py-16">
				<p class="text-[13px] text-[var(--text-tertiary)]">{$_('mail.noEmails')}</p>
			</div>
		{:else}
			<VList
				bind:this={vlistRef}
				data={filteredMails}
				style="height: 100%;"
				getKey={(mail: Mail) => mail.id}
				itemSize={ESTIMATED_HEIGHTS[mailDensity]}
				bufferSize={200}
				onscroll={handleScroll}
				onscrollend={maybeLoadMore}
			>
				{#snippet children(mail: Mail, index: number)}
					{@const isSelected = mail.id === selectedMailId}
					{@const isUnread = !(mail.is_read ?? false)}
					<div class="px-2 py-1">
						<ContextMenu.Root>
							<ContextMenu.Trigger>
								<button
									class={cn(
										'mail-item relative flex w-full items-stretch overflow-hidden rounded-xl border text-left select-none [-webkit-user-select:none] [user-select:none] cursor-default transition-all duration-120 shadow-[var(--shadow-xs)]',
										mailDensity === 'compact' && 'h-[68px] py-2',
										mailDensity === 'comfortable' && 'h-[82px] py-3',
										mailDensity === 'airy' && 'h-[96px] py-3.5',
										isSelected
											? 'border-[var(--accent-muted)] bg-[var(--bg-selected)] shadow-[var(--shadow-sm)]'
											: 'border-transparent hover:border-[var(--border-secondary)] hover:bg-[var(--bg-hover)]'
									)}
									onclick={() => handleSelectMail(mail.id)}
								>
									<!-- Unread accent bar — left edge, inside card border-radius -->
									<div class={cn(
										'shrink-0 w-[3px] rounded-r-sm self-stretch transition-colors duration-150',
										mailDensity === 'compact' ? 'mx-2' : 'mx-2.5',
										isUnread && !isSelected
											? 'bg-[var(--accent-primary)]'
											: 'bg-transparent'
									)}></div>

									<div class={cn(
										'flex min-w-0 flex-1 flex-col justify-between overflow-hidden',
										mailDensity === 'compact' ? 'pr-3' : mailDensity === 'comfortable' ? 'pr-3.5' : 'pr-4'
									)}>
											<div class="flex items-start justify-between gap-3">
												<span
													class={cn(
														'truncate text-[13px] leading-5',
														isSelected
															? 'text-[var(--accent-primary)] font-semibold'
															: isUnread
																? 'font-semibold text-[var(--text-primary)]'
																: 'font-medium text-[var(--text-secondary)]'
													)}
												>
													{mail.from_name || mail.from_email}
												</span>
												<span class={cn(
													'text-[11px] leading-5 tabular-nums shrink-0',
													isSelected ? 'text-[var(--accent-primary)]' : 'text-[var(--text-tertiary)]'
												)}>
													{formatMailTime(mail.timestamp)}
												</span>
											</div>

											<div class="min-w-0">
												<span class={cn(
													'block truncate text-[13px] leading-5',
													isSelected
														? 'text-[var(--text-primary)] font-semibold'
														: isUnread
															? 'font-semibold text-[var(--text-primary)]'
															: 'font-medium text-[var(--text-secondary)]'
												)}>
													{mail.subject}
												</span>
											</div>

											{#if showPreviewSnippets}
												<p class={cn(
													mailDensity === 'compact' ? 'line-clamp-1' : 'line-clamp-2',
													'text-[12px] leading-5',
													isSelected ? 'text-[var(--text-secondary)]' : 'text-[var(--text-tertiary)]'
												)}>
													{mail.preview || $_('mail.noPreview')}
												</p>
											{/if}
										</div>

									{#if mail.has_attachments}
										<div class="flex shrink-0 items-start pt-1">
											<Paperclip class={cn(
												'size-3.5',
												isSelected ? 'text-[var(--accent-primary)]' : 'text-[var(--text-quaternary)]'
											)} strokeWidth={1.8} />
										</div>
									{/if}
								</button>
							</ContextMenu.Trigger>

							<ContextMenu.Content>
								{#if !(mail.is_read ?? false)}
									<ContextMenu.Item onclick={() => onMarkRead?.(mail, true)}>
										<MailOpen class="size-4 text-[var(--text-tertiary)]" strokeWidth={1.5} />
										{$_('mail.markRead')}
									</ContextMenu.Item>
								{:else}
									<ContextMenu.Item onclick={() => onMarkRead?.(mail, false)}>
										<MailIcon class="size-4 text-[var(--text-tertiary)]" strokeWidth={1.5} />
										{$_('mail.markUnread')}
									</ContextMenu.Item>
								{/if}

								<ContextMenu.Separator />

								<ContextMenu.Item onclick={() => onArchive?.(mail)}>
									<Archive class="size-4 text-[var(--text-tertiary)]" strokeWidth={1.5} />
									{mail.folder === 'archive' ? $_('mail.unarchive') : $_('mail.archive')}
								</ContextMenu.Item>

								<ContextMenu.Sub>
									<ContextMenu.SubTrigger>
										<FolderInput class="size-4 text-[var(--text-tertiary)]" strokeWidth={1.5} />
										{$_('mail.moveTo')}...
									</ContextMenu.SubTrigger>
									<ContextMenu.SubContent>
										{#if mail.folder !== 'inbox'}
											<ContextMenu.Item onclick={() => onMoveTo?.(mail, 'inbox')}>
												<Inbox class="size-4 text-[var(--text-tertiary)]" strokeWidth={1.5} />
												{$_('nav.inbox')}
											</ContextMenu.Item>
										{/if}
										{#if mail.folder !== 'sent'}
											<ContextMenu.Item onclick={() => onMoveTo?.(mail, 'sent')}>
												<Send class="size-4 text-[var(--text-tertiary)]" strokeWidth={1.5} />
												{$_('nav.sent')}
											</ContextMenu.Item>
										{/if}
										{#if mail.folder !== 'drafts'}
											<ContextMenu.Item onclick={() => onMoveTo?.(mail, 'drafts')}>
												<FileText class="size-4 text-[var(--text-tertiary)]" strokeWidth={1.5} />
												{$_('nav.drafts')}
											</ContextMenu.Item>
										{/if}
										{#if mail.folder !== 'archive'}
											<ContextMenu.Item onclick={() => onMoveTo?.(mail, 'archive')}>
												<Archive class="size-4 text-[var(--text-tertiary)]" strokeWidth={1.5} />
												{$_('nav.archive')}
											</ContextMenu.Item>
										{/if}
										{#if mail.folder !== 'trash'}
											<ContextMenu.Item onclick={() => onMoveTo?.(mail, 'trash')}>
												<Trash2 class="size-4 text-[var(--text-tertiary)]" strokeWidth={1.5} />
												{$_('nav.trash')}
											</ContextMenu.Item>
										{/if}
									</ContextMenu.SubContent>
								</ContextMenu.Sub>

								<ContextMenu.Separator />

								<ContextMenu.Item class="text-red-500 data-[highlighted]:text-red-600" onclick={() => onDelete?.(mail)}>
									<Trash2 class="size-4" strokeWidth={1.5} />
									{$_('mail.delete')}
								</ContextMenu.Item>
							</ContextMenu.Content>
						</ContextMenu.Root>
					</div>
				{/snippet}
			</VList>
			{#if isLoadingMore}
				<div class="flex items-center justify-center py-4 shrink-0">
					<div class="size-4 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin"></div>
				</div>
			{/if}
		{/if}
	</div>
</div>

