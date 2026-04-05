<script lang="ts">
	interface Props {
		onOpenSettings?: () => void;
	}

	let { onOpenSettings }: Props = $props();
</script>

<button
	type="button"
	aria-label="mock-get-started-open-settings"
	onclick={() => onOpenSettings?.()}
>
	open get-started settings
</button>
