<script lang="ts">
	import { ContextMenu as ContextMenuPrimitive } from "bits-ui";
	import { cn, type WithoutChild } from "$lib/utils.js";

	let {
		ref = $bindable(null),
		class: className,
		inset,
		children,
		...restProps
	}: WithoutChild<ContextMenuPrimitive.ItemProps> & {
		inset?: boolean;
	} = $props();
</script>

<ContextMenuPrimitive.Item
	bind:ref
	class={cn(
		"relative flex cursor-default select-none items-center gap-2 rounded-md px-2 py-1.5 text-[13px] text-zinc-700 outline-none transition-colors",
		"data-[highlighted]:bg-zinc-100 data-[highlighted]:text-zinc-900",
		"data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
		inset && "pl-8",
		className
	)}
	{...restProps}
>
	{@render children?.()}
</ContextMenuPrimitive.Item>
