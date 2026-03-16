<script lang="ts">
	import * as db from '$lib/db/index.js';
	import * as accounts from '$lib/accounts/index.js';
	import { ChevronDown, X } from 'lucide-svelte';
	import ComposeHeader from './ComposeHeader.svelte';
	import ComposeEditor from './ComposeEditor.svelte';
	import ComposeActions from './ComposeActions.svelte';
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

	let availableAccounts = $state<Account[]>([]);
	let selectedAccountId = $state<string | null>(null);

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

	onMount(async () => {
		await loadAccounts();
	});

	async function loadAccounts() {
		try {
			availableAccounts = await accounts.getAccounts();
			if (availableAccounts.length > 0 && !selectedAccountId) {
				selectedAccountId = availableAccounts.find(a => a.is_active)?.id || availableAccounts[0].id;
			}
		} catch (error) {
			console.error('Failed to load accounts:', error);
		}
	}

	$effect(() => {
		if (isOpen) {
			if (availableAccounts.length === 0) {
				loadAccounts();
			}

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
				draft.to = [];
				draft.cc = [];
				draft.bcc = [];
				draft.subject = '';
				draft.body = '';
			}

			autoSaveInterval = setInterval(saveDraft, 30000);
		} else {
			if (autoSaveInterval) {
				clearInterval(autoSaveInterval);
				autoSaveInterval = null;
			}
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

		if (draft.to.length === 0 && draft.cc.length === 0 && draft.bcc.length === 0) {
			alert('Please add at least one recipient');
			return;
		}

		isSending = true;
		await saveDraft();

		if (draftId) {
			try {
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
	<div>
		<!-- Backdrop -->
		<div
			class="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm"
			onclick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
			onkeydown={(e) => { if (e.key === 'Escape') closeModal(); }}
			role="dialog"
			aria-modal="true"
			aria-labelledby="compose-title"
			tabindex="-1"
		>
			<!-- Modal -->
			<div
				class="flex flex-col rounded-xl bg-white shadow-2xl w-full h-full sm:h-auto sm:max-h-[80vh] sm:max-w-[640px] sm:w-[640px] overflow-hidden sm:m-0 m-0 ring-1 ring-zinc-200/50"
				onclick={(e) => e.stopPropagation()}
				role="document"
			>
				<!-- Header -->
				<div class="flex items-center justify-between border-b border-zinc-100 px-5 py-3">
					<div class="flex items-center gap-3">
						<h2 id="compose-title" class="text-[14px] font-semibold text-zinc-900">
							New Message
						</h2>

						{#if availableAccounts.length > 0}
							<div class="relative">
								<button
									onclick={() => showAccountDropdown = !showAccountDropdown}
									class="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-50 hover:bg-zinc-100 rounded-md text-[12px] text-zinc-500 transition-colors"
								>
									<span>{getSelectedAccount()?.email}</span>
									<ChevronDown class="size-3" strokeWidth={1.5} />
								</button>

								{#if showAccountDropdown}
									<div class="absolute top-full left-0 mt-1 w-60 bg-white border border-zinc-100 rounded-lg shadow-lg z-10 py-1">
										{#each availableAccounts as account}
											<button
												onclick={() => { selectedAccountId = account.id; showAccountDropdown = false; }}
												class="w-full px-3 py-2 text-left hover:bg-zinc-50 flex items-center gap-2.5 transition-colors {selectedAccountId === account.id ? 'bg-zinc-50' : ''}"
											>
												<div class="size-6 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 text-[11px] font-medium">
													{account.name.charAt(0).toUpperCase()}
												</div>
												<div class="flex-1 min-w-0">
													<div class="text-[13px] text-zinc-700 truncate">{account.name}</div>
													<div class="text-[11px] text-zinc-400 truncate">{account.email}</div>
												</div>
											</button>
										{/each}
									</div>
								{/if}
							</div>
						{:else}
							<span class="text-[12px] text-zinc-400">No accounts configured</span>
						{/if}
					</div>

					<button
						onclick={closeModal}
						class="flex size-7 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-100/60 hover:text-zinc-600"
						aria-label="Close"
					>
						<X class="size-4" strokeWidth={1.5} />
					</button>
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
	</div>
{/if}
