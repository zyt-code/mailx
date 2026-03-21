export type Folder = 'inbox' | 'sent' | 'drafts' | 'trash' | 'archive';

export interface Attachment {
	id: string;
	mail_id: string;
	file_name: string;
	content_type: string;
	size: number;
	stored_path: string;
	created_at: number;
}

export interface Mail {
	id: string;
	from_name: string;
	from_email: string;
	subject: string;
	preview: string;
	body: string;
	timestamp: number; // Unix milliseconds
	folder: Folder;
	unread?: boolean;
	is_read: boolean;
	// Compose functionality fields
	to?: EmailAddress[];
	cc?: EmailAddress[];
	bcc?: EmailAddress[];
	// Extended display fields
	html_body?: string;
	reply_to?: EmailAddress[];
	attachments?: Attachment[];
	starred?: boolean;
	has_attachments?: boolean;
	// IMAP sync fields
	account_id?: string;
	uid?: number;
}

export interface EmailAddress {
	name: string;
	email: string;
}

// ============================================================================
// Account Management Types
// ============================================================================

export interface Account {
	id: string;
	email: string;
	name: string;
	imap_server: string;
	imap_port: number;
	imap_use_ssl: boolean;
	smtp_server: string;
	smtp_port: number;
	smtp_use_ssl: boolean;
	is_active: boolean;
	created_at: number;
	updated_at: number;
}

export interface ImapConfig {
	server: string;
	port: number;
	use_ssl: boolean;
}

export interface SmtpConfig {
	server: string;
	port: number;
	use_ssl: boolean;
}

export type SyncState = 'idle' | 'syncing' | 'failed' | 'cancelled';

export interface SyncStatus {
	account_id: string;
	account_email: string;
	status: SyncState;
	last_sync?: number;
	error_message?: string;
	retry_count: number;
	new_count?: number;
}

export interface OutboxItem {
	id: string;
	account_id: string;
	mail_data: string;
	recipients: string;
	status: 'pending' | 'sending' | 'sent' | 'failed';
	error_message?: string;
	retry_count: number;
	created_at: number;
	updated_at: number;
}

// ============================================================================
// Form Types
// ============================================================================

export interface AccountFormData {
	email: string;
	name: string;
	password: string;
	imap_server: string;
	imap_port: number;
	imap_use_ssl: boolean;
	smtp_server: string;
	smtp_port: number;
	smtp_use_ssl: boolean;
}

export interface ConnectionTestResult {
	imap: boolean;
	smtp: boolean;
	error?: string;
}
