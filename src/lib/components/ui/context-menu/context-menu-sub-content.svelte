<script lang="ts">
	import { ContextMenu as ContextMenuPrimitive } from "bits-ui";
	import { cn, type WithoutChild } from "$lib/utils.js";

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithoutChild<ContextMenuPrimitive.SubContentProps> = $props();
</script>

<ContextMenuPrimitive.SubContent
	bind:ref
	class={cn(
		"z-50 min-w-[8rem] w-auto overflow-hidden rounded-md border p-1",
		"border-[var(--border-primary)] bg-[var(--bg-primary)]",
		"shadow-[var(--shadow-md)]",
		"animate-in fade-in-0 zoom-in-95 data-[side=right]:slide-in-from-left-2 data-[side=left]:slide-in-from-right-2",
		className
	)}
	{...restProps}
>
	{@render children?.()}
</ContextMenuPrimitive.SubContent>
