use crate::accounts::{Account, AccountManager};
use crate::credentials_legacy::CredentialManager;
use crate::database::{Database, ImapFolderState};
use crate::imap_client::{ImapClient, SyncFolderRequest};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Instant;
use tauri::{AppHandle, Emitter};
use thiserror::Error;

/// Sync manager errors
#[derive(Debug, Error)]
#[allow(dead_code)]
pub enum SyncError {
    #[error("Account error: {0}")]
    Account(String),

    #[error("Credential error: {0}")]
    Credential(String),

    #[error("IMAP error: {0}")]
    Imap(String),

    #[error("Database error: {0}")]
    Database(String),

    #[error("Not authenticated")]
    NotAuthenticated,

    #[error("Sync cancelled")]
    Cancelled,

    #[error("Already syncing")]
    AlreadySyncing,

    #[error("Network error: {0}")]
    Network(String),
}

/// Result type for sync operations
pub type Result<T> = std::result::Result<T, SyncError>;

/// Sync status for tracking
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct SyncStatus {
    pub account_id: String,
    pub account_email: String,
    pub status: SyncState,
    pub last_sync: Option<i64>,
    pub error_message: Option<String>,
    pub retry_count: u32,
    #[serde(default)]
    pub new_count: u32,
}

/// Sync state enum
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, PartialEq)]
pub enum SyncState {
    Idle,
    Syncing,
    Failed,
    Cancelled,
}

/// Sync manager for background email synchronization
pub struct SyncManager {
    app_handle: AppHandle,
    account_manager: Arc<AccountManager>,
    credential_manager: Arc<CredentialManager>,
    database: Arc<Database>,
    #[allow(dead_code)]
    sync_handles: Arc<Mutex<Vec<tokio::task::JoinHandle<()>>>>,
    is_syncing: Arc<AtomicBool>,
}

#[derive(Debug, Default, Clone, Copy, PartialEq, Eq)]
struct SyncBatchStats {
    inserted: u32,
    updated: u32,
    new_inbox_unread: u32,
}

impl SyncBatchStats {
    fn record_mail(&mut self, local_folder: &str, is_new: bool, unread: bool) {
        if is_new {
            self.inserted += 1;
            if local_folder == "inbox" && unread {
                self.new_inbox_unread += 1;
            }
        } else {
            self.updated += 1;
        }
    }

    fn has_mailbox_changes(&self) -> bool {
        self.inserted > 0 || self.updated > 0
    }

    fn merge_into(
        self,
        total_inserted: &mut u32,
        total_updated: &mut u32,
        total_new_inbox_unread: &mut u32,
    ) {
        *total_inserted += self.inserted;
        *total_updated += self.updated;
        *total_new_inbox_unread += self.new_inbox_unread;
    }
}

fn is_high_priority_sync_folder(local_folder: &str) -> bool {
    matches!(local_folder, "inbox" | "sent" | "drafts")
}

fn partition_sync_requests(
    requests: Vec<SyncFolderRequest>,
) -> (Vec<SyncFolderRequest>, Vec<SyncFolderRequest>) {
    let mut high_priority = Vec::new();
    let mut low_priority = Vec::new();

    for request in requests {
        if is_high_priority_sync_folder(&request.local_folder) {
            high_priority.push(request);
        } else {
            low_priority.push(request);
        }
    }

    (high_priority, low_priority)
}

unsafe impl Send for SyncManager {}
unsafe impl Sync for SyncManager {}

impl SyncManager {
    /// Create a new sync manager
    pub fn new(
        app_handle: AppHandle,
        account_manager: Arc<AccountManager>,
        credential_manager: Arc<CredentialManager>,
        database: Arc<Database>,
    ) -> Self {
        Self {
            app_handle,
            account_manager,
            credential_manager,
            database,
            sync_handles: Arc::new(Mutex::new(Vec::new())),
            is_syncing: Arc::new(AtomicBool::new(false)),
        }
    }

