import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import providerDefaults from '../config/provider-defaults.json';
import type {
	Account,
	AccountFormData,
	SyncStatus,
} from '$lib/types';

type ProviderServerConfig = {
	server: string;
	port: number;
	use_ssl: boolean;
};

type ProviderDefaultsFile = {
	imap: Record<string, ProviderServerConfig>;
	smtp: Record<string, ProviderServerConfig>;
};

const PROVIDER_DEFAULTS = providerDefaults as ProviderDefaultsFile;

function extractDomain(email: string): string | undefined {
	return email.split('@')[1]?.toLowerCase();
}

function resolveDefault(
	type: 'imap' | 'smtp',
	email: string,
	fallback: () => ProviderServerConfig,
): ProviderServerConfig {
	const domain = extractDomain(email);
	if (!domain) return fallback();
	const bucket = PROVIDER_DEFAULTS[type];
	return bucket[domain] ?? fallback();
}

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

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get default IMAP settings for common email providers
 */
export function getDefaultImapSettings(email: string): { server: string; port: number; use_ssl: boolean } {
	return resolveDefault('imap', email, () => {
		const domain = extractDomain(email);
		const fallbackDomain = domain ? `imap.${domain}` : 'imap.local';
		return { server: fallbackDomain, port: 993, use_ssl: true };
	});
}

/**
 * Get default SMTP settings for common email providers
 */
export function getDefaultSmtpSettings(email: string): { server: string; port: number; use_ssl: boolean } {
	return resolveDefault('smtp', email, () => {
		const domain = extractDomain(email);
		const fallbackDomain = domain ? `smtp.${domain}` : 'smtp.local';
		return { server: fallbackDomain, port: 587, use_ssl: true };
	});
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
