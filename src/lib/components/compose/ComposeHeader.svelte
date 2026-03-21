<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { X } from 'lucide-svelte';
	import type { EmailAddress } from '$lib/types.js';

	interface Props {
		values: {
			to: EmailAddress[];
			cc: EmailAddress[];
			bcc: EmailAddress[];
			subject: string;
		};
	}

	let { values = $bindable() }: Props = $props();

	let showCc = $state(false);
	let showBcc = $state(false);
	let toInput = $state('');
	let ccInput = $state('');
	let bccInput = $state('');

	function parseAddress(input: string): EmailAddress | null {
		const trimmed = input.trim();
		if (!trimmed) return null;

		const namedMatch = trimmed.match(/([^<]+)<([^>]+)>/);
		if (namedMatch) {
			return {
				name: namedMatch[1]?.trim() || '',
				email: namedMatch[2]?.trim() || ''
			};
		}

		if (trimmed.includes('@')) {
			return { name: '', email: trimmed };
		}

		return null;
	}

	function addRecipient(list: EmailAddress[], inputValue: string): void {
		const address = parseAddress(inputValue);
		if (!address || !address.email) return;
		list.push(address);

		if (inputValue === toInput) toInput = '';
		if (inputValue === ccInput) ccInput = '';
		if (inputValue === bccInput) bccInput = '';
	}

	function removeRecipient(list: EmailAddress[], index: number): void {
		list.splice(index, 1);
	}

	function handleRecipientKeydown(event: KeyboardEvent, list: EmailAddress[], inputValue: string): void {
		if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'v') return;

		if (event.key === 'Enter' || event.key === ',') {
			event.preventDefault();
			addRecipient(list, inputValue);
		}

		if (event.key === 'Backspace' && !inputValue && list.length > 0) {
			list.pop();
		}
	}
</script>

<div class="compose-lines border-b border-[var(--border-primary)] bg-[var(--bg-primary)]">
	<div class="compose-line">
		<label for="compose-to" class="line-label">{$_('compose.toLabel')}</label>
		<div class="line-input-wrap">
			{#each values.to as addr, index}
				<span class="recipient-chip">
					{addr.name ? addr.name : addr.email}
					<button
						type="button"
						onclick={() => removeRecipient(values.to, index)}
						aria-label={$_('compose.removeRecipient')}
					>
						<X class="size-3" strokeWidth={1.8} />
					</button>
				</span>
			{/each}
			<input
				id="compose-to"
				type="text"
				bind:value={toInput}
				onkeydown={(event) => handleRecipientKeydown(event, values.to, toInput)}
				onblur={() => addRecipient(values.to, toInput)}
				placeholder={values.to.length === 0 ? $_('compose.toPlaceholder') : ''}
				class="line-input"
			/>
		</div>
		<div class="line-actions">
			{#if !showCc}
				<button type="button" onclick={() => (showCc = true)}>{$_('compose.ccLabel')}</button>
			{/if}
			{#if !showBcc}
				<button type="button" onclick={() => (showBcc = true)}>{$_('compose.bccLabel')}</button>
			{/if}
		</div>
	</div>

	{#if showCc}
		<div class="compose-line">
			<label for="compose-cc" class="line-label">{$_('compose.ccLabel')}</label>
			<div class="line-input-wrap">
				{#each values.cc as addr, index}
					<span class="recipient-chip">
						{addr.name ? addr.name : addr.email}
						<button
							type="button"
							onclick={() => removeRecipient(values.cc, index)}
							aria-label={$_('compose.removeCcRecipient')}
						>
							<X class="size-3" strokeWidth={1.8} />
						</button>
					</span>
				{/each}
				<input
					id="compose-cc"
					type="text"
					bind:value={ccInput}
					onkeydown={(event) => handleRecipientKeydown(event, values.cc, ccInput)}
					onblur={() => addRecipient(values.cc, ccInput)}
					class="line-input"
				/>
			</div>
			<div class="line-actions"></div>
		</div>
	{/if}

	{#if showBcc}
		<div class="compose-line">
			<label for="compose-bcc" class="line-label">{$_('compose.bccLabel')}</label>
			<div class="line-input-wrap">
				{#each values.bcc as addr, index}
					<span class="recipient-chip">
						{addr.name ? addr.name : addr.email}
						<button
							type="button"
							onclick={() => removeRecipient(values.bcc, index)}
							aria-label={$_('compose.removeBccRecipient')}
						>
							<X class="size-3" strokeWidth={1.8} />
						</button>
					</span>
				{/each}
				<input
					id="compose-bcc"
					type="text"
					bind:value={bccInput}
					onkeydown={(event) => handleRecipientKeydown(event, values.bcc, bccInput)}
					onblur={() => addRecipient(values.bcc, bccInput)}
					class="line-input"
				/>
			</div>
			<div class="line-actions"></div>
		</div>
	{/if}

	<div class="compose-line no-bottom-border">
		<label for="compose-subject" class="sr-only">{$_('compose.subjectLabel')}</label>
		<div class="line-input-wrap subject-wrap">
			<input
				id="compose-subject"
				type="text"
				bind:value={values.subject}
				placeholder={$_('compose.subjectPlaceholder')}
				class="line-input subject-input"
			/>
		</div>
	</div>
</div>

<style>
	.compose-lines {
		font-size: 13px;
	}

	.compose-line {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		min-height: 42px;
		padding: 0 1.5rem;
		border-bottom: 1px solid var(--border-tertiary);
	}

	.compose-line.no-bottom-border {
		border-bottom: none;
	}

	.line-label {
		width: 36px;
		flex-shrink: 0;
		color: var(--text-tertiary);
		font-size: 13px;
		font-weight: 500;
	}

	.line-input-wrap {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		flex: 1;
		gap: 0.35rem;
		min-height: 42px;
	}

	.line-input {
		flex: 1;
		min-width: 150px;
		border: none;
		background: transparent;
		outline: none;
		padding: 0;
		font-size: 14px;
		color: var(--text-primary);
	}

	.line-input::placeholder {
		color: var(--text-quaternary);
	}

	.subject-wrap {
		min-height: 48px;
	}

	.subject-input {
		font-size: 20px;
		font-weight: 700;
		letter-spacing: -0.03em;
		line-height: 1.3;
	}

	.subject-input::placeholder {
		color: var(--text-quaternary);
		font-weight: 500;
	}

	.line-actions {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		margin-left: 0.5rem;
	}

	.line-actions button {
		border: none;
		background: transparent;
		font-size: 12px;
		font-weight: 600;
		color: var(--text-tertiary);
		padding: 0.2rem 0.5rem;
		border-radius: 6px;
		cursor: pointer;
	}

	.line-actions button:hover {
		background: var(--bg-hover);
		color: var(--accent-primary);
	}

	.recipient-chip {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		background: var(--bg-secondary);
		color: var(--text-primary);
		border: 1px solid var(--border-secondary);
		border-radius: 6px;
		font-size: 13px;
		font-weight: 500;
		padding: 0.2rem 0.5rem;
	}

	.recipient-chip button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border: none;
		background: transparent;
		color: var(--text-quaternary);
		padding: 0;
		cursor: pointer;
		border-radius: 3px;
	}

	.recipient-chip button:hover {
		color: var(--text-primary);
		background: var(--bg-hover);
	}
</style>
