<script lang="ts">
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
		// Allow paste shortcuts (Cmd+V / Ctrl+V) to pass through
		if ((event.metaKey || event.ctrlKey) && event.key === 'v') {
			return; // Let the default paste behavior happen
		}

		if (event.key === 'Enter' || event.key === ',') {
			event.preventDefault();
			addRecipient(list, inputValue);
		} else if (event.key === 'Backspace' && !inputValue) {
			if (list.length > 0) {
				list.pop();
			}
		}
	}
</script>

<div class="flex flex-col border-b border-zinc-100">
	<!-- To -->
	<div class="flex items-center gap-2 px-5 py-2 border-b border-zinc-50">
		<label for="to-input" class="text-[13px] text-zinc-400 w-8 shrink-0">To</label>
		<div class="flex flex-1 flex-wrap items-center gap-1.5">
			{#each values.to as addr, index}
				<span class="flex items-center gap-1 rounded-md bg-zinc-100 px-2 py-0.5 text-[12px] text-zinc-600">
					{addr.name ? addr.name : addr.email}
					<button
						type="button"
						class="text-zinc-400 hover:text-zinc-600"
						onclick={() => removeRecipient(values.to, index)}
						aria-label="Remove"
					>
						<X class="size-3" strokeWidth={1.5} />
					</button>
				</span>
			{/each}
			<input
				id="to-input"
				bind:value={toInput}
				onkeydown={(e) => handleKeyDown(e, values.to, toInput)}
				type="text"
				placeholder={values.to.length === 0 ? "Recipients" : ""}
				class="flex-1 min-w-[100px] bg-transparent text-[13px] text-zinc-900 outline-none placeholder:text-zinc-300"
				onpaste={(e) => { /* Allow paste */ }}
			/>
		</div>
		<div class="flex gap-1">
			{#if !showCc}
				<button onclick={() => showCc = true} class="text-[11px] text-zinc-400 hover:text-zinc-600 px-1">Cc</button>
			{/if}
			{#if !showBcc}
				<button onclick={() => showBcc = true} class="text-[11px] text-zinc-400 hover:text-zinc-600 px-1">Bcc</button>
			{/if}
		</div>
	</div>

	<!-- Cc -->
	{#if showCc}
		<div class="flex items-center gap-2 px-5 py-2 border-b border-zinc-50">
			<label for="cc-input" class="text-[13px] text-zinc-400 w-8 shrink-0">Cc</label>
			<div class="flex flex-1 flex-wrap items-center gap-1.5">
				{#each values.cc as addr, index}
					<span class="flex items-center gap-1 rounded-md bg-zinc-100 px-2 py-0.5 text-[12px] text-zinc-600">
						{addr.name ? addr.name : addr.email}
						<button type="button" class="text-zinc-400 hover:text-zinc-600" onclick={() => removeRecipient(values.cc, index)} aria-label="Remove">
							<X class="size-3" strokeWidth={1.5} />
						</button>
					</span>
				{/each}
				<input
					id="cc-input"
					bind:value={ccInput}
					onkeydown={(e) => handleKeyDown(e, values.cc, ccInput)}
					type="text"
					placeholder=""
					class="flex-1 min-w-[100px] bg-transparent text-[13px] text-zinc-900 outline-none placeholder:text-zinc-300"
					onpaste={(e) => { /* Allow paste */ }}
				/>
			</div>
		</div>
	{/if}

	<!-- Bcc -->
	{#if showBcc}
		<div class="flex items-center gap-2 px-5 py-2 border-b border-zinc-50">
			<label for="bcc-input" class="text-[13px] text-zinc-400 w-8 shrink-0">Bcc</label>
			<div class="flex flex-1 flex-wrap items-center gap-1.5">
				{#each values.bcc as addr, index}
					<span class="flex items-center gap-1 rounded-md bg-zinc-100 px-2 py-0.5 text-[12px] text-zinc-600">
						{addr.name ? addr.name : addr.email}
						<button type="button" class="text-zinc-400 hover:text-zinc-600" onclick={() => removeRecipient(values.bcc, index)} aria-label="Remove">
							<X class="size-3" strokeWidth={1.5} />
						</button>
					</span>
				{/each}
				<input
					id="bcc-input"
					bind:value={bccInput}
					onkeydown={(e) => handleKeyDown(e, values.bcc, bccInput)}
					type="text"
					placeholder=""
					class="flex-1 min-w-[100px] bg-transparent text-[13px] text-zinc-900 outline-none placeholder:text-zinc-300"
					onpaste={(e) => { /* Allow paste */ }}
				/>
			</div>
		</div>
	{/if}

	<!-- Subject -->
	<div class="flex items-center gap-2 px-5 py-2">
		<label for="subject-input" class="text-[13px] text-zinc-400 w-8 shrink-0">Sub</label>
		<input
			id="subject-input"
			bind:value={values.subject}
			placeholder="Subject"
			class="flex-1 bg-transparent text-[13px] text-zinc-900 outline-none placeholder:text-zinc-300 font-medium"
			onpaste={(e) => { /* Allow paste */ }}
		/>
	</div>
</div>
