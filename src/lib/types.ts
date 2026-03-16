export interface Mail {
	id: string;
	from: string;
	subject: string;
	preview: string;
	body: string;
	time: string;
	unread: boolean;
	folder: Folder;
}

export type Folder = 'inbox' | 'sent' | 'drafts' | 'trash';
