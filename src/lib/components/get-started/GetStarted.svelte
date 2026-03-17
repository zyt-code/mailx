<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { ArrowRight, Mail, Lock, Send, Archive } from 'lucide-svelte';
	import { goto } from '$app/navigation';

	interface Props {
		onOpenSettings?: () => void;
	}

	let { onOpenSettings }: Props = $props();

	function handleAddAccount(event: MouseEvent) {
		event.preventDefault();
		event.stopPropagation();
		onOpenSettings?.();
	}
</script>

<div class="flex h-full w-full items-center justify-center bg-white">
	<div class="flex flex-col items-center gap-8 text-center max-w-md">
		<!-- Icon -->
		<div class="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/20">
			<Mail class="size-8 text-white" strokeWidth={1.5} />
		</div>

		<!-- Content -->
		<div class="flex flex-col gap-3">
			<h1 class="text-2xl font-semibold text-zinc-900">Welcome to Mailx</h1>
			<p class="text-[15px] text-zinc-500 leading-relaxed max-w-sm">
				A modern email client with a clean, minimal design. Add your first account to get started.
			</p>
		</div>

		<!-- CTA Button -->
		<Button
			onclick={onOpenSettings}
			class="gap-2 bg-zinc-900 text-white hover:bg-zinc-800 shadow-lg shadow-zinc-900/10"
		>
			Add your first account
			<ArrowRight class="size-4" strokeWidth={2} />
		</Button>

		<!-- Feature hints -->
		<div class="flex items-center gap-6 pt-4 border-t border-zinc-100">
			<div class="flex items-center gap-2 text-zinc-400">
				<Lock class="size-4" strokeWidth={1.5} />
				<span class="text-xs">Secure</span>
			</div>
			<div class="flex items-center gap-2 text-zinc-400">
				<Send class="size-4" strokeWidth={1.5} />
				<span class="text-xs">Fast</span>
			</div>
			<div class="flex items-center gap-2 text-zinc-400">
				<Archive class="size-4" strokeWidth={1.5} />
				<span class="text-xs">Organized</span>
			</div>
		</div>
	</div>
</div>
