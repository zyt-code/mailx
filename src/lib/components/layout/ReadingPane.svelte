<script lang="ts">
	import ScrollArea from '$lib/components/ui/scroll-area/scroll-area.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { ArrowLeft, Mail as MailIcon } from 'lucide-svelte';
	import type { Mail } from '$lib/types.js';
	import { MailHeader, MailActions } from '$lib/components/mail/index.js';
	import { ComposeModal } from '$lib/components/compose/index.js';
	import * as db from '$lib/db/index.js';
	import DOMPurify from 'dompurify';

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

<div class="flex flex-1 min-w-0 h-full bg-white">
	{#if mail}
		<div class="flex flex-1 flex-col">
			{#if isMobile}
				<div class="flex items-center border-b border-zinc-200/60 p-3">
					<Button variant="ghost" size="icon-sm" onclick={onBack} aria-label="Back to list" class="hover:bg-zinc-100">
						<ArrowLeft class="size-4" />
					</Button>
				</div>
			{/if}

			<!-- Mail header -->
			<MailHeader {mail} />

			<!-- Mail actions -->
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

			<!-- Email body -->
			<ScrollArea class="flex-1">
				<div class="p-6 max-w-4xl">
					{#if mail.html_body}
						<div class="prose prose-sm prose-zinc max-w-none">
							{@html DOMPurify.sanitize(mail.html_body)}
						</div>
					{:else}
						<p class="text-sm text-zinc-700 leading-relaxed whitespace-pre-wrap font-mono">{mail.body}</p>
					{/if}
				</div>
			</ScrollArea>
		</div>
	{:else}
		<!-- Refined Empty State -->
		<div class="flex h-full items-center justify-center p-8">
			<div class="flex flex-col items-center gap-5 text-center max-w-sm">
				<!-- Icon with subtle background -->
				<div class="relative">
					<div class="absolute inset-0 bg-zinc-100 rounded-3xl blur-2xl"></div>
					<div class="relative flex size-20 items-center justify-center rounded-2xl bg-gradient-to-br from-zinc-50 to-zinc-100 border border-zinc-200/60">
						<MailIcon class="size-10 text-zinc-400" />
					</div>
				</div>

				<!-- Message -->
				<div>
					<h3 class="text-base font-semibold text-zinc-700 mb-1.5">No email selected</h3>
					<p class="text-sm text-zinc-400 leading-relaxed">
						Select an email from the list to read its contents here
					</p>
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
