<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { ArrowLeft, Mail as MailIcon } from 'lucide-svelte';
	import type { Mail } from '$lib/types.js';
	import { MailHeader, MailActions, EmailRenderer } from '$lib/components/mail/index.js';
	import { ComposeModal } from '$lib/components/compose/index.js';
	import * as db from '$lib/db/index.js';
	import { createReadingPaneMailActions } from './readingPaneMailActions.js';
	import {
		createReadingPaneComposeState,
		type ReadingPaneComposeMode
	} from './readingPaneComposeState.js';

	interface Props {
		mail: Mail | null;
		isMobile: boolean;
		onBack: () => void;
		onRefresh?: () => void;
		onRemoveMail?: (mail: Mail) => void;
	}

	let { mail, isMobile, onBack, onRefresh, onRemoveMail }: Props = $props();

	let showCompose = $state(false);
	let composeMode = $state<ReadingPaneComposeMode>(null);
	let composeMail = $state<Mail | null>(null);
	let resolvedMail = $state<Mail | null>(null);
	let isLoadingContent = $state(false);
	let contentError = $state<string | null>(null);
	let contentRequestToken = 0;

	let activeMail = $derived(resolvedMail ?? mail);

	const mailActions = createReadingPaneMailActions({
		db,
		onMailRemoved: (mail) => onRemoveMail?.(mail),
		onRefresh: () => onRefresh?.()
	});
	const composeState = createReadingPaneComposeState({
		getMail: () => activeMail,
		setShowCompose: (value) => {
			showCompose = value;
		},
		setComposeMode: (value) => {
			composeMode = value;
		},
		setComposeMail: (value) => {
			composeMail = value;
		},
		onRefresh: () => onRefresh?.()
	});

	async function loadRemoteContent(nextMail: Mail): Promise<void> {
		const requestToken = ++contentRequestToken;
		isLoadingContent = true;
		contentError = null;

		try {
			const loadedMail = await db.ensureMailContent(nextMail.id);
			if (requestToken !== contentRequestToken) {
				return;
			}
			resolvedMail = loadedMail;
		} catch (error) {
			if (requestToken !== contentRequestToken) {
				return;
			}
			contentError = error instanceof Error ? error.message : String(error);
		} finally {
			if (requestToken === contentRequestToken) {
				isLoadingContent = false;
			}
		}
	}

	$effect(() => {
		resolvedMail = mail;
		contentError = null;

		if (!mail) {
			isLoadingContent = false;
			return;
		}

		if (mail.content_state === 'body_cached' || !!mail.body || !!mail.html_body) {
			isLoadingContent = false;
			return;
		}

		void loadRemoteContent(mail);
	});
</script>

<div class="reading-pane flex flex-1 min-w-0 h-full bg-[var(--bg-primary)] overflow-hidden">
	{#if activeMail}
		<div class="flex flex-1 flex-col min-h-0 overflow-hidden">
			{#if isMobile}
				<div class="flex items-center border-b border-[var(--border-primary)] px-3 py-2">
					<button onclick={onBack} class="flex size-7 items-center justify-center rounded-md text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]" aria-label={$_('mail.backToList')}>
						<ArrowLeft class="size-[17px]" strokeWidth={1.8} />
					</button>
				</div>
			{/if}

			<!-- Mail header -->
			<div class="shrink-0">
				<MailHeader mail={activeMail} />
			</div>

			<!-- Mail actions toolbar - stays fixed at top -->
			<div class="shrink-0 border-b border-[var(--border-primary)]">
				<MailActions
					mail={activeMail}
					onReply={composeState.openReply}
					onReplyAll={composeState.openReplyAll}
					onForward={composeState.openForward}
					onArchive={mailActions.archiveMail}
					onUnarchive={mailActions.archiveMail}
					onDelete={mailActions.deleteMail}
					onToggleStar={mailActions.toggleStar}
				/>
			</div>

			<!-- Email body - independent scroll, rendered in isolated iframe -->
			<div class="reading-scroll-region flex-1 overflow-y-auto min-h-0">
				<div class="reading-content select-text cursor-text" data-allow-context-menu>
					{#if isLoadingContent && !activeMail.body && !activeMail.html_body}
						<div class="flex min-h-40 items-center justify-center text-sm text-[var(--text-tertiary)]">
							{$_('loading')}
						</div>
					{:else}
						<EmailRenderer htmlBody={activeMail.html_body} plainBody={activeMail.body} />
					{/if}
					{#if contentError}
						<p class="px-4 py-3 text-sm text-[var(--text-tertiary)]">{contentError}</p>
					{/if}
				</div>
			</div>
		</div>
	{:else}
		<!-- Empty State -->
		<div class="flex h-full w-full items-center justify-center">
			<div class="flex flex-col items-center gap-3 text-center">
				<MailIcon class="size-7 text-[var(--text-tertiary)] opacity-40" strokeWidth={1.8} />
				<div>
					<p class="text-[13px] text-[var(--text-tertiary)]">{$_('mail.selectEmail')}</p>
				</div>
			</div>
		</div>
	{/if}
</div>

<!-- Compose Modal -->
<ComposeModal
	isOpen={showCompose}
	onClose={composeState.closeCompose}
	onSent={composeState.onComposeSent}
	replyTo={composeMode === 'reply' ? (composeMail ?? undefined) : undefined}
	forward={composeMode === 'forward' ? (composeMail ?? undefined) : undefined}
/>

<style>
	.reading-scroll-region {
		overscroll-behavior-y: contain;
		overscroll-behavior-x: none;
		-webkit-overflow-scrolling: touch;
	}
</style>
