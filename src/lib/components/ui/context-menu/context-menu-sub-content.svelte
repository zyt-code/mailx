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
		"z-50 min-w-[160px] overflow-hidden rounded-lg border border-zinc-200/80 bg-white/95 p-1 shadow-lg backdrop-blur-md",
		"animate-in fade-in-0 zoom-in-95 data-[side=right]:slide-in-from-left-2 data-[side=left]:slide-in-from-right-2",
		className
	)}
	{...restProps}
>
	{@render children?.()}
</ContextMenuPrimitive.SubContent>
