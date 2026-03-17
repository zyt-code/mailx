import { invoke } from '@tauri-apps/api/core';
import type { SyncStatus } from '$lib/types.js';

/**
 * Trigger sync for a specific account
 */
export async function syncAccount(accountId: string): Promise<SyncStatus> {
  return invoke<SyncStatus>('sync_account', { id: accountId });
}

/**
 * Trigger sync for all active accounts
 */
export async function syncAllAccounts(): Promise<SyncStatus[]> {
  return invoke<SyncStatus[]>('sync_all_accounts');
}

/**
 * Get current sync status for all accounts
 */
export async function getSyncStatus(): Promise<SyncStatus[]> {
  return invoke<SyncStatus[]>('get_sync_status');
}

export * from './types.js';
