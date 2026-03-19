import { invoke } from '@tauri-apps/api/core';
import type { Mail, Folder } from '$lib/types.js';

/**
 * Get all mails, optionally filtered by folder and account
 */
export async function getMails(folder?: Folder, accountId?: string | null): Promise<Mail[]> {
	return invoke<Mail[]>('get_mails', { folder, account_id: accountId });
}

/**
 * Get a single mail by ID
 */
export async function getMail(id: string): Promise<Mail> {
	return invoke<Mail>('get_mail', { id });
}

/**
 * Create a new mail
 */
export async function createMail(mail: Omit<Mail, 'id'> & { id?: string }): Promise<string> {
	const id = mail.id || crypto.randomUUID();
	const isRead = mail.is_read ?? !(mail.unread ?? true);
	const fullMail: Mail = {
		id,
		from_name: mail.from_name,
		from_email: mail.from_email || mail.from_name,
		subject: mail.subject,
		preview: mail.preview || '',
		body: mail.body || '',
		timestamp: mail.timestamp || Date.now(),
		folder: mail.folder || 'inbox',
		unread: isRead ? false : true,
		is_read: isRead
	};
	await invoke('create_mail', { mail: fullMail });
	return id;
}

/**
 * Update an existing mail
 */
export async function updateMail(mail: Mail): Promise<void> {
	await invoke('update_mail', { mail });
}

/**
 * Delete a mail by ID
 */
export async function deleteMail(id: string): Promise<void> {
	await invoke('delete_mail', { id });
}

/**
 * Mark a mail as read or unread
 */
export async function markMailRead(id: string, read: boolean): Promise<void> {
	await invoke('mark_mail_read', { id, read });
}

/**
 * Mark a mail as read on the IMAP server (syncs \Seen flag via UID)
 */
export async function markMailAsRead(uid: number, accountId: string): Promise<void> {
	await invoke('mark_as_read', { uid, account_id: accountId });
}

/**
 * Move a mail to trash (or permanent delete if already in trash)
 */
export async function moveToTrash(id: string, currentFolder: Folder): Promise<void> {
	await invoke('move_to_trash', { id, currentFolder });
}

/**
 * Move a mail to archive
 */
export async function moveToArchive(id: string): Promise<void> {
	await invoke('archive_mail', { id });
}

/**
 * Unarchive a mail (move back to inbox)
 */
export async function unarchiveMail(id: string): Promise<void> {
	await invoke('unarchive_mail', { id });
}

/**
 * Toggle star status for a mail
 */
export async function toggleStar(id: string, starred: boolean): Promise<void> {
	await invoke('toggle_star', { id, starred });
}

/**
 * Get unread mail count for a folder
 */
export async function getUnreadCount(folder: Folder): Promise<number> {
	return invoke<number>('get_unread_count', { folder });
}

/**
 * Clear all mails from the database (for re-syncing clean data)
 */
export async function clearDatabase(): Promise<void> {
	return invoke('clear_database');
}
