<script lang="ts">
	import { displayedEmails } from '$lib/stores/mailStore.js';

	interface Props {
		selectedMailId?: string | null;
		onSelectMail?: (id: string) => void;
	}

	let { selectedMailId = null, onSelectMail }: Props = $props();

	let visibleMailIds = $state<string[]>([]);

	$effect(() => {
		const unsubscribe = displayedEmails.subscribe((mails) => {
			visibleMailIds = mails.map((mail) => mail.id);
		});

		return unsubscribe;
	});
</script>

<div
	data-testid="mock-mail-list"
	data-selected-mail-id={selectedMailId ?? ''}
	data-mail-ids={visibleMailIds.join(',')}
></div>
<button
	type="button"
	aria-label="mock-select-mail"
	onclick={() => {
		const firstMailId = visibleMailIds[0];
		if (firstMailId) {
			onSelectMail?.(firstMailId);
		}
	}}
>
	select first visible mail
</button>
