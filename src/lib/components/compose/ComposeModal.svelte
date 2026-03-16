<script lang="ts">
	import * as db from '$lib/db/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import ComposeHeader from './ComposeHeader.svelte';
	import ComposeEditor from './ComposeEditor.svelte';
	import ComposeActions from './ComposeActions.svelte';
	import { X } from 'lucide-svelte';
	import type { EmailAddress, Folder, Mail } from '$lib/types.js';

	interface Props {
		isOpen: boolean;
		onClose: () => void;
		onSent: () => void;
		replyTo?: Mail;
		forward?: Mail;
	}

	let { isOpen, onClose, onSent, replyTo, forward }: Props = $props();

	// Draft state
	let draft = $state({
		to: [] as EmailAddress[],
		cc: [] as EmailAddress[],
		bcc: [] as EmailAddress[],
		subject: '',
		body: '',
		folder: 'drafts' as Folder
	});

	let draftId = $state<string | null>(null);
	let lastSaved = $state<Date | null>(null);
	let isSending = $state(false);
	let autoSaveInterval = $state<ReturnType<typeof setInterval> | null>(null);

	// Initialize when modal opens
	$effect(() => {
		if (isOpen) {
			// Initialize draft based on replyTo/forward
			if (replyTo) {
				draft.to = replyTo.to?.[0] ? [replyTo.to[0]] : [];
				draft.subject = replyTo.subject.startsWith('Re:')
					? replyTo.subject
					: `Re: ${replyTo.subject}`;
				draft.body = `\n\n--- Original Message ---\nFrom: ${replyTo.from_name} <${replyTo.from_email}>\nDate: ${new Date(replyTo.timestamp).toLocaleString()}\nSubject: ${replyTo.subject}\n\n${replyTo.body}`;
			} else if (forward) {
				draft.subject = forward.subject.startsWith('Fwd:')
					? forward.subject
					: `Fwd: ${forward.subject}`;
				draft.body = `\n\n--- Forwarded Message ---\nFrom: ${forward.from_name} <${forward.from_email}>\nDate: ${new Date(forward.timestamp).toLocaleString()}\nSubject: ${forward.subject}\n\n${forward.body}`;
			} else {
				// Fresh compose
				draft.to = [];
				draft.cc = [];
				draft.bcc = [];
				draft.subject = '';
				draft.body = '';
			}

			// Start auto-save
			autoSaveInterval = setInterval(saveDraft, 30000); // 30 seconds
		} else {
			// Cleanup when modal closes
			if (autoSaveInterval) {
				clearInterval(autoSaveInterval);
				autoSaveInterval = null;
			}
			// Reset state
			draftId = null;
			lastSaved = null;
		}
	});

	async function saveDraft() {
		if (!isOpen) return;

		const mail: Omit<Mail, 'id'> & { id?: string } = {
			id: draftId || undefined,
			from_name: 'Me', // TODO: Get from account settings
			from_email: 'me@example.com', // TODO: Get from account settings
			subject: draft.subject || '(No subject)',
			preview: draft.body.slice(0, 100),
			body: draft.body,
			timestamp: Date.now(),
			folder: draft.folder,
			unread: false,
			to: draft.to.length > 0 ? draft.to : undefined,
			cc: draft.cc.length > 0 ? draft.cc : undefined,
			bcc: draft.bcc.length > 0 ? draft.bcc : undefined,
		};

		try {
			draftId = await db.createMail(mail);
			lastSaved = new Date();
		} catch (error) {
			console.error('Failed to save draft:', error);
		}
	}

	async function sendMail() {
		isSending = true;

		// Save draft first
		await saveDraft();

		// Move to sent folder
		if (draftId) {
			try {
				const mail = await db.getMail(draftId);
				mail.folder = 'sent';
				await db.updateMail(mail);
			} catch (error) {
				console.error('Failed to send mail:', error);
			}
		}

		// TODO: SMTP integration in Phase 4

		isSending = false;
		onSent();
		onClose();
	}

	async function discardDraft() {
		if (draftId) {
			try {
				await db.moveToTrash(draftId, 'drafts');
			} catch (error) {
				console.error('Failed to discard draft:', error);
			}
		}
		onClose();
	}

	function closeModal() {
		onClose();
	}
</script>

{#if isOpen}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
		onclick={(e) => {
			if (e.target === e.currentTarget) closeModal();
		}}
		onkeydown={(e) => {
			if (e.key === 'Escape') closeModal();
		}}
		role="dialog"
		aria-modal="true"
		aria-labelledby="compose-title"
		tabindex="-1"
	>
		<div
			class="flex h-[600px] w-[800px] max-w-[95vw] flex-col rounded-lg bg-bg-primary shadow-xl"
			onclick={(e) => e.stopPropagation()}
			role="document"
		>
			<!-- Header with title and close button -->
			<div class="flex items-center justify-between border-b border-border px-4 py-3">
				<h2 id="compose-title" class="text-lg font-semibold text-text">
					New Message
				</h2>
				<Button
					variant="ghost"
					size="icon-sm"
					onclick={closeModal}
					aria-label="Close"
				>
					<X class="size-4" />
				</Button>
			</div>

			<!-- Compose form -->
			<ComposeHeader bind:values={draft} />
			<ComposeEditor bind:value={draft.body} />
			<ComposeActions
				lastSaved={lastSaved}
				{isSending}
				onSend={sendMail}
				onDiscard={discardDraft}
				onClose={closeModal}
			/>
		</div>
	</div>
{/if}
