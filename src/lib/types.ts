export type Folder = 'inbox' | 'sent' | 'drafts' | 'trash';

export interface Mail {
	id: string;
	from_name: string;
	from_email: string;
	subject: string;
	preview: string;
	body: string;
	timestamp: number; // Unix milliseconds
	folder: Folder;
	unread: boolean;
	// Future fields for compose functionality
	to?: EmailAddress[];
	cc?: EmailAddress[];
	bcc?: EmailAddress[];
}

export interface EmailAddress {
	name: string;
	email: string;
}

// Legacy compatibility - remove once all components use from_name/from_email
export interface MailLegacy {
	id: string;
	from: string;
	subject: string;
	preview: string;
	body: string;
	time: string;
	unread: boolean;
	folder: Folder;
}
