/**
 * Sync progress for UI feedback
 */
export interface SyncProgress {
  current: number;
  total: number;
  message?: string;
}

// Re-export types from main types module
export type { SyncState, SyncStatus } from '$lib/types.js';
