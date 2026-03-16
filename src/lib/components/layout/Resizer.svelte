<script lang="ts">
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
	class="w-1.5 shrink-0 cursor-col-resize bg-transparent hover:bg-border active:bg-accent transition-colors"
	class:bg-accent={dragging}
	onpointerdown={onPointerDown}
	onpointermove={onPointerMove}
	onpointerup={onPointerUp}
	onkeydown={onKeyDown}
></div>
