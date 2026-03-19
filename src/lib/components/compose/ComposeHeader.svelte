<script lang="ts">
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
		<label for="compose-to" class="line-label">To</label>
		<div class="line-input-wrap">
			{#each values.to as addr, index}
				<span class="recipient-chip">
					{addr.name ? addr.name : addr.email}
					<button
						type="button"
						onclick={() => removeRecipient(values.to, index)}
						aria-label="Remove recipient"
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
				placeholder={values.to.length === 0 ? 'test@example.com' : ''}
				class="line-input"
			/>
		</div>
		<div class="line-actions">
			{#if !showCc}
				<button type="button" onclick={() => (showCc = true)}>Cc</button>
			{/if}
			{#if !showBcc}
				<button type="button" onclick={() => (showBcc = true)}>Bcc</button>
			{/if}
		</div>
	</div>

	{#if showCc}
		<div class="compose-line">
			<label for="compose-cc" class="line-label">Cc</label>
			<div class="line-input-wrap">
				{#each values.cc as addr, index}
					<span class="recipient-chip">
						{addr.name ? addr.name : addr.email}
						<button
							type="button"
							onclick={() => removeRecipient(values.cc, index)}
							aria-label="Remove cc recipient"
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
			<label for="compose-bcc" class="line-label">Bcc</label>
			<div class="line-input-wrap">
				{#each values.bcc as addr, index}
					<span class="recipient-chip">
						{addr.name ? addr.name : addr.email}
						<button
							type="button"
							onclick={() => removeRecipient(values.bcc, index)}
							aria-label="Remove bcc recipient"
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
		<label for="compose-subject" class="sr-only">Subject</label>
		<div class="line-input-wrap subject-wrap">
			<input
				id="compose-subject"
				type="text"
				bind:value={values.subject}
				placeholder="Write a useful subject..."
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
		min-height: 46px;
		padding: 0 1.5rem;
		border-bottom: 1px solid var(--border-tertiary);
	}

	.compose-line.no-bottom-border {
		border-bottom: none;
	}

	.line-label {
		width: 44px;
		flex-shrink: 0;
		color: var(--text-tertiary);
		font-size: 12px;
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
		font-size: 13px;
		color: var(--text-primary);
	}

	.line-input::placeholder {
		color: color-mix(in srgb, var(--text-tertiary) 70%, white);
	}

	.subject-wrap {
		min-height: 48px;
	}

	.subject-input {
		font-size: 14px;
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
		font-size: 11px;
		font-weight: 600;
		color: var(--text-tertiary);
		padding: 0.2rem 0.45rem;
		border-radius: 999px;
		cursor: pointer;
	}

	.line-actions button:hover {
		background: var(--bg-hover);
		color: var(--text-secondary);
	}

	.recipient-chip {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		background: color-mix(in srgb, var(--accent-light) 45%, white);
		color: var(--text-secondary);
		border: 1px solid color-mix(in srgb, var(--accent-muted) 60%, white);
		border-radius: 999px;
		font-size: 12px;
		padding: 0.2rem 0.45rem;
	}

	.recipient-chip button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border: none;
		background: transparent;
		color: var(--text-tertiary);
		padding: 0;
		cursor: pointer;
	}

	.recipient-chip button:hover {
		color: var(--text-primary);
	}
</style>
