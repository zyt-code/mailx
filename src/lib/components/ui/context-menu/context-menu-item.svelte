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
		"relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-[13px] outline-none transition-colors duration-100",
		"text-[var(--text-secondary)]",
		"data-[highlighted]:bg-[var(--bg-hover)] data-[highlighted]:text-[var(--text-primary)]",
		"data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
		inset && "pl-8",
		className
	)}
	{...restProps}
>
	{@render children?.()}
</ContextMenuPrimitive.Item>
