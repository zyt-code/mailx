<script lang="ts">
	interface Props {
		onSelectAccount?: (accountId: string | null) => void;
		onSelectFolder?: (folder: 'inbox' | 'sent' | 'drafts' | 'trash' | 'archive') => void;
		onOpenSettings?: () => void;
	}

	let { onSelectAccount, onSelectFolder, onOpenSettings }: Props = $props();
</script>

<button type="button" aria-label="mock-select-account" onclick={() => onSelectAccount?.('acc-1')}>
	select account 1
</button>
<button
	type="button"
	aria-label="mock-select-account-acc-2"
	onclick={() => onSelectAccount?.('acc-2')}
>
	select account 2
</button>
<button type="button" aria-label="mock-select-folder" onclick={() => onSelectFolder?.('sent')}>
	select folder
</button>
<button type="button" aria-label="mock-sidebar-open-settings" onclick={() => onOpenSettings?.()}>
	open sidebar settings
</button>
