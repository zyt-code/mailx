<script lang="ts">
	import type { Mail } from '$lib/types.js';

	interface Props {
		mail?: Mail | null;
	}

	let { mail = null }: Props = $props();
</script>

<div data-testid="mock-reading-pane" data-mail-id={mail?.id ?? ''}></div>
