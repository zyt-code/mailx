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
	import { hasOpenModal } from '$lib/stores/modalStore.js';

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

	const DENSITY_CHAR_LIMITS = {
		compact: { subject: 28, preview: 36 },
		comfortable: { subject: 44, preview: 64 },
		airy: { subject: 64, preview: 108 }
	};

	const ACCOUNT_COLOR_SWATCHES = ['#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#10b981', '#06b6d4', '#ef4444', '#6366f1'];

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
	let showAccountColor = $state(true);
	let isModalOpen = $state(false);

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
			showAccountColor = value.appearance.showAccountColor;
		});
		return unsub;
	});

	$effect(() => {
		const unsub = hasOpenModal.subscribe((value) => {
			isModalOpen = value;
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

	function getFirstLine(value: string): string {
		const firstLine = value.split('\n')[0] ?? '';
		return firstLine.replace(/\s+/g, ' ').trim();
	}

	function truncate(value: string, limit: number): string {
		const clean = value.trim();
		if (clean.length <= limit) return clean;
		return `${clean.slice(0, Math.max(0, limit - 1)).trimEnd()}…`;
	}

	function buildSubjectPreview(mail: Mail): string {
		const fallbackSubject = mail.subject || $_('mail.noSubject');
		return truncate(fallbackSubject, DENSITY_CHAR_LIMITS[mailDensity].subject);
	}

	function buildBodyPreview(mail: Mail): string {
		const firstLine = getFirstLine(mail.preview || '');
		if (!firstLine) return $_('mail.noPreview');
		return truncate(firstLine, DENSITY_CHAR_LIMITS[mailDensity].preview);
	}

	function hashString(input: string): number {
		let hash = 0;
		for (let i = 0; i < input.length; i++) {
			hash = ((hash << 5) - hash) + input.charCodeAt(i);
			hash |= 0;
		}
		return hash;
	}

	function getAccountMarkerColor(mail: Mail): string {
		if (!showAccountColor) return 'var(--accent-primary)';
		const key = mail.account_id || mail.from_email || 'default';
		const index = Math.abs(hashString(key)) % ACCOUNT_COLOR_SWATCHES.length;
		return ACCOUNT_COLOR_SWATCHES[index];
	}
</script>

<div
	class="flex h-full flex-col bg-[var(--bg-primary)] text-[var(--text-primary)] select-none overflow-hidden shrink-0 border-r border-[var(--border-primary)] [-webkit-user-select:none] [user-select:none] dark:bg-[var(--bg-primary)] dark:text-[var(--text-primary)] dark:border-[var(--border-primary)]"
	style:width={width !== undefined ? `${width}px` : undefined}
	class:w-full={width === undefined}
>
	<div
		class={cn(
			"mail-search-header sticky top-0 z-0 shrink-0 border-b border-[var(--border-primary)] bg-[var(--bg-primary)] px-3 py-2 dark:bg-[var(--bg-primary)] dark:border-[var(--border-primary)]",
			isModalOpen && "pointer-events-none"
		)}
		data-testid="mail-search-bar"
		data-modal-obscured={isModalOpen}
		aria-hidden={isModalOpen}
	>
		<div
			class={cn(
				"mail-search-shell flex items-center gap-2 rounded-2xl px-3 py-2",
				isModalOpen && "opacity-70"
			)}
		>
			<Search class={cn(
				"size-4 shrink-0 transition-colors duration-200",
				isAccountConfigured && !isModalOpen ? "text-zinc-500 dark:text-gray-500" : "text-[var(--text-quaternary)]"
			)} strokeWidth={1.8} />
			<input
				type="text"
				placeholder={$_('mail.searchFolder', { values: { folder: folderLabels[activeFolder] } })}
				disabled={!isAccountConfigured || isModalOpen}
				class={cn(
					"mail-search-input flex-1 bg-transparent text-[13px] outline-none placeholder:text-[var(--text-tertiary)] transition-colors duration-150",
					isAccountConfigured && !isModalOpen
						? "text-[var(--text-primary)]"
						: "text-[var(--text-quaternary)] cursor-not-allowed placeholder:text-[var(--text-quaternary)]"
				)}
				bind:value={searchQuery}
			/>
		</div>
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
					{@const subjectPreview = buildSubjectPreview(mail)}
					{@const bodyPreview = buildBodyPreview(mail)}
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
									<!-- Unread marker (account color aware) -->
									<div
										class={cn(
											'absolute left-[0.45rem] top-[0.5rem] bottom-[0.5rem] w-[3px] rounded-r-sm transition-colors duration-150',
											isUnread && !isSelected ? 'opacity-100' : 'opacity-0'
										)}
										style={`background:${getAccountMarkerColor(mail)};`}
									></div>

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
													{subjectPreview}
												</span>
												<span class={cn(
													'text-[11px] leading-5 tabular-nums shrink-0',
													isSelected ? 'text-[var(--accent-primary)]' : 'text-[var(--text-tertiary)]'
												)}>
													{formatMailTime(mail.timestamp)}
												</span>
											</div>

											{#if showPreviewSnippets}
												<p class={cn(
													'mail-preview truncate text-[12px] leading-5',
													isSelected ? 'text-[var(--text-secondary)]' : 'text-[var(--text-tertiary)]'
												)}>
													{bodyPreview}
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

<style>
	.mail-search-header {
		overflow: visible;
	}

	.mail-search-shell {
		width: 100%;
		border: 1px solid color-mix(in srgb, rgb(228 228 231) 84%, transparent);
		background:
			linear-gradient(135deg, rgba(255, 255, 255, 0.82), rgba(244, 244, 245, 0.76));
		box-shadow:
			0 10px 20px rgba(15, 23, 42, 0.06),
			inset 0 1px 0 rgba(255, 255, 255, 0.6);
		backdrop-filter: blur(12px) saturate(122%);
		transition:
			width 300ms cubic-bezier(0.4, 0, 0.2, 1),
			transform 300ms cubic-bezier(0.4, 0, 0.2, 1),
			box-shadow 240ms cubic-bezier(0.4, 0, 0.2, 1),
			border-color 220ms cubic-bezier(0.4, 0, 0.2, 1),
			background-color 220ms cubic-bezier(0.4, 0, 0.2, 1);
	}

	.mail-search-shell:focus-within {
		width: calc(100% + 20px);
		transform: translate3d(-10px, 0, 0);
		border-color: color-mix(in srgb, var(--border-primary) 82%, rgba(59, 130, 246, 0.12));
		box-shadow:
			0 16px 28px rgba(15, 23, 42, 0.08),
			0 0 0 1px rgba(255, 255, 255, 0.25);
	}

	.mail-search-input {
		min-width: 0;
	}

	.mail-search-input::placeholder {
		color: var(--text-tertiary);
	}

	:global(.dark) .mail-search-shell {
		border-color: rgba(63, 63, 70, 0.82);
		background:
			linear-gradient(135deg, rgba(31, 41, 55, 0.52), rgba(17, 24, 39, 0.44));
		box-shadow:
			0 18px 30px rgba(2, 6, 23, 0.28),
			inset 0 1px 0 rgba(255, 255, 255, 0.04);
		backdrop-filter: blur(14px) saturate(124%);
	}

	:global(.dark) .mail-search-shell:focus-within {
		border-color: rgba(82, 82, 91, 0.95);
		box-shadow:
			0 20px 34px rgba(2, 6, 23, 0.34),
			0 0 0 1px rgba(255, 255, 255, 0.04);
	}
</style>
