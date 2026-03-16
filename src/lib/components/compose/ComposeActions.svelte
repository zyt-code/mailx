<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { X, Send, Trash2 } from 'lucide-svelte';

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

		// Less than 1 minute
		if (diff < 60000) {
			return 'Just now';
		}

		// Less than 1 hour
		if (diff < 3600000) {
			const mins = Math.floor(diff / 60000);
			return `${mins}m ago`;
		}

		// Today
		if (date.toDateString() === now.toDateString()) {
			return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
		}

		// Otherwise show date
		return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	}
</script>

<div class="flex items-center justify-between border-t border-border p-4">
	<!-- Left: Last saved status -->
	<div class="flex-1">
		{#if lastSaved}
			<span class="text-xs text-text-muted">
				Saved {formatLastSaved(lastSaved)}
			</span>
		{:else}
			<span class="text-xs text-text-muted">
				Draft not saved
			</span>
		{/if}
	</div>

	<!-- Right: Action buttons -->
	<div class="flex items-center gap-2">
		<Button
			variant="ghost"
			size="sm"
			onclick={onDiscard}
			disabled={isSending}
		>
			<Trash2 class="size-4" />
			<span class="hidden sm:inline">Discard</span>
		</Button>

		<Button
			variant="default"
			size="sm"
			onclick={onSend}
			disabled={isSending}
		>
			<Send class="size-4" />
			{isSending ? 'Sending...' : 'Send'}
		</Button>

		<Button
			variant="ghost"
			size="icon-sm"
			onclick={onClose}
			class="ml-2"
			aria-label="Close"
		>
			<X class="size-4" />
		</Button>
	</div>
</div>
