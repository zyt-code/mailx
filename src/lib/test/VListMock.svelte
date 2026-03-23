<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		data?: unknown[];
		style?: string;
		children?: Snippet<[unknown, number]>;
	}

	let { data = [], style, children }: Props = $props();
</script>

<div {style}>
	{#each data as item, index}
		{@render children?.(item, index)}
	{/each}
</div>
