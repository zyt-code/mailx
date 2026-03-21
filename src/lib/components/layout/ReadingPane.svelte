<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { ArrowLeft, Mail as MailIcon } from 'lucide-svelte';
	import type { Mail } from '$lib/types.js';
	import { MailHeader, MailActions, EmailRenderer } from '$lib/components/mail/index.js';
	import { ComposeModal } from '$lib/components/compose/index.js';
	import * as db from '$lib/db/index.js';

	interface Props {
		mail: Mail | null;
		isMobile: boolean;
		onBack: () => void;
		onRefresh?: () => void;
	}

	let { mail, isMobile, onBack, onRefresh }: Props = $props();

	let showCompose = $state(false);
	let composeMode = $state<'reply' | 'forward' | null>(null);
	let composeMail = $state<Mail | null>(null);

	function handleReply() {
		composeMode = 'reply';
		composeMail = mail;
		showCompose = true;
	}

	function handleReplyAll() {
		composeMode = 'reply';
		composeMail = mail;
		showCompose = true;
	}

	function handleForward() {
		composeMode = 'forward';
		composeMail = mail;
		showCompose = true;
	}

	async function handleArchive(mailToArchive: Mail) {
		try {
			if (mailToArchive.folder === 'archive') {
				await db.updateMail({
					...mailToArchive,
					folder: 'inbox'
				});
			} else {
				await db.moveToArchive(mailToArchive.id);
			}
			onRefresh?.();
		} catch (error) {
			console.error('Failed to archive mail:', error);
		}
	}

	async function handleDelete(mailToDelete: Mail) {
		try {
			await db.moveToTrash(mailToDelete.id, mailToDelete.folder);
			onRefresh?.();
		} catch (error) {
			console.error('Failed to delete mail:', error);
		}
	}

	async function handleToggleStar(mailToStar: Mail) {
		try {
			await db.toggleStar(mailToStar.id, !mailToStar.starred);
			onRefresh?.();
		} catch (error) {
			console.error('Failed to toggle star:', error);
		}
	}

	function closeCompose() {
		showCompose = false;
		composeMode = null;
		composeMail = null;
	}

	function onComposeSent() {
		closeCompose();
		onRefresh?.();
	}
</script>

<div class="reading-pane flex flex-1 min-w-0 h-full bg-[var(--bg-primary)] overflow-hidden">
	{#if mail}
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
				<MailHeader {mail} />
			</div>

			<!-- Mail actions toolbar - stays fixed at top -->
			<div class="shrink-0 border-b border-[var(--border-primary)]">
				<MailActions
					{mail}
					onReply={handleReply}
					onReplyAll={handleReplyAll}
					onForward={handleForward}
					onArchive={handleArchive}
					onUnarchive={handleArchive}
					onDelete={handleDelete}
					onToggleStar={handleToggleStar}
				/>
			</div>

			<!-- Email body - independent scroll, rendered in isolated iframe -->
			<div class="flex-1 overflow-y-auto min-h-0">
				<div class="reading-content select-text cursor-text" data-allow-context-menu>
					<EmailRenderer htmlBody={mail.html_body} plainBody={mail.body} />
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
	onClose={closeCompose}
	onSent={onComposeSent}
	replyTo={composeMode === 'reply' ? (composeMail ?? undefined) : undefined}
	forward={composeMode === 'forward' ? (composeMail ?? undefined) : undefined}
/>
