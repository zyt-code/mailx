<script lang="ts">
	import * as db from '$lib/db/index.js';
	import * as accounts from '$lib/accounts/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { ChevronDown } from 'lucide-svelte';
	import ComposeHeader from './ComposeHeader.svelte';
	import ComposeEditor from './ComposeEditor.svelte';
	import ComposeActions from './ComposeActions.svelte';
	import { X } from 'lucide-svelte';
	import type { Account, EmailAddress, Folder, Mail } from '$lib/types.js';
	import { onMount } from 'svelte';

	interface Props {
		isOpen: boolean;
		onClose: () => void;
		onSent: () => void;
		replyTo?: Mail;
		forward?: Mail;
	}

	let { isOpen, onClose, onSent, replyTo, forward }: Props = $props();

	// Account state
	let availableAccounts = $state<Account[]>([]);
	let selectedAccountId = $state<string | null>(null);

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
	let showAccountDropdown = $state(false);

	// Load accounts on mount
	onMount(async () => {
		await loadAccounts();
	});

	async function loadAccounts() {
		try {
			availableAccounts = await accounts.getAccounts();
			// Select first active account by default
			if (availableAccounts.length > 0 && !selectedAccountId) {
				selectedAccountId = availableAccounts.find(a => a.is_active)?.id || availableAccounts[0].id;
			}
		} catch (error) {
			console.error('Failed to load accounts:', error);
		}
	}

	// Initialize when modal opens
	$effect(() => {
		if (isOpen) {
			// Ensure accounts are loaded
			if (availableAccounts.length === 0) {
				loadAccounts();
			}

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

		const selectedAccount = availableAccounts.find(a => a.id === selectedAccountId);
		if (!selectedAccount) return;

		const mail: Omit<Mail, 'id'> & { id?: string; account_id?: string } = {
			id: draftId || undefined,
			account_id: selectedAccount.id,
			from_name: selectedAccount.name,
			from_email: selectedAccount.email,
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
		if (!selectedAccountId) {
			alert('Please select an account to send from');
			return;
		}

		// Validate recipients
		if (draft.to.length === 0 && draft.cc.length === 0 && draft.bcc.length === 0) {
			alert('Please add at least one recipient');
			return;
		}

		isSending = true;

		// Save draft first
		await saveDraft();

		if (draftId) {
			try {
				// Send via SMTP
				await accounts.sendMail(draftId, selectedAccountId);
			} catch (error) {
				console.error('Failed to send mail:', error);
				alert(`Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`);
				isSending = false;
				return;
			}
		}

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

	function getSelectedAccount(): Account | undefined {
		return availableAccounts.find(a => a.id === selectedAccountId);
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
				<div class="flex items-center gap-4">
					<h2 id="compose-title" class="text-lg font-semibold text-text">
						New Message
					</h2>

					<!-- Account selector -->
					{#if availableAccounts.length > 0}
						<div class="relative">
							<button
								onclick={() => showAccountDropdown = !showAccountDropdown}
								class="flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-md text-sm"
							>
								<span>{getSelectedAccount()?.email}</span>
								<ChevronDown class="w-4 h-4" />
							</button>

							{#if showAccountDropdown}
								<div class="absolute top-full left-0 mt-1 w-64 bg-white border rounded-md shadow-lg z-10">
									{#each availableAccounts as account}
										<button
											onclick={() => {
												selectedAccountId = account.id;
												showAccountDropdown = false;
											}}
											class="w-full px-3 py-2 text-left hover:bg-gray-100 flex items-center gap-2 {selectedAccountId === account.id ? 'bg-gray-100' : ''}"
										>
											<div class="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-medium">
												{account.name.charAt(0).toUpperCase()}
											</div>
											<div class="flex-1 min-w-0">
												<div class="text-sm font-medium truncate">{account.name}</div>
												<div class="text-xs text-gray-500 truncate">{account.email}</div>
											</div>
										</button>
									{/each}
								</div>
							{/if}
						</div>
					{:else}
						<div class="text-sm text-gray-500">No accounts configured</div>
					{/if}
				</div>

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
