<script lang="ts">
	import type { Mail, Folder } from '$lib/types.js';

	interface Props {
		selectedMailId?: string | null;
		onSelectMail?: (id: string) => void;
		onDelete?: (mail: Mail) => void;
		onArchive?: (mail: Mail) => void;
		onMoveTo?: (mail: Mail, folder: Folder) => void;
	}

	const mailOne: Mail = {
		id: 'mail-1',
		account_id: 'acc-1',
		folder: 'inbox',
		is_read: false,
		unread: true,
		subject: 'First mail',
		body: 'Body 1',
		html_body: '<p>Body 1</p>',
		from_name: 'Sender One',
		from_email: 'one@example.com',
		preview: 'Preview 1',
		timestamp: 1
	};

	let { selectedMailId = null, onSelectMail, onDelete, onArchive, onMoveTo }: Props = $props();
</script>

<div data-testid="mock-mail-list" data-selected-mail-id={selectedMailId ?? ''}></div>
<button type="button" aria-label="mock-select-mail-1" onclick={() => onSelectMail?.('mail-1')}>
	select first mail
</button>
<button type="button" aria-label="mock-delete-mail-1" onclick={() => onDelete?.(mailOne)}>
	delete first mail
</button>
<button type="button" aria-label="mock-archive-mail-1" onclick={() => onArchive?.(mailOne)}>
	archive first mail
</button>
<button
	type="button"
	aria-label="mock-move-mail-1"
	onclick={() => onMoveTo?.(mailOne, 'trash')}
>
	move first mail
</button>
