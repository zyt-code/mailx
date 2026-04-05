<script lang="ts">
	import type { Mail } from '$lib/types.js';

	interface Props {
		mail?: Mail | null;
		onBack?: () => void;
	}

	let { mail = null, onBack }: Props = $props();
</script>

<div data-testid="mock-reading-pane" data-mail-id={mail?.id ?? ''}></div>
<button type="button" aria-label="mock-back-to-list" onclick={() => onBack?.()}>
	back to list
</button>
