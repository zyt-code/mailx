<script lang="ts">
	import { _ } from 'svelte-i18n';
	import * as db from '$lib/db/index.js';
	import * as accounts from '$lib/accounts/index.js';
	import { ChevronDown, X } from 'lucide-svelte';
	import { fade, scale } from 'svelte/transition';
	import ComposeHeader from './ComposeHeader.svelte';
	import ComposeEditor from './ComposeEditor.svelte';
	import ComposeActions from './ComposeActions.svelte';
	import type { Account, Attachment, EmailAddress, Folder, Mail } from '$lib/types.js';
	import { onMount } from 'svelte';
	import { preferences } from '$lib/stores/preferencesStore.js';

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
	let showAccountDropdown = $state(false);
	let highlightedAccountIndex = $state(-1);
	let accountMenuRef = $state<HTMLDivElement | null>(null);
	let draftId = $state<string | null>(null);
	let lastSaved = $state<Date | null>(null);
	let isSending = $state(false);
	let fileInputRef = $state<HTMLInputElement | null>(null);
	let draftAttachments = $state<Attachment[]>([]);
	let sendWithModEnter = $state(true);

	let draft = $state({
		to: [] as EmailAddress[],
		cc: [] as EmailAddress[],
		bcc: [] as EmailAddress[],
		subject: '',
		body: '',
		folder: 'drafts' as Folder
	});

	onMount(async () => {
		await loadAccounts();
	});

	$effect(() => {
		const unsub = preferences.subscribe((value) => {
			sendWithModEnter = value.keyboard.sendWithModEnter;
		});
		return unsub;
	});

	$effect(() => {
		if (!showAccountDropdown) return;

		function handlePointerDown(event: PointerEvent): void {
			const target = event.target as Node | null;
			if (accountMenuRef && target && !accountMenuRef.contains(target)) {
				closeAccountDropdown();
			}
		}

		window.addEventListener('pointerdown', handlePointerDown);
		return () => window.removeEventListener('pointerdown', handlePointerDown);
	});

	$effect(() => {
		if (!isOpen) {
			draftId = null;
			lastSaved = null;
			closeAccountDropdown();
			draftAttachments = [];
			return;
		}

		if (availableAccounts.length === 0) {
			void loadAccounts();
		}

		draftAttachments = [];

		if (replyTo) {
			draft.to = replyTo.to?.[0] ? [replyTo.to[0]] : [];
			draft.cc = [];
			draft.bcc = [];
			draft.subject = replyTo.subject.startsWith('Re:') ? replyTo.subject : `${$_('compose.rePrefix')}${replyTo.subject}`;
			draft.body = `\n\n${$_('compose.originalMessage')}\n${$_('compose.fromField')}${replyTo.from_name} <${replyTo.from_email}>\n${$_('compose.dateField')}${new Date(replyTo.timestamp).toLocaleString()}\n${$_('compose.subjectField')}${replyTo.subject}\n\n${replyTo.body}`;
		} else if (forward) {
			draft.to = [];
			draft.cc = [];
			draft.bcc = [];
			draft.subject = forward.subject.startsWith('Fwd:') ? forward.subject : `${$_('compose.fwdPrefix')}${forward.subject}`;
			draft.body = `\n\n${$_('compose.forwardedMessage')}\n${$_('compose.fromField')}${forward.from_name} <${forward.from_email}>\n${$_('compose.dateField')}${new Date(forward.timestamp).toLocaleString()}\n${$_('compose.subjectField')}${forward.subject}\n\n${forward.body}`;
		} else {
			draft.to = [];
			draft.cc = [];
			draft.bcc = [];
			draft.subject = '';
			draft.body = '';
		}

		const timer = setInterval(() => {
			void saveDraft();
		}, 30000);

		return () => {
			clearInterval(timer);
		};
	});

	async function loadAccounts(): Promise<void> {
		try {
			availableAccounts = await accounts.getAccounts();
			if (availableAccounts.length > 0 && !selectedAccountId) {
				selectedAccountId = availableAccounts.find((account) => account.is_active)?.id || availableAccounts[0].id;
			}
		} catch (error) {
			console.error('Failed to load accounts:', error);
		}
	}

	async function saveDraft(): Promise<void> {
		if (!isOpen) return;

		const selectedAccount = availableAccounts.find((account) => account.id === selectedAccountId);
		if (!selectedAccount) return;

		const mail: Omit<Mail, 'id'> & { id?: string; account_id?: string } = {
			id: draftId || undefined,
			account_id: selectedAccount.id,
			from_name: selectedAccount.name,
			from_email: selectedAccount.email,
			subject: draft.subject || $_('mail.noSubject'),
			preview: draft.body.slice(0, 100),
			body: draft.body,
			timestamp: Date.now(),
			folder: draft.folder,
			unread: false,
			is_read: true,
			has_attachments: draftAttachments.length > 0,
			to: draft.to.length > 0 ? draft.to : undefined,
			cc: draft.cc.length > 0 ? draft.cc : undefined,
			bcc: draft.bcc.length > 0 ? draft.bcc : undefined
		};

		try {
			draftId = await db.createMail(mail);
			lastSaved = new Date();
		} catch (error) {
			console.error('Failed to save draft:', error);
		}
	}

	function getSelectedAccount(): Account | undefined {
		return availableAccounts.find((account) => account.id === selectedAccountId);
	}

	function openAccountDropdown(): void {
		if (availableAccounts.length === 0) return;
		showAccountDropdown = true;
		const selectedIndex = availableAccounts.findIndex((account) => account.id === selectedAccountId);
		highlightedAccountIndex = selectedIndex >= 0 ? selectedIndex : 0;
	}

	function closeAccountDropdown(): void {
		showAccountDropdown = false;
		highlightedAccountIndex = -1;
	}

	function moveAccountHighlight(delta: number): void {
		if (availableAccounts.length === 0) return;
		if (!showAccountDropdown) {
			openAccountDropdown();
			return;
		}

		if (highlightedAccountIndex < 0) {
			highlightedAccountIndex = 0;
			return;
		}

		highlightedAccountIndex =
			(highlightedAccountIndex + delta + availableAccounts.length) % availableAccounts.length;
	}

	function selectAccountByIndex(index: number): void {
		const account = availableAccounts[index];
		if (!account) return;
		selectedAccountId = account.id;
		closeAccountDropdown();
	}

	function handleAccountSwitcherKeydown(event: KeyboardEvent): void {
		switch (event.key) {
			case 'ArrowDown':
				event.preventDefault();
				moveAccountHighlight(1);
				break;
			case 'ArrowUp':
				event.preventDefault();
				moveAccountHighlight(-1);
				break;
			case 'Enter':
				event.preventDefault();
				if (!showAccountDropdown) {
					openAccountDropdown();
				} else if (highlightedAccountIndex >= 0) {
					selectAccountByIndex(highlightedAccountIndex);
				}
				break;
			case 'Escape':
				event.preventDefault();
				closeAccountDropdown();
				break;
		}
	}

	function openAttachmentPicker(): void {
		fileInputRef?.click();
	}

	async function handleAttachmentChange(event: Event): Promise<void> {
		const input = event.currentTarget as HTMLInputElement;
		const files = Array.from(input.files ?? []);
		if (files.length === 0) return;

		if (!draftId) {
			await saveDraft();
		}

		if (!draftId) {
			input.value = '';
			return;
		}

		const persisted: Attachment[] = [];
		for (const file of files) {
			try {
				const bytes = Array.from(new Uint8Array(await file.arrayBuffer()));
				const attachment = await db.addMailAttachment(
					draftId,
					file.name,
					file.type || 'application/octet-stream',
					bytes
				);
				persisted.push(attachment);
			} catch (error) {
				console.error(`Failed to attach file '${file.name}':`, error);
			}
		}

		if (persisted.length > 0) {
			const existingIds = new Set(draftAttachments.map((attachment) => attachment.id));
			draftAttachments = [
				...draftAttachments,
				...persisted.filter((attachment) => !existingIds.has(attachment.id))
			];
			await saveDraft();
		}
		input.value = '';
	}

	async function removeAttachment(id: string): Promise<void> {
		try {
			await db.removeMailAttachment(id);
			draftAttachments = draftAttachments.filter((attachment) => attachment.id !== id);
			await saveDraft();
		} catch (error) {
			console.error('Failed to remove attachment:', error);
		}
	}

	async function sendMail(): Promise<void> {
		if (!selectedAccountId) {
			alert($_('compose.selectAccountAlert'));
			return;
		}

		if (draft.to.length === 0 && draft.cc.length === 0 && draft.bcc.length === 0) {
			alert($_('compose.addRecipientAlert'));
			return;
		}

		isSending = true;
		await saveDraft();

		if (draftId) {
			try {
				await accounts.sendMail(draftId, selectedAccountId);
			} catch (error) {
				console.error('Failed to send mail:', error);
				alert($_('compose.sendFailedAlert', { values: { error: error instanceof Error ? error.message : 'Unknown error' } }));
				isSending = false;
				return;
			}
		}

		isSending = false;
		onSent();
		onClose();
	}

	async function discardDraft(): Promise<void> {
		if (draftId) {
			try {
				await db.moveToTrash(draftId, 'drafts');
			} catch (error) {
				console.error('Failed to discard draft:', error);
			}
		}
		onClose();
	}

	function closeModal(): void {
		onClose();
	}
