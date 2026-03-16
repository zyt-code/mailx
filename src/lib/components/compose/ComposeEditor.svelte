<script lang="ts">
	interface Props {
		value: string;
	}

	let { value = $bindable() }: Props = $props();
</script>

<textarea
	bind:value
	placeholder="Write your message..."
	class="flex-1 min-h-[300px] resize-none p-4 focus:outline-none text-sm leading-relaxed"
></textarea>
