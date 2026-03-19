<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '$lib/utils.js';

	type Props = HTMLAttributes<HTMLDivElement> & {
		src?: string;
		alt?: string;
		fallback?: string;
		size?: 'sm' | 'md' | 'lg' | 'xl';
	};

	let {
		src,
		alt = 'Avatar',
		fallback,
		size = 'md',
		class: className,
		...restProps
	}: Props = $props();

	const sizeClasses = {
		sm: 'h-6 w-6 text-[10px]',
		md: 'h-8 w-8 text-xs',
		lg: 'h-10 w-10 text-sm',
		xl: 'h-12 w-12 text-base'
	};

	let hasError = $state(false);
	let imageLoaded = $state(false);

	function getInitials(name: string): string {
		return name
			.split(' ')
			.map((n) => n[0])
			.join('')
			.toUpperCase()
			.slice(0, 2);
	}

	function getInitialsFromEmail(email: string): string {
		return email[0].toUpperCase();
	}

	let avatarFallback = $derived(fallback || getInitials(alt) || getInitialsFromEmail(alt));
</script>

<div class={cn('relative flex shrink-0 overflow-hidden rounded-full', sizeClasses[size], className)} {...restProps}>
	{#if src && !hasError}
		<img
			{src}
			{alt}
			onerror={() => hasError = true}
			onload={() => imageLoaded = true}
			class:opacity-0={!imageLoaded}
			class="aspect-square h-full w-full object-cover transition-opacity"
		/>
	{/if}
	{#if !src || hasError || !imageLoaded}
		<span class="flex h-full w-full items-center justify-center bg-zinc-100 font-medium text-zinc-600">
			{avatarFallback}
		</span>
	{/if}
</div>
