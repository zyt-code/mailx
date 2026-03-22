<script lang="ts">
	import { ContextMenu as ContextMenuPrimitive } from "bits-ui";
	import { cn, type WithoutChild } from "$lib/utils.js";

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithoutChild<ContextMenuPrimitive.ContentProps> = $props();
</script>

<ContextMenuPrimitive.Portal>
	<ContextMenuPrimitive.Content
		bind:ref
		class={cn(
			"z-50 min-w-[180px] overflow-hidden rounded-md border p-1",
			"border-[var(--border-primary)] bg-[var(--bg-primary)]",
			"shadow-[var(--shadow-md)]",
			"animate-in fade-in-0 zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2",
			className
		)}
		{...restProps}
	>
		{@render children?.()}
	</ContextMenuPrimitive.Content>
</ContextMenuPrimitive.Portal>
