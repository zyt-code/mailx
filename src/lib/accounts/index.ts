import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import type {
	Account,
	AccountFormData,
	ConnectionTestResult,
	Mail,
	SyncStatus,
} from '$lib/types';

/**
 * Get all accounts
 */
export async function getAccounts(): Promise<Account[]> {
	return invoke<Account[]>('get_accounts');
}

/**
 * Get a single account by ID
 */
export async function getAccount(id: string): Promise<Account> {
	return invoke<Account>('get_account', { id });
}

/**
 * Create a new account
 */
export async function createAccount(data: AccountFormData): Promise<string> {
	const account = {
		...data,
		id: crypto.randomUUID(),
		is_active: true,
		created_at: Date.now(),
		updated_at: Date.now(),
	};

	return invoke<string>('create_account', {
		account,
		password: data.password,
	});
}

/**
 * Update an existing account
 */
export async function updateAccount(
	id: string,
	data: Partial<AccountFormData>,
): Promise<void> {
	const existing = await getAccount(id);

	const account = {
		...existing,
		...data,
		id,
		updated_at: Date.now(),
	};

	return invoke<void>('update_account', {
		account,
		newPassword: data.password,
	});
}

/**
 * Delete an account
 */
export async function deleteAccount(id: string): Promise<void> {
	return invoke<void>('delete_account', { id });
}

/**
 * Test connection for an account
 */
export async function testConnection(id: string): Promise<void> {
	return invoke<void>('test_account_connection', { id });
}

/**
 * Sync a specific account
 */
export async function syncAccount(id: string): Promise<SyncStatus> {
	return invoke<SyncStatus>('sync_account', { id });
}

/**
 * Sync all active accounts
 */
export async function syncAllAccounts(): Promise<SyncStatus[]> {
	return invoke<SyncStatus[]>('sync_all_accounts');
}

/**
 * Get sync status for all accounts
 */
export async function getSyncStatus(): Promise<SyncStatus[]> {
	return invoke<SyncStatus[]>('get_sync_status');
}

/**
 * Send an email via SMTP
 */
export async function sendMail(mailId: string, accountId: string): Promise<void> {
	return invoke<void>('send_mail', {
		mailId,
		accountId,
	});
}

/**
 * Listen for account created events
 */
export function onAccountCreated(callback: (event: { id: string }) => void): Promise<UnlistenFn> {
	return listen('account:created', (event) => callback(event.payload as unknown as { id: string }));
}

/**
 * Listen for account updated events
 */
export function onAccountUpdated(callback: (event: { id: string }) => void): Promise<UnlistenFn> {
	return listen('account:updated', (event) => callback(event.payload as unknown as { id: string }));
}

/**
 * Listen for account deleted events
 */
export function onAccountDeleted(callback: (event: { id: string }) => void): Promise<UnlistenFn> {
	return listen('account:deleted', (event) => callback(event.payload as unknown as { id: string }));
}

/**
 * Listen for sync started events
 */
export function onSyncStarted(callback: (event: { account_id: string; email: string }) => void): Promise<UnlistenFn> {
	return listen('sync:started', (event) => callback(event.payload as unknown as { account_id: string; email: string }));
}

/**
 * Listen for sync completed events
 */
export function onSyncCompleted(callback: (status: SyncStatus) => void): Promise<UnlistenFn> {
	return listen('sync:completed', (event) => callback(event.payload as unknown as SyncStatus));
}

/**
 * Listen for mail sent events
 */
export function onMailSent(callback: (event: { id: string; account_id: string }) => void): Promise<UnlistenFn> {
	return listen('mail:sent', (event) => callback(event.payload as unknown as { id: string; account_id: string }));
}

/**
 * Listen for mails updated events
 */
export function onMailsUpdated(callback: () => void): Promise<UnlistenFn> {
	return listen('mails:updated', callback);
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get default IMAP settings for common email providers
 */
export function getDefaultImapSettings(email: string): { server: string; port: number; use_ssl: boolean } {
	const domain = email.split('@')[1]?.toLowerCase();

	const defaults: Record<string, { server: string; port: number; use_ssl: boolean }> = {
		'gmail.com': { server: 'imap.gmail.com', port: 993, use_ssl: true },
		'outlook.com': { server: 'outlook.office365.com', port: 993, use_ssl: true },
		'hotmail.com': { server: 'outlook.office365.com', port: 993, use_ssl: true },
		'yahoo.com': { server: 'imap.mail.yahoo.com', port: 993, use_ssl: true },
		'icloud.com': { server: 'imap.mail.me.com', port: 993, use_ssl: true },
		'163.com': { server: 'imap.163.com', port: 993, use_ssl: true },
		'126.com': { server: 'imap.126.com', port: 993, use_ssl: true },
		'qq.com': { server: 'imap.qq.com', port: 993, use_ssl: true },
		'foxmail.com': { server: 'imap.foxmail.com', port: 993, use_ssl: true },
	};

	return defaults[domain || ''] || { server: 'imap.' + domain, port: 993, use_ssl: true };
}

/**
 * Get default SMTP settings for common email providers
 */
export function getDefaultSmtpSettings(email: string): { server: string; port: number; use_ssl: boolean } {
	const domain = email.split('@')[1]?.toLowerCase();

	const defaults: Record<string, { server: string; port: number; use_ssl: boolean }> = {
		'gmail.com': { server: 'smtp.gmail.com', port: 587, use_ssl: true },
		'outlook.com': { server: 'smtp-mail.outlook.com', port: 587, use_ssl: true },
		'hotmail.com': { server: 'smtp-mail.outlook.com', port: 587, use_ssl: true },
		'yahoo.com': { server: 'smtp.mail.yahoo.com', port: 587, use_ssl: true },
		'icloud.com': { server: 'smtp.mail.me.com', port: 587, use_ssl: true },
		'163.com': { server: 'smtp.163.com', port: 465, use_ssl: true },
		'126.com': { server: 'smtp.126.com', port: 465, use_ssl: true },
		'qq.com': { server: 'smtp.qq.com', port: 465, use_ssl: true },
		'foxmail.com': { server: 'smtp.foxmail.com', port: 465, use_ssl: true },
	};

	return defaults[domain || ''] || { server: 'smtp.' + domain, port: 587, use_ssl: true };
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
	const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return re.test(email);
}

/**
 * Validate server settings
 */
export function validateServerSettings(server: string, port: number): boolean {
	return server.length > 0 && port > 0 && port <= 65535;
}
