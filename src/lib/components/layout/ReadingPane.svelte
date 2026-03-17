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
				<div class="flex items-center border-b border-zinc-100 px-3 py-2">
					<button onclick={onBack} class="flex size-7 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100/60" aria-label="Back to list">
						<ArrowLeft class="size-[18px]" strokeWidth={1.5} />
					</button>
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
				<div class="px-8 pt-8 pb-6 max-w-3xl select-text leading-relaxed" data-allow-context-menu>
					{#if mail.html_body}
						<div class="prose prose-sm prose-zinc max-w-none prose-p:text-zinc-600 prose-p:leading-relaxed prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline">
							{@html DOMPurify.sanitize(mail.html_body)}
						</div>
					{:else}
						<p class="text-[14px] text-zinc-600 leading-relaxed whitespace-pre-wrap">{mail.body}</p>
					{/if}
				</div>
			</ScrollArea>
		</div>
	{:else}
		<!-- Empty State - Linear minimal -->
		<div class="flex h-full w-full items-center justify-center">
			<div class="flex flex-col items-center gap-3 text-center">
				<MailIcon class="size-6 text-zinc-300 opacity-20" strokeWidth={1.5} />
				<div>
					<p class="text-[13px] text-zinc-400 leading-relaxed">Select an email to read</p>
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
