<script lang="ts">
	import { cn } from '$lib/utils.js';

	interface Props {
		onResize: (deltaX: number) => void;
		onResizeEnd: () => void;
	}

	let { onResize, onResizeEnd }: Props = $props();

	let dragging = $state(false);
	let startX = 0;

	function onPointerDown(e: PointerEvent) {
		const target = e.currentTarget as HTMLElement;
		target.setPointerCapture(e.pointerId);
		dragging = true;
		startX = e.clientX;
		document.body.classList.add('select-none');
	}

	function onPointerMove(e: PointerEvent) {
		if (!dragging) return;
		const deltaX = e.clientX - startX;
		startX = e.clientX;
		onResize(deltaX);
	}

	function onPointerUp(e: PointerEvent) {
		if (!dragging) return;
		const target = e.currentTarget as HTMLElement;
		target.releasePointerCapture(e.pointerId);
		dragging = false;
		document.body.classList.remove('select-none');
		onResizeEnd();
	}

	function onKeyDown(e: KeyboardEvent) {
		if (e.key === 'ArrowLeft') {
			e.preventDefault();
			onResize(-10);
			onResizeEnd();
		} else if (e.key === 'ArrowRight') {
			e.preventDefault();
			onResize(10);
			onResizeEnd();
		}
	}
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
	role="separator"
	aria-orientation="vertical"
	tabindex="0"
	class={cn(
		'w-1.5 shrink-0 cursor-col-resize transition-all duration-200 relative',
		dragging
			? 'bg-zinc-300'
			: 'bg-transparent hover:bg-zinc-200/80'
	)}
	onpointerdown={onPointerDown}
	onpointermove={onPointerMove}
	onpointerup={onPointerUp}
	onkeydown={onKeyDown}
>
	<!-- Visual indicator on hover/drag -->
	{#if dragging}
		<div class="absolute inset-0 flex items-center justify-center">
			<div class="w-0.5 h-12 bg-zinc-400 rounded-full"></div>
		</div>
	{:else}
		<div class="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
			<div class="w-0.5 h-8 bg-zinc-400 rounded-full"></div>
		</div>
	{/if}
</div>
