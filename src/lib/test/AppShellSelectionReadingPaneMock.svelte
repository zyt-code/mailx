<script lang="ts">
	import type { Mail } from '$lib/types.js';

	interface Props {
		mail?: Mail | null;
		onRefresh?: () => void;
		onRemoveMail?: (mail: Mail) => void;
	}

	let { mail = null, onRefresh, onRemoveMail }: Props = $props();
</script>

<div data-testid="mock-reading-pane" data-mail-id={mail?.id ?? ''}></div>
<button
	type="button"
	aria-label="mock-reading-pane-delete"
	onclick={() => {
		if (mail) {
			onRemoveMail?.(mail);
		}
		onRefresh?.();
	}}
>
	delete in reading pane
</button>
