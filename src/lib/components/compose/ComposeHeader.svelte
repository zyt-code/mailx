<script lang="ts">
	import { tick } from 'svelte';
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
	let toInputRef = $state<HTMLInputElement | null>(null);
	let ccInputRef = $state<HTMLInputElement | null>(null);
	let bccInputRef = $state<HTMLInputElement | null>(null);
	let subjectInputRef = $state<HTMLInputElement | null>(null);

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

	function focusInput(input: HTMLInputElement | null): void {
		input?.focus();
	}

	function focusLine(
		node: HTMLElement,
		getInput: () => HTMLInputElement | null
	): { update: (nextGetInput: () => HTMLInputElement | null) => void; destroy: () => void } {
		let resolveInput = getInput;

		function handlePointerDown(event: MouseEvent): void {
			const target = event.target as HTMLElement | null;
			if (target?.closest('button') || target?.closest('input')) return;
			focusInput(resolveInput());
		}

		node.addEventListener('mousedown', handlePointerDown);

		return {
			update(nextGetInput) {
				resolveInput = nextGetInput;
			},
			destroy() {
				node.removeEventListener('mousedown', handlePointerDown);
			}
		};
	}

	async function revealCc(): Promise<void> {
		showCc = true;
		await tick();
		focusInput(ccInputRef);
	}

	async function revealBcc(): Promise<void> {
		showBcc = true;
		await tick();
		focusInput(bccInputRef);
	}
</script>

<div class="compose-lines border-b border-[var(--border-primary)] bg-[var(--bg-primary)]">
	<div
		class="compose-line"
		use:focusLine={() => toInputRef}
	>
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
				bind:this={toInputRef}
				bind:value={toInput}
				onkeydown={(event) => handleRecipientKeydown(event, values.to, toInput)}
				onblur={() => addRecipient(values.to, toInput)}
				placeholder={values.to.length === 0 ? $_('compose.toPlaceholder') : ''}
				class="line-input"
			/>
		</div>
		<div class="line-actions">
			{#if !showCc}
				<button
					type="button"
					class="line-action-button"
					tabindex="-1"
					aria-controls="compose-cc"
					aria-expanded={showCc}
					onclick={() => void revealCc()}
				>
					{$_('compose.ccLabel')}
				</button>
			{/if}
			{#if !showBcc}
				<button
					type="button"
					class="line-action-button"
					tabindex="-1"
					aria-controls="compose-bcc"
					aria-expanded={showBcc}
					onclick={() => void revealBcc()}
				>
					{$_('compose.bccLabel')}
				</button>
			{/if}
		</div>
	</div>

	{#if showCc}
		<div
			class="compose-line compose-line-reveal"
			use:focusLine={() => ccInputRef}
		>
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
					bind:this={ccInputRef}
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
		<div
			class="compose-line compose-line-reveal"
			use:focusLine={() => bccInputRef}
		>
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
					bind:this={bccInputRef}
					bind:value={bccInput}
					onkeydown={(event) => handleRecipientKeydown(event, values.bcc, bccInput)}
					onblur={() => addRecipient(values.bcc, bccInput)}
					class="line-input"
				/>
			</div>
			<div class="line-actions"></div>
		</div>
	{/if}

	<div
		class="compose-line subject-line"
		use:focusLine={() => subjectInputRef}
	>
		<label for="compose-subject" class="line-label">{$_('compose.subjectLabel')}</label>
		<div class="line-input-wrap subject-wrap">
			<input
				id="compose-subject"
				type="text"
				bind:this={subjectInputRef}
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
		--compose-leading: 1.75rem;
		--compose-label-width: 4rem;
	}

	.compose-line {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		min-height: 52px;
		padding: 0 var(--compose-leading);
		border-bottom: 1px solid var(--border-tertiary);
		cursor: text;
	}

	.subject-line {
		min-height: 56px;
	}

	.line-label {
		display: inline-flex;
		align-items: center;
		width: var(--compose-label-width);
		flex-shrink: 0;
		color: var(--text-quaternary);
		font-size: 13px;
		font-weight: 500;
		cursor: text;
	}

	.line-input-wrap {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		flex: 1;
		gap: 0.35rem;
		min-height: 52px;
		padding: 0.65rem 0;
	}

	.line-input {
		flex: 1;
		min-width: 150px;
		border: none !important;
		background: transparent !important;
		outline: none !important;
		box-shadow: none !important;
		padding: 0;
		font-size: 14px;
		color: var(--text-primary);
	}

	.line-input::placeholder {
		color: color-mix(in srgb, var(--text-quaternary) 76%, transparent);
	}

	.subject-wrap {
		min-height: 56px;
	}

	.subject-input {
		font-size: 18px;
		font-weight: 650;
		letter-spacing: -0.02em;
		line-height: 1.3;
	}

	.subject-input::placeholder {
		color: color-mix(in srgb, var(--text-quaternary) 72%, transparent);
		font-weight: 450;
	}

	.line-actions {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		margin-left: 0.25rem;
	}

	.compose-line-reveal {
		animation: compose-line-enter 180ms cubic-bezier(0.22, 1, 0.36, 1);
		transform-origin: top;
	}

	.line-action-button {
		border: none;
		background: transparent;
		font-size: 12px;
		font-weight: 500;
		color: color-mix(in srgb, var(--text-tertiary) 82%, transparent);
		padding: 0.3rem 0.45rem;
		border-radius: 999px;
		cursor: pointer;
		transition:
			color 180ms cubic-bezier(0.22, 1, 0.36, 1),
			background-color 180ms cubic-bezier(0.22, 1, 0.36, 1),
			transform 180ms cubic-bezier(0.22, 1, 0.36, 1);
	}

	.line-action-button:hover {
		background: color-mix(in srgb, var(--bg-hover) 76%, transparent);
		color: var(--accent-primary);
		transform: translate3d(0, -1px, 0);
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

	input {
		background: transparent !important;
		border: none !important;
		outline: none !important;
		box-shadow: none !important;
	}

	:global(.dark) .compose-line {
		border-bottom-color: color-mix(in srgb, var(--border-primary) 72%, transparent);
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

	@keyframes compose-line-enter {
		from {
			opacity: 0;
			transform: translate3d(0, -6px, 0);
		}

		to {
			opacity: 1;
			transform: translate3d(0, 0, 0);
		}
	}
</style>
