<script lang="ts">
	interface Props {
		value: string;
	}

	let { value = $bindable() }: Props = $props();
</script>

<textarea
	bind:value
	placeholder="Write your message..."
	class="flex-1 min-h-[280px] resize-none px-5 py-3 text-[14px] text-zinc-700 leading-[1.7] focus:outline-none placeholder:text-zinc-300"
></textarea>
