<script lang="ts">
	interface Props {
		selectedMailId?: string | null;
		onSelectMail?: (id: string) => void;
	}

	let { selectedMailId = null, onSelectMail }: Props = $props();
</script>

<div data-testid="mock-mail-list" data-selected-mail-id={selectedMailId ?? ''}></div>
<button type="button" aria-label="mock-select-mail" onclick={() => onSelectMail?.('mail-1')}>
	select mail
</button>
