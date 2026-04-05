<script lang="ts">
	interface Props {
		onSelectAccount?: (accountId: string | null) => void;
		onSelectFolder?: (folder: 'inbox' | 'sent' | 'drafts' | 'trash' | 'archive') => void;
	}

	let { onSelectAccount, onSelectFolder }: Props = $props();
</script>

<button type="button" aria-label="mock-select-account" onclick={() => onSelectAccount?.('acc-1')}>
	select account
</button>
<button type="button" aria-label="mock-select-folder" onclick={() => onSelectFolder?.('sent')}>
	select folder
</button>
