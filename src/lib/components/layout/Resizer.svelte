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
		'w-px shrink-0 cursor-col-resize relative group',
		dragging ? 'bg-[var(--border-secondary)]' : 'bg-[var(--border-primary)] hover:bg-[var(--border-secondary)]'
	)}
	style="transition: background-color 75ms ease;"
	onpointerdown={onPointerDown}
	onpointermove={onPointerMove}
	onpointerup={onPointerUp}
	onkeydown={onKeyDown}
>
	<!-- Invisible wider hit area -->
	<div class="absolute inset-y-0 -left-1 -right-1"></div>
</div>