    /// Start the background sync loop for all active accounts
    /// Note: Background sync is disabled for now to avoid Tokio runtime issues during setup
    pub fn start_background_sync(&self) -> Result<()> {
        // TODO: Implement background sync using Tauri's async context
        // For now, sync will be triggered manually by the user or on-demand
        Ok(())
    }

    /// Trigger an immediate sync for a specific account
    pub async fn sync_account(&self, account_id: &str) -> Result<SyncStatus> {
        // Acquire atomic lock — prevents concurrent syncs
        if self
            .is_syncing
            .compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst)
            .is_err()
        {
            return Err(SyncError::AlreadySyncing);
        }

        println!("[Sync] Starting sync for account '{}'", account_id);

        // Get the account
        let account = self.account_manager.get(account_id).map_err(|e| {
            self.is_syncing.store(false, Ordering::SeqCst);
            println!("[Sync] Failed to get account '{}': {}", account_id, e);
            SyncError::Account(e.to_string())
        })?;

        // Emit sync started event
        let _ = self.app_handle.emit(
            "sync:started",
            json!({
                "account_id": account_id,
                "email": account.email,
            }),
        );

        // Run the actual sync, catch errors to emit sync:failed
        let result = match self.sync_account_inner(account_id, &account).await {
            Ok(status) => Ok(status),
            Err(e) => {
                let error_msg = e.to_string();
                println!("[Sync] FAILED for '{}': {}", account.email, error_msg);

                // Emit sync:failed so the frontend can show the error
                let _ = self.app_handle.emit(
                    "sync:failed",
                    json!({
                        "account_id": account_id,
                        "error": error_msg,
                    }),
                );

                Err(e)
            }
        };

