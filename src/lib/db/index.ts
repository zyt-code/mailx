import { invoke } from '@tauri-apps/api/core';
import type { Mail, Folder } from '$lib/types.js';

/**
 * Get all mails, optionally filtered by folder
 */
export async function getMails(folder?: Folder): Promise<Mail[]> {
	return invoke<Mail[]>('get_mails', { folder });
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
	const fullMail: Mail = {
		id,
		from_name: mail.from_name,
		from_email: mail.from_email || mail.from_name,
		subject: mail.subject,
		preview: mail.preview || '',
		body: mail.body || '',
		timestamp: mail.timestamp || Date.now(),
		folder: mail.folder || 'inbox',
		unread: mail.unread ?? true,
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
 * Move a mail to trash (or permanent delete if already in trash)
 */
export async function moveToTrash(id: string, currentFolder: Folder): Promise<void> {
	await invoke('move_to_trash', { id, currentFolder });
}
