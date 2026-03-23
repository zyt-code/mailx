<script lang="ts">
	import { tick } from 'svelte';
	import { _ } from 'svelte-i18n';
	import * as db from '$lib/db/index.js';
	import * as accounts from '$lib/accounts/index.js';
	import { ChevronDown, X } from 'lucide-svelte';
	import { cubicOut } from 'svelte/easing';
	import { fade, scale } from 'svelte/transition';
	import { acquireModalLayer } from '$lib/stores/modalStore.js';
	import ComposeHeader from './ComposeHeader.svelte';
	import ComposeEditor from './ComposeEditor.svelte';
	import ComposeActions from './ComposeActions.svelte';
	import type { Account, Attachment, EmailAddress, Folder, Mail } from '$lib/types.js';
	import { preferences } from '$lib/stores/preferencesStore.js';
	import { buildComposerPayload, buildForwardDraft, buildReplyDraft, mergeComposerPayload } from '$lib/utils/mailContent.js';
	import { showToast } from '$lib/utils/toast.js';
	import { extractErrorMessage } from '$lib/utils/errorMessage.js';

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
	let showDiscardConfirm = $state(false);
	let isCloseBlocked = $state(false);
	let sendStatusMessage = $state('');
	let sendStatusTone = $state<'neutral' | 'error'>('neutral');
	let releaseModalLayer: (() => void) | null = null;
	let referenceBody = $state('');
	let referenceHtml = $state('');

	let draft = $state({
		to: [] as EmailAddress[],
		cc: [] as EmailAddress[],
		bcc: [] as EmailAddress[],
		subject: '',
		body: '',
		html_body: '',
		folder: 'drafts' as Folder
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
		if (!isOpen) return;

		function handleWindowKeydown(event: KeyboardEvent): void {
			handleModalKeydown(event);
		}

		window.addEventListener('keydown', handleWindowKeydown);
		return () => window.removeEventListener('keydown', handleWindowKeydown);
	});

	$effect(() => {
		if (!isOpen) {
			releaseModalLayer?.();
			releaseModalLayer = null;
			draftId = null;
			lastSaved = null;
			showDiscardConfirm = false;
			isCloseBlocked = false;
			closeAccountDropdown();
			draftAttachments = [];
			referenceBody = '';
			referenceHtml = '';
			return;
		}

		if (!releaseModalLayer) {
			releaseModalLayer = acquireModalLayer();
		}

		if (availableAccounts.length === 0) {
			void loadAccounts();
		}

		draftAttachments = [];

		if (replyTo) {
			const replyDraft = buildReplyDraft(replyTo, {
				rePrefix: $_('compose.rePrefix'),
				originalMessage: $_('compose.originalMessage'),
				fromField: $_('compose.fromField'),
				dateField: $_('compose.dateField'),
				subjectField: $_('compose.subjectField')
			});
			draft.to = replyTo.to?.[0] ? [replyTo.to[0]] : [];
			draft.cc = [];
			draft.bcc = [];
			draft.subject = replyDraft.subject;
			draft.body = replyDraft.body;
			draft.html_body = replyDraft.html_body;
		} else if (forward) {
			const forwardDraft = buildForwardDraft(forward, {
				fwdPrefix: $_('compose.fwdPrefix'),
				forwardedMessage: $_('compose.forwardedMessage'),
				fromField: $_('compose.fromField'),
				dateField: $_('compose.dateField'),
				subjectField: $_('compose.subjectField'),
				toField: `${$_('mail.to')}：`,
				ccField: `${$_('mail.cc')}：`,
				replyToField: `${$_('mail.replyTo')}：`
			});
			draft.to = [];
			draft.cc = [];
			draft.bcc = [];
			draft.subject = forwardDraft.subject;
			draft.body = '';
			draft.html_body = '';
			referenceBody = forwardDraft.body;
			referenceHtml = forwardDraft.html_body;
		} else {
			draft.to = [];
			draft.cc = [];
			draft.bcc = [];
			draft.subject = '';
			draft.body = '';
			draft.html_body = '';
			referenceBody = '';
			referenceHtml = '';
		}

		return () => {
			releaseModalLayer?.();
			releaseModalLayer = null;
		};
	});

	$effect(() => {
		if (!isOpen || !hasDraftContent()) return;

		selectedAccountId;
		draft.subject;
		draft.body;
		draft.html_body;
		draft.to.length;
		draft.cc.length;
		draft.bcc.length;
		draftAttachments.length;

		const timeout = window.setTimeout(() => {
			void saveDraft();
		}, 500);

		return () => clearTimeout(timeout);
	});

	async function loadAccounts(): Promise<void> {
		try {
			const loadedAccounts = await accounts.getAccounts();
			availableAccounts = Array.isArray(loadedAccounts) ? loadedAccounts : [];
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

		const content = mergeComposerPayload(
			buildComposerPayload(draft.html_body, draft.body),
			referenceBody || referenceHtml
				? {
						body: referenceBody,
						html_body: referenceHtml
					}
				: undefined
		);

		const mailId = draftId ?? crypto.randomUUID();
		const mail: Mail = {
			id: mailId,
			account_id: selectedAccount.id,
			from_name: selectedAccount.name,
			from_email: selectedAccount.email,
			subject: draft.subject || $_('mail.noSubject'),
			preview: content.preview,
			body: content.body,
			html_body: content.html_body,
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
			if (draftId) {
				await db.updateMail(mail);
			} else {
				draftId = await db.createMail(mail);
			}
			lastSaved = new Date();
		} catch (error) {
			console.error('Failed to save draft:', error);
		}
	}

	function hasDraftContent(): boolean {
		return (
			draft.to.length > 0 ||
			draft.cc.length > 0 ||
			draft.bcc.length > 0 ||
			draftAttachments.length > 0 ||
			draft.subject.trim().length > 0 ||
			draft.body.trim().length > 0 ||
			draft.html_body.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').trim().length > 0
		);
	}

	function pulseCloseGuard(): void {
		isCloseBlocked = false;
		window.requestAnimationFrame(() => {
			isCloseBlocked = true;
			window.setTimeout(() => {
				isCloseBlocked = false;
			}, 420);
		});
	}

	async function requestClose(): Promise<void> {
		closeAccountDropdown();

		if (!hasDraftContent()) {
			showDiscardConfirm = false;
			onClose();
			return;
		}

		showDiscardConfirm = true;
		pulseCloseGuard();
		await saveDraft();
	}

	function keepEditing(): void {
		showDiscardConfirm = false;
		isCloseBlocked = false;
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
		const activeElement = document.activeElement as HTMLElement | null;
		if (activeElement && activeElement !== document.body) {
			activeElement.blur();
			await tick();
		}

		sendStatusMessage = '';
		sendStatusTone = 'neutral';

		if (!selectedAccountId && availableAccounts.length === 0) {
			await loadAccounts();
		}
		if (!selectedAccountId && availableAccounts.length > 0) {
			selectedAccountId = availableAccounts.find((account) => account.is_active)?.id || availableAccounts[0].id;
		}

		if (!selectedAccountId) {
			sendStatusMessage = $_('compose.selectAccountAlert');
			sendStatusTone = 'error';
			showToast({
				type: 'error',
				title: $_('compose.selectAccountAlert')
			});
			return;
		}

		if (draft.to.length === 0 && draft.cc.length === 0 && draft.bcc.length === 0) {
			sendStatusMessage = $_('compose.addRecipientAlert');
			sendStatusTone = 'error';
			showToast({
				type: 'error',
				title: $_('compose.addRecipientAlert')
			});
			return;
		}

		isSending = true;
		await saveDraft();

		if (draftId) {
			try {
				await accounts.sendMail(draftId, selectedAccountId);
			} catch (error) {
				console.error('Failed to send mail:', error);
				const errorMessage = extractErrorMessage(error);
				sendStatusMessage = $_('compose.sendFailedAlert', { values: { error: errorMessage } });
				sendStatusTone = 'error';
				showToast({
					type: 'error',
					title: $_('compose.sendFailedAlert', {
						values: { error: errorMessage }
					})
				});
				isSending = false;
				return;
			}
		}

		isSending = false;
		sendStatusMessage = '';
		sendStatusTone = 'neutral';
		onSent();
		onClose();
	}

	async function discardDraft(): Promise<void> {
		showDiscardConfirm = false;
		isCloseBlocked = false;

		if (draftId) {
			try {
				await db.moveToTrash(draftId, 'drafts');
			} catch (error) {
				console.error('Failed to discard draft:', error);
			}
		}
		onClose();
	}

	function handleModalKeydown(event: KeyboardEvent): void {
		if (event.key === 'Escape') {
			event.preventDefault();
			if (showDiscardConfirm) {
				keepEditing();
				return;
			}
			void requestClose();
			return;
		}

		if (sendWithModEnter && (event.metaKey || event.ctrlKey) && event.key === 'Enter') {
			event.preventDefault();
			void sendMail();
		}
	}

	function handleBackdropAttempt(): void {
		if (hasDraftContent()) {
			pulseCloseGuard();
		}
	}

	function backdropClose(node: HTMLElement): { destroy: () => void } {
		function handleClick(event: MouseEvent): void {
			if (event.target === node) {
				handleBackdropAttempt();
			}
		}

		node.addEventListener('click', handleClick);

		return {
			destroy() {
				node.removeEventListener('click', handleClick);
			}
		};
	}

	function portal(node: HTMLElement) {
		if (typeof document === 'undefined') {
			return {
				destroy() {}
			};
		}

		document.body.appendChild(node);

		return {
			destroy() {
				if (node.parentNode === document.body) {
					document.body.removeChild(node);
				}
			}
		};
	}
</script>

{#if isOpen}
	<div
		use:portal
		use:backdropClose
		class="compose-modal-layer fixed inset-0 z-[70] flex items-center justify-center px-0 sm:px-6 py-0 sm:py-8"
		data-testid="compose-modal-backdrop"
		role="dialog"
		aria-modal="true"
		aria-labelledby="compose-title"
		tabindex="-1"
		in:fade={{ duration: 150 }}
		out:fade={{ duration: 140 }}
	>
		<div
			class="compose-modal-shell flex flex-col w-full h-full sm:h-auto sm:min-h-[60vh] sm:max-h-[88vh] sm:max-w-[780px] overflow-hidden rounded-none sm:rounded-[22px] border border-[var(--border-secondary)] bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-2xl dark:border-[var(--border-primary)] dark:bg-[var(--bg-primary)] dark:text-[var(--text-primary)]"
			class:close-guarded={isCloseBlocked}
			role="document"
			in:scale={{ duration: 220, start: 0.95, opacity: 0.16, easing: cubicOut }}
			out:scale={{ duration: 150, start: 1, opacity: 0.12, easing: cubicOut }}
		>
			<header class="flex items-center justify-between gap-3 px-5 py-2.5 border-b border-[var(--border-tertiary)] bg-[var(--bg-primary)] dark:border-[var(--border-primary)] dark:bg-[var(--bg-primary)]">
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
					onclick={() => void requestClose()}
					class="flex size-8 items-center justify-center rounded-md text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] dark:text-[var(--text-tertiary)] dark:hover:text-[var(--text-primary)] dark:hover:bg-[var(--bg-hover)]"
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
				bind:htmlValue={draft.html_body}
				referencePlain={referenceBody}
				referenceHtml={referenceHtml}
				attachments={draftAttachments}
				onAttach={openAttachmentPicker}
				onRemoveAttachment={removeAttachment}
			/>
			<ComposeActions
				lastSaved={lastSaved}
				{isSending}
				{sendWithModEnter}
				statusMessage={sendStatusMessage}
				statusTone={sendStatusTone}
				onSend={sendMail}
				onDiscard={() => void requestClose()}
			/>
		</div>

		{#if showDiscardConfirm}
			<div class="compose-confirm-layer">
				<div
					class="compose-confirm-card"
					role="alertdialog"
					aria-modal="true"
					aria-labelledby="compose-discard-title"
					aria-describedby="compose-discard-copy"
					tabindex="-1"
				>
					<div class="compose-confirm-copy">
						<h3 id="compose-discard-title">{$_('compose.discardConfirmTitle')}</h3>
						<p id="compose-discard-copy">{$_('compose.discardConfirmMessage')}</p>
					</div>

					<div class="compose-confirm-actions">
						<button type="button" class="confirm-secondary" onclick={keepEditing}>
							{$_('common.cancel')}
						</button>
						<button type="button" class="confirm-danger" onclick={() => void discardDraft()}>
							{$_('compose.discard')}
						</button>
					</div>
				</div>
			</div>
		{/if}
	</div>
{/if}

<style>
	.compose-modal-layer {
		background: color-mix(in srgb, rgba(15, 23, 42, 0.18) 68%, transparent);
		backdrop-filter: blur(14px) saturate(118%);
	}

	.compose-modal-shell {
		height: 100%;
		min-height: 0;
		transition:
			border-color 180ms cubic-bezier(0.22, 1, 0.36, 1),
			box-shadow 180ms cubic-bezier(0.22, 1, 0.36, 1);
	}

	.compose-modal-shell.close-guarded {
		animation: compose-close-guard 420ms cubic-bezier(0.22, 1, 0.36, 1);
		border-color: color-mix(in srgb, var(--accent-primary) 38%, var(--border-secondary));
		box-shadow:
			0 24px 70px rgba(15, 23, 42, 0.22),
			0 0 0 1px color-mix(in srgb, var(--accent-primary) 22%, transparent);
	}

	.from-switcher {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		max-width: min(430px, 52vw);
		height: 30px;
		padding: 0 0.65rem;
		border-radius: 6px;
		border: 1px solid var(--border-secondary);
		background: var(--bg-primary);
		color: var(--text-secondary);
		font-size: 12px;
		font-weight: 500;
		cursor: pointer;
	}

	.from-switcher:hover {
		background: var(--bg-hover);
		color: var(--text-primary);
		border-color: var(--border-primary);
	}

	.account-dropdown {
		position: absolute;
		top: calc(100% + 4px);
		left: 0;
		z-index: 20;
		width: min(340px, 70vw);
		padding: 0.25rem;
		border-radius: 10px;
		border: 1px solid var(--border-secondary);
		background: var(--bg-primary);
		box-shadow: var(--shadow-lg);
	}

	.account-dropdown button {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		width: 100%;
		padding: 0.4rem 0.5rem;
		border: none;
		border-radius: 6px;
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
		width: 26px;
		height: 26px;
		border-radius: 6px;
		background: var(--accent-light);
		color: var(--accent-primary);
		font-size: 11px;
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

	.compose-confirm-layer {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1.5rem;
		background: color-mix(in srgb, rgba(15, 23, 42, 0.12) 72%, transparent);
		backdrop-filter: blur(10px);
		animation: compose-confirm-enter 140ms cubic-bezier(0.22, 1, 0.36, 1);
	}

	.compose-confirm-card {
		width: min(420px, calc(100vw - 2rem));
		padding: 1.15rem;
		border: 1px solid color-mix(in srgb, var(--border-primary) 82%, transparent);
		border-radius: 18px;
		background: color-mix(in srgb, var(--bg-primary) 94%, transparent);
		box-shadow: var(--shadow-lg);
	}

	.compose-confirm-copy h3 {
		font-size: 15px;
		font-weight: 650;
		color: var(--text-primary);
	}

	.compose-confirm-copy p {
		margin-top: 0.45rem;
		font-size: 13px;
		line-height: 1.5;
		color: var(--text-secondary);
	}

	.compose-confirm-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.55rem;
		margin-top: 1rem;
	}

	.confirm-secondary,
	.confirm-danger {
		height: 34px;
		padding: 0 0.9rem;
		border-radius: 10px;
		font-size: 13px;
		font-weight: 600;
		border: 1px solid transparent;
		cursor: pointer;
	}

	.confirm-secondary {
		background: var(--bg-secondary);
		color: var(--text-secondary);
		border-color: var(--border-secondary);
	}

	.confirm-secondary:hover {
		background: var(--bg-hover);
		color: var(--text-primary);
	}

	.confirm-danger {
		background: color-mix(in srgb, var(--error) 90%, #fff 10%);
		color: #fff;
	}

	.confirm-danger:hover {
		background: var(--error);
	}

	@media (max-width: 640px) {
		.compose-modal-shell {
			border-radius: 0;
		}
	}

	@media (min-width: 640px) {
		.compose-modal-shell {
			height: min(88vh, 860px);
		}
	}

	:global(.dark) .compose-modal-layer {
		background: color-mix(in srgb, rgba(2, 6, 23, 0.54) 78%, transparent);
	}

	@keyframes compose-close-guard {
		0%,
		100% {
			transform: translate3d(0, 0, 0);
		}

		24% {
			transform: translate3d(-7px, 0, 0);
		}

		52% {
			transform: translate3d(6px, 0, 0);
		}

		76% {
			transform: translate3d(-3px, 0, 0);
		}
	}

	@keyframes compose-confirm-enter {
		from {
			opacity: 0;
		}

		to {
			opacity: 1;
		}
	}
</style>