        // Always release lock
        self.is_syncing.store(false, Ordering::SeqCst);
        result
    }

    /// Inner sync logic — separated so sync_account can wrap errors
    async fn sync_account_inner(&self, account_id: &str, account: &Account) -> Result<SyncStatus> {
        let sync_started_at = Instant::now();

        // Get credentials
        println!("[Sync] Getting credentials for '{}'...", account.email);
        let password = self.credential_manager.get_password(account_id).map_err(
            |e: crate::credentials_legacy::CredentialError| {
                println!("[Sync] Credential error for '{}': {}", account.email, e);
                SyncError::Credential(e.to_string())
            },
        )?;

        // Get IMAP config
        let imap_config = self
            .account_manager
            .get_imap_config(account_id)
            .map_err(|e| {
                println!("[Sync] IMAP config error for '{}': {}", account.email, e);
                SyncError::Account(e.to_string())
            })?;

        println!(
            "[Sync] IMAP config: {}:{} (SSL={})",
            imap_config.server, imap_config.port, imap_config.use_ssl
        );

        // Detect provider for folder mappings
        let provider = crate::mail_provider::MailProvider::detect_from_host(&imap_config.server);
        let sync_folders = provider.get_sync_folders();

        println!(
            "[Sync] Provider: {}, will try {} folder mappings",
            provider,
            sync_folders.len()
        );

        let mut total_inserted = 0u32;
        let mut total_updated = 0u32;
        let mut total_new_inbox_unread = 0u32;
        let mut synced_local_folders = std::collections::HashSet::new();
        let mut local_folder_order = Vec::new();
        let mut candidate_folders = std::collections::HashMap::<String, Vec<String>>::new();

        for (remote_folder, local_folder) in &sync_folders {
            let local_key = (*local_folder).to_string();
            if !candidate_folders.contains_key(&local_key) {
                local_folder_order.push(local_key.clone());
            }
            candidate_folders
                .entry(local_key)
                .or_default()
                .push((*remote_folder).to_string());
        }

        let mut requests = Vec::new();
        for local_folder in &local_folder_order {
            let saved_state = self
                .database
                .get_imap_folder_state(account_id, local_folder)
                .map_err(|e| SyncError::Database(e.to_string()))?;

            let mut folders = Vec::new();
            if let Some(state) = &saved_state {
                folders.push(state.name.clone());
            }
            if let Some(default_candidates) = candidate_folders.get(local_folder) {
                for candidate in default_candidates {
                    if !folders.iter().any(|existing| existing == candidate) {
                        folders.push(candidate.clone());
                    }
                }
            }

            requests.push(SyncFolderRequest {
                local_folder: local_folder.clone(),
                candidate_remote_folders: folders,
                last_seen_uid: saved_state
                    .as_ref()
                    .map(|state| state.remote_last_uid.max(0) as u32)
                    .unwrap_or(0),
                known_uid_validity: saved_state
                    .as_ref()
                    .map(|state| state.remote_uid_validity as u32),
                initial_fetch_limit: match local_folder.as_str() {
                    "inbox" => 75,
                    "sent" => 40,
                    _ => 20,
                },
            });
        }

        let (high_priority_requests, low_priority_requests) = partition_sync_requests(requests);
        let imap_client = ImapClient::new(imap_config.clone(), account.email.clone(), password);

        let mut persist_results =
            |results: Vec<crate::imap_client::SyncFolderResult>| -> Result<SyncBatchStats> {
                let mut batch_stats = SyncBatchStats::default();

                for result in results {
                    let folder_started_at = Instant::now();
                    let fetched_count = result.mails.len();

                    if result.uid_validity_changed {
                        self.database
                            .clear_account_folder(account_id, &result.local_folder)
                            .map_err(|e| SyncError::Database(e.to_string()))?;
                    }

                    let now = chrono::Utc::now().timestamp_millis();
                    let created_at = self
                        .database
                        .get_imap_folder_state(account_id, &result.local_folder)
                        .ok()
                        .flatten()
                        .map(|state| state.created_at)
                        .unwrap_or(now);

                    self.database
                        .upsert_imap_folder_state(&ImapFolderState {
                            id: format!("{}:{}", account_id, result.local_folder),
                            account_id: account_id.to_string(),
                            local_name: result.local_folder.clone(),
                            name: result.remote_folder.clone(),
                            remote_uid_validity: i64::from(result.uid_validity),
                            remote_last_uid: i64::from(result.remote_last_uid),
                            local_count: fetched_count as i64,
                            created_at,
                            last_synced_at: now,
                        })
                        .map_err(|e| SyncError::Database(e.to_string()))?;

                    for mut mail in result.mails {
                        mail.account_id = Some(account_id.to_string());
                        mail.folder = result.local_folder.clone();
                        mail.remote_uid_validity = Some(result.uid_validity);

                        if let Some(uid) = mail.uid {
                            mail.id =
                                ImapClient::generate_sync_id(account_id, &result.local_folder, uid);
                        }

                        let is_new = match self.database.get_mail(&mail.id) {
                            Ok(Some(_)) => false,
                            _ => true,
                        };

                        self.database
                            .upsert_mail_preserving_read_status(&mail)
                            .map_err(|e| {
                                println!("[Sync] DB upsert error: {}", e);
                                SyncError::Database(e.to_string())
                            })?;

                        batch_stats.record_mail(&result.local_folder, is_new, mail.unread);
                    }

                    println!(
                        "[Sync][Timing] metadata folder '{}' -> '{}' mails={} total={}ms",
                        result.remote_folder,
                        result.local_folder,
                        fetched_count,
                        folder_started_at.elapsed().as_millis()
                    );

                    synced_local_folders.insert(result.local_folder);
                }

                Ok(batch_stats)
            };

        let high_priority_results = imap_client
            .sync_folders_metadata_with_timeout(
                high_priority_requests,
                std::time::Duration::from_secs(60),
            )
            .await
            .map_err(|e| SyncError::Imap(e.to_string()))?;
        let high_priority_stats = persist_results(high_priority_results)?;
        high_priority_stats.merge_into(
            &mut total_inserted,
            &mut total_updated,
            &mut total_new_inbox_unread,
        );
        if high_priority_stats.has_mailbox_changes() {
            println!(
                "[Sync] Triggering mails:updated after high-priority sync ({} new, {} updated)",
                high_priority_stats.inserted, high_priority_stats.updated
            );
            let _ = self.app_handle.emit("mails:updated", ());
        }

        if !low_priority_requests.is_empty() {
            match imap_client
                .sync_folders_metadata_with_timeout(
                    low_priority_requests,
                    std::time::Duration::from_secs(20),
                )
                .await
            {
                Ok(results) => {
                    let low_priority_stats = persist_results(results)?;
                    low_priority_stats.merge_into(
                        &mut total_inserted,
                        &mut total_updated,
                        &mut total_new_inbox_unread,
                    );
                    if low_priority_stats.has_mailbox_changes() {
                        println!(
                            "[Sync] Triggering mails:updated after low-priority sync ({} new, {} updated)",
                            low_priority_stats.inserted, low_priority_stats.updated
                        );
                        let _ = self.app_handle.emit("mails:updated", ());
                    }
                }
                Err(error) => {
                    println!(
                        "[Sync] Low-priority folders skipped for '{}' after timeout/error: {}",
                        account.email, error
                    );
                }
            }
        }

        println!(
            "[Sync] DB: {} inserted (first local sync), {} updated across {} folders for '{}'; inbox new unread={}",
            total_inserted,
            total_updated,
            synced_local_folders.len(),
            account.email,
            total_new_inbox_unread
        );

        let now = chrono::Utc::now().timestamp_millis();

        let status = SyncStatus {
            account_id: account_id.to_string(),
            account_email: account.email.clone(),
            status: SyncState::Idle,
            last_sync: Some(now),
            error_message: None,
            retry_count: 0,
            new_count: total_new_inbox_unread,
        };

        let _ = self.app_handle.emit("sync:completed", json!(status));

        println!(
            "[Sync] Sync COMPLETED for '{}' in {}ms",
            account.email,
            sync_started_at.elapsed().as_millis()
        );
        Ok(status)
    }

    /// Trigger an immediate sync for all active accounts
    pub async fn sync_all_accounts(&self) -> Result<Vec<SyncStatus>> {
        let accounts = self
            .account_manager
            .get_active()
            .map_err(|e| SyncError::Account(e.to_string()))?;

        let mut results = Vec::new();

        for account in accounts {
            match self.sync_account(&account.id).await {
                Ok(status) => results.push(status),
                Err(e) => {
                    results.push(SyncStatus {
                        account_id: account.id.clone(),
                        account_email: account.email.clone(),
                        status: SyncState::Failed,
                        last_sync: None,
                        error_message: Some(e.to_string()),
                        retry_count: 0,
                        new_count: 0,
                    });
                }
            }
        }

        Ok(results)
    }

    /// Test connection for an account
    #[allow(dead_code)]
    pub async fn test_account_connection(&self, account_id: &str) -> Result<()> {
        // Get the account
        let account = self
            .account_manager
            .get(account_id)
            .map_err(|e| SyncError::Account(e.to_string()))?;

        // Get credentials
        let password = self.credential_manager.get_password(account_id).map_err(
            |e: crate::credentials_legacy::CredentialError| SyncError::Credential(e.to_string()),
        )?;

        // Get IMAP config
        let imap_config = self
            .account_manager
            .get_imap_config(account_id)
            .map_err(|e| SyncError::Account(e.to_string()))?;

        // Test IMAP connection
        let imap_client = ImapClient::new(imap_config, account.email.clone(), password);
        imap_client
            .test_connection()
            .await
            .map_err(|e| SyncError::Imap(e.to_string()))?;

        Ok(())
    }

    /// Stop all background sync tasks
    #[allow(dead_code)]
    pub fn stop_all(&self) {
        let mut handles = self.sync_handles.lock().unwrap();

        for handle in handles.drain(..) {
            handle.abort();
        }
    }
}

/// Helper macro for JSON serialization
use serde_json::json;
#[cfg(test)]
#[path = "../test/sync_manager_tests.rs"]
mod sync_manager_tests;
