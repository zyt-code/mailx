<script lang="ts">
	import { Send, Trash2 } from 'lucide-svelte';

	interface Props {
		lastSaved: Date | null;
		isSending: boolean;
		onSend: () => void;
		onDiscard: () => void;
		onClose: () => void;
	}

	let { lastSaved, isSending, onSend, onDiscard, onClose }: Props = $props();

	function formatLastSaved(date: Date): string {
		const now = new Date();
		const diff = now.getTime() - date.getTime();

		if (diff < 60000) return 'Just now';
		if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;

		if (date.toDateString() === now.toDateString()) {
			return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
		}

		return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	}
</script>

<div class="flex items-center justify-between border-t border-zinc-100 px-5 py-3">
	<!-- Save status -->
	<div class="flex-1">
		{#if lastSaved}
			<span class="text-[11px] text-zinc-400">Saved {formatLastSaved(lastSaved)}</span>
		{:else}
			<span class="text-[11px] text-zinc-300">Not saved</span>
		{/if}
	</div>

	<!-- Actions -->
	<div class="flex items-center gap-2">
		<button
			onclick={onDiscard}
			disabled={isSending}
			class="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] text-zinc-500 hover:bg-zinc-50 hover:text-zinc-700 disabled:opacity-30 transition-colors"
		>
			<Trash2 class="size-3.5" strokeWidth={1.5} />
			<span class="hidden sm:inline">Discard</span>
		</button>

		<button
			onclick={onSend}
			disabled={isSending}
			class="flex items-center gap-1.5 rounded-lg bg-zinc-900 px-4 py-1.5 text-[13px] font-medium text-white hover:bg-zinc-800 disabled:opacity-50 active:scale-[0.98] transition-colors"
		>
			<Send class="size-3.5" strokeWidth={1.5} />
			{isSending ? 'Sending...' : 'Send'}
		</button>
	</div>
</div>