</script>

{#if isOpen}
	<div>
		<div
			class="fixed inset-0 z-50 flex items-center justify-center bg-black/22 backdrop-blur-sm"
			onclick={(event) => {
				if (event.target === event.currentTarget) closeModal();
			}}
			onkeydown={(event) => {
				if (event.key === 'Escape') closeModal();
				if (sendWithModEnter && (event.metaKey || event.ctrlKey) && event.key === 'Enter') {
					event.preventDefault();
					void sendMail();
				}
			}}
			role="dialog"
			aria-modal="true"
			aria-labelledby="compose-title"
			tabindex="-1"
			in:fade={{ duration: 120 }}
			out:fade={{ duration: 140 }}
		>
			<div
				class="compose-modal-shell flex flex-col w-full h-full sm:h-auto sm:min-h-[60vh] sm:max-h-[88vh] sm:max-w-[820px] overflow-hidden rounded-none sm:rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-primary)] shadow-2xl"
				role="document"
				in:scale={{ duration: 160, start: 0.97, opacity: 0.2 }}
				out:scale={{ duration: 120, start: 1, opacity: 0.15 }}
			>
				<header class="flex items-center justify-between gap-3 px-6 py-3 border-b border-[var(--border-primary)] bg-[var(--bg-secondary)]">
					<div class="flex items-center gap-3 min-w-0">
						<h2 id="compose-title" class="text-[15px] font-semibold text-[var(--text-primary)] shrink-0">{$_('compose.newMessage')}</h2>

						{#if availableAccounts.length > 0}
							<div class="relative" bind:this={accountMenuRef}>
								<button
									type="button"
									onclick={() => (showAccountDropdown ? closeAccountDropdown() : openAccountDropdown())}
									onkeydown={handleAccountSwitcherKeydown}
									class="from-switcher"
									aria-haspopup="listbox"
									aria-expanded={showAccountDropdown}
								>
									<span class="truncate">{$_('compose.fromLabel', { values: { email: getSelectedAccount()?.email || '' } })}</span>
									<ChevronDown class="size-3.5" strokeWidth={1.8} />
								</button>

								{#if showAccountDropdown}
									<div class="account-dropdown" role="listbox" transition:fade={{ duration: 100 }}>
										{#each availableAccounts as account, index}
											<button
												type="button"
												onclick={() => selectAccountByIndex(index)}
												class:selected={selectedAccountId === account.id}
												class:highlighted={highlightedAccountIndex === index}
												role="option"
												aria-selected={selectedAccountId === account.id}
											>
												<div class="mail-avatar">{account.name.charAt(0).toUpperCase()}</div>
												<div class="account-info">
													<p>{account.name}</p>
													<p>{account.email}</p>
												</div>
											</button>
										{/each}
									</div>
								{/if}
							</div>
						{:else}
							<span class="text-[12px] text-[var(--text-tertiary)]">{$_('compose.noAccountsConfigured')}</span>
						{/if}
					</div>

					<button
						type="button"
						onclick={closeModal}
						class="flex size-8 items-center justify-center rounded-md text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
						aria-label={$_('compose.closeCompose')}
					>
						<X class="size-4" strokeWidth={1.8} />
					</button>
				</header>

				<input
					type="file"
					multiple
					bind:this={fileInputRef}
					onchange={handleAttachmentChange}
					class="hidden"
				/>

				<ComposeHeader bind:values={draft} />
				<ComposeEditor
					bind:value={draft.body}
					attachments={draftAttachments}
					onAttach={openAttachmentPicker}
					onRemoveAttachment={removeAttachment}
				/>
				<ComposeActions
					lastSaved={lastSaved}
					{isSending}
					{sendWithModEnter}
					onSend={sendMail}
					onDiscard={discardDraft}
				/>
			</div>
		</div>
	</div>
{/if}

<style>
	.from-switcher {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		max-width: min(430px, 52vw);
		height: 32px;
		padding: 0 0.75rem;
		border-radius: 9px;
		border: 1px solid var(--border-primary);
		background: var(--bg-primary);
		color: var(--text-secondary);
		font-size: 12px;
		font-weight: 500;
		cursor: pointer;
	}

	.from-switcher:hover {
		background: var(--bg-hover);
		color: var(--text-primary);
	}

	.account-dropdown {
		position: absolute;
		top: calc(100% + 6px);
		left: 0;
		z-index: 20;
		width: min(360px, 70vw);
		padding: 0.3rem;
		border-radius: 12px;
		border: 1px solid var(--border-primary);
		background: var(--bg-primary);
		box-shadow: var(--shadow-lg);
	}

	.account-dropdown button {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		width: 100%;
		padding: 0.45rem 0.5rem;
		border: none;
		border-radius: 8px;
		background: transparent;
		cursor: pointer;
		text-align: left;
	}

	.account-dropdown button:hover,
	.account-dropdown button.selected,
	.account-dropdown button.highlighted {
		background: var(--bg-hover);
	}

	.mail-avatar {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		border-radius: 50%;
		background: var(--accent-light);
		color: var(--accent-primary);
		font-size: 12px;
		font-weight: 600;
		flex-shrink: 0;
	}

	.account-info {
		min-width: 0;
	}

	.account-info p {
		margin: 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.account-info p:first-child {
		font-size: 13px;
		font-weight: 500;
		color: var(--text-primary);
	}

	.account-info p:last-child {
		font-size: 11px;
		color: var(--text-tertiary);
	}

	@media (max-width: 640px) {
		.compose-modal-shell {
			border-radius: 0;
		}
	}
</style>
