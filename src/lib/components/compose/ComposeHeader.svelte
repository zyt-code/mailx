<script lang="ts">
	import { Input } from '$lib/components/ui/input/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { cn } from '$lib/utils.js';
	import { X, Plus } from 'lucide-svelte';
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

	function addRecipient(list: EmailAddress[], inputValue: string): void {
		const trimmed = inputValue.trim();
		if (!trimmed) return;

		// Simple email validation - check for @ and basic format
		const emailMatch = trimmed.match(/([^<]+)<([^>]+)>/) || trimmed.match(/(.+)@(.+)/);

		if (emailMatch) {
			const name = emailMatch[1]?.trim() || '';
			const email = emailMatch[2]?.trim() || trimmed;
			list.push({ name, email });
			if (trimmed === toInput) toInput = '';
			else if (trimmed === ccInput) ccInput = '';
			else if (trimmed === bccInput) bccInput = '';
		}
	}

	function removeRecipient(list: EmailAddress[], index: number): void {
		list.splice(index, 1);
	}

	function handleKeyDown(event: KeyboardEvent, list: EmailAddress[], inputValue: string): void {
		if (event.key === 'Enter' || event.key === ',') {
			event.preventDefault();
			addRecipient(list, inputValue);
		} else if (event.key === 'Backspace' && !inputValue) {
			// Remove last recipient if input is empty
			if (list.length > 0) {
				list.pop();
			}
		}
	}
</script>

<div class="flex flex-col gap-3 border-b border-border p-4">
	<!-- To field -->
	<div class="flex items-center gap-2">
		<label for="to-input" class="w-12 text-sm font-medium text-text-muted">To:</label>
		<div class="flex flex-1 flex-wrap items-center gap-2 rounded-md border border-border bg-bg-primary px-2 py-1 focus-within:border-ring">
			{#each values.to as addr, index}
				<span class="flex items-center gap-1 rounded-sm bg-bg-hover px-2 py-0.5 text-sm">
					{addr.name ? `${addr.name} <${addr.email}>` : addr.email}
					<button
						type="button"
						class="hover:text-text-muted text-text"
						onclick={() => removeRecipient(values.to, index)}
						aria-label="Remove recipient"
					>
						<X class="size-3" />
					</button>
				</span>
			{/each}
			<input
				id="to-input"
				bind:value={toInput}
				onkeydown={(e) => handleKeyDown(e, values.to, toInput)}
				type="text"
				placeholder="Add recipient"
				class="flex-1 min-w-[120px] bg-transparent text-sm outline-none placeholder:text-text-muted"
			/>
		</div>
	</div>

	<!-- Cc field (toggleable) -->
	{#if showCc}
		<div class="flex items-center gap-2">
			<label for="cc-input" class="w-12 text-sm font-medium text-text-muted">Cc:</label>
			<div class="flex flex-1 flex-wrap items-center gap-2 rounded-md border border-border bg-bg-primary px-2 py-1 focus-within:border-ring">
				{#each values.cc as addr, index}
					<span class="flex items-center gap-1 rounded-sm bg-bg-hover px-2 py-0.5 text-sm">
						{addr.name ? `${addr.name} <${addr.email}>` : addr.email}
						<button
							type="button"
							class="hover:text-text-muted text-text"
							onclick={() => removeRecipient(values.cc, index)}
							aria-label="Remove recipient"
						>
							<X class="size-3" />
						</button>
					</span>
				{/each}
				<input
					id="cc-input"
					bind:value={ccInput}
					onkeydown={(e) => handleKeyDown(e, values.cc, ccInput)}
					type="text"
					placeholder="Add Cc recipient"
					class="flex-1 min-w-[120px] bg-transparent text-sm outline-none placeholder:text-text-muted"
				/>
			</div>
		</div>
	{/if}

	<!-- Bcc field (toggleable) -->
	{#if showBcc}
		<div class="flex items-center gap-2">
			<label for="bcc-input" class="w-12 text-sm font-medium text-text-muted">Bcc:</label>
			<div class="flex flex-1 flex-wrap items-center gap-2 rounded-md border border-border bg-bg-primary px-2 py-1 focus-within:border-ring">
				{#each values.bcc as addr, index}
					<span class="flex items-center gap-1 rounded-sm bg-bg-hover px-2 py-0.5 text-sm">
						{addr.name ? `${addr.name} <${addr.email}>` : addr.email}
						<button
							type="button"
							class="hover:text-text-muted text-text"
							onclick={() => removeRecipient(values.bcc, index)}
							aria-label="Remove recipient"
						>
							<X class="size-3" />
						</button>
					</span>
				{/each}
				<input
					id="bcc-input"
					bind:value={bccInput}
					onkeydown={(e) => handleKeyDown(e, values.bcc, bccInput)}
					type="text"
					placeholder="Add Bcc recipient"
					class="flex-1 min-w-[120px] bg-transparent text-sm outline-none placeholder:text-text-muted"
				/>
			</div>
		</div>
	{/if}

	<!-- Cc/Bcc toggle buttons -->
	<div class="flex items-center gap-2">
		<div class="w-12"></div>
		<div class="flex gap-2">
			{#if !showCc}
				<Button
					variant="ghost"
					size="sm"
					class="h-6 px-2 text-xs"
					onclick={() => (showCc = true)}
				>
					<Plus class="size-3" />
					Cc
				</Button>
			{/if}
			{#if !showBcc}
				<Button
					variant="ghost"
					size="sm"
					class="h-6 px-2 text-xs"
					onclick={() => (showBcc = true)}
				>
					<Plus class="size-3" />
					Bcc
				</Button>
			{/if}
		</div>
	</div>

	<!-- Subject field -->
	<div class="flex items-center gap-2">
		<label for="subject-input" class="w-12 text-sm font-medium text-text-muted">Subject:</label>
		<Input
			id="subject-input"
			bind:value={values.subject}
			placeholder="Enter subject"
			class="flex-1"
		/>
	</div>
</div>
