<script lang="ts">
	import ScrollArea from '$lib/components/ui/scroll-area/scroll-area.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Mail as MailIcon, ArrowLeft } from 'lucide-svelte';
	import type { Mail } from '$lib/types.js';

	interface Props {
		mail: Mail | null;
		isMobile: boolean;
		onBack: () => void;
	}

	let { mail, isMobile, onBack }: Props = $props();
</script>

<div class="flex flex-1 min-w-0 h-full bg-bg-primary">
	{#if mail}
		<div class="flex flex-1 flex-col">
			<!-- Email header -->
			<div class="flex items-start gap-3 border-b border-border p-4">
				{#if isMobile}
					<Button variant="ghost" size="icon-sm" onclick={onBack} aria-label="Back to list">
						<ArrowLeft class="size-4" />
					</Button>
				{/if}
				<div class="flex-1 min-w-0">
					<h2 class="text-lg font-semibold text-text">{mail.subject}</h2>
					<div class="flex items-center gap-2 mt-1">
						<span class="text-sm text-text">{mail.from}</span>
						<span class="text-xs text-text-muted">{mail.time}</span>
					</div>
				</div>
			</div>

			<!-- Email body -->
			<ScrollArea class="flex-1">
				<div class="p-4">
					<p class="text-sm text-text leading-relaxed whitespace-pre-wrap">{mail.body}</p>
				</div>
			</ScrollArea>
		</div>
	{:else}
		<ScrollArea class="flex-1">
			<div class="flex h-full items-center justify-center">
				<div class="flex flex-col items-center gap-3 text-text-muted">
					<MailIcon class="size-10 opacity-40" />
					<p class="text-sm">Select an email to read</p>
				</div>
			</div>
		</ScrollArea>
	{/if}
</div>
