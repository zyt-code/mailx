import { Archive, FileEdit, Folder as FolderIcon, Inbox, Send, Trash2 } from 'lucide-svelte';
import type { Folder, MailboxFolder, SystemFolder } from '$lib/types.js';

export type SidebarFolderItem = {
	folder: Folder;
	kind: 'system' | 'custom';
	label: string;
	labelKey?: string;
	icon: any;
	systemKey?: SystemFolder;
};

const SYSTEM_FOLDER_ITEMS: SidebarFolderItem[] = [
	{ folder: 'inbox', kind: 'system', systemKey: 'inbox', label: 'Inbox', labelKey: 'nav.inbox', icon: Inbox },
	{ folder: 'sent', kind: 'system', systemKey: 'sent', label: 'Sent', labelKey: 'nav.sent', icon: Send },
	{
		folder: 'drafts',
		kind: 'system',
		systemKey: 'drafts',
		label: 'Drafts',
		labelKey: 'nav.drafts',
		icon: FileEdit
	},
	{
		folder: 'archive',
		kind: 'system',
		systemKey: 'archive',
		label: 'Archive',
		labelKey: 'nav.archive',
		icon: Archive
	},
	{ folder: 'trash', kind: 'system', systemKey: 'trash', label: 'Trash', labelKey: 'nav.trash', icon: Trash2 }
];

export function buildSidebarFolderItems(
	folders: MailboxFolder[],
	selectedAccountId: string | null
): SidebarFolderItem[] {
	if (selectedAccountId === null) {
		return [...SYSTEM_FOLDER_ITEMS];
	}

	const customFolders = folders
		.filter((folder) => folder.kind === 'custom')
		.slice()
		.sort((left, right) => left.label.localeCompare(right.label))
		.map(
			(folder): SidebarFolderItem => ({
				folder: folder.id,
				kind: 'custom',
				label: folder.label,
				icon: FolderIcon
			})
		);

	return [...SYSTEM_FOLDER_ITEMS, ...customFolders];
}
