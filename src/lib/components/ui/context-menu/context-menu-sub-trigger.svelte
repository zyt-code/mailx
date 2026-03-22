<script lang="ts">
	import { ContextMenu as ContextMenuPrimitive } from "bits-ui";
	import { cn, type WithoutChild } from "$lib/utils.js";
	import { ChevronRight } from "lucide-svelte";

	let {
		ref = $bindable(null),
		class: className,
		inset,
		children,
		...restProps
	}: WithoutChild<ContextMenuPrimitive.SubTriggerProps> & {
		inset?: boolean;
	} = $props();
</script>

<ContextMenuPrimitive.SubTrigger
	bind:ref
	class={cn(
		"relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-[13px] outline-none transition-colors duration-100",
		"text-[var(--text-secondary)]",
		"data-[highlighted]:bg-[var(--bg-hover)] data-[highlighted]:text-[var(--text-primary)]",
		"data-[state=open]:bg-[var(--bg-hover)]",
		inset && "pl-8",
		className
	)}
	{...restProps}
>
	{@render children?.()}
	<ChevronRight class="size-3.5 text-[var(--text-tertiary)] shrink-0" />
</ContextMenuPrimitive.SubTrigger>
