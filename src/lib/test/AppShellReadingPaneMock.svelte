<script lang="ts">
	import type { Mail } from '$lib/types.js';

	interface Props {
		mail?: Mail | null;
		onBack?: () => void;
		onRemoveMail?: (mail: Mail) => void;
	}

	let { mail = null, onBack, onRemoveMail }: Props = $props();
</script>

<div data-testid="mock-reading-pane" data-mail-id={mail?.id ?? ''}></div>
<button
	type="button"
	aria-label="mock-reading-pane-archive"
	onclick={() => {
		if (mail) {
			onRemoveMail?.(mail);
		}
	}}
>
	archive in reading pane
</button>
<button
	type="button"
	aria-label="mock-reading-pane-delete"
	onclick={() => {
		if (mail) {
			onRemoveMail?.(mail);
		}
	}}
>
	delete in reading pane
</button>
<button type="button" aria-label="mock-back-to-list" onclick={() => onBack?.()}>
	back to list
</button>
