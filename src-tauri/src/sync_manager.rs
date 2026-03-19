use crate::accounts::{Account, AccountManager};
use crate::credentials::CredentialManager;
use crate::database::Database;
use crate::imap_client::ImapClient;
use std::sync::{Arc, Mutex};
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{AppHandle, Emitter};
use thiserror::Error;

/// Sync manager errors
#[derive(Debug, Error)]
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
    sync_handles: Arc<Mutex<Vec<tokio::task::JoinHandle<()>>>>,
    is_syncing: Arc<AtomicBool>,
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
        if self.is_syncing.compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst).is_err() {
            return Err(SyncError::AlreadySyncing);
        }

        println!("[Sync] Starting sync for account '{}'", account_id);

        // Get the account
        let account = self
            .account_manager
            .get(account_id)
            .map_err(|e| {
                self.is_syncing.store(false, Ordering::SeqCst);
                println!("[Sync] Failed to get account '{}': {}", account_id, e);
                SyncError::Account(e.to_string())
            })?;

        // Emit sync started event
        let _ = self.app_handle.emit("sync:started", json!({
            "account_id": account_id,
            "email": account.email,
        }));

        // Run the actual sync, catch errors to emit sync:failed
        let result = match self.sync_account_inner(account_id, &account).await {
            Ok(status) => Ok(status),
            Err(e) => {
                let error_msg = e.to_string();
                println!("[Sync] FAILED for '{}': {}", account.email, error_msg);

                // Emit sync:failed so the frontend can show the error
                let _ = self.app_handle.emit("sync:failed", json!({
                    "account_id": account_id,
                    "error": error_msg,
                }));

                Err(e)
            }
        };

        // Always release lock
        self.is_syncing.store(false, Ordering::SeqCst);
        result
    }

    /// Inner sync logic — separated so sync_account can wrap errors
    async fn sync_account_inner(&self, account_id: &str, account: &Account) -> Result<SyncStatus> {
        // Get credentials
        println!("[Sync] Getting credentials for '{}'...", account.email);
        let password = self
            .credential_manager
            .get_password(account_id)
            .map_err(|e| {
                println!("[Sync] Credential error for '{}': {}", account.email, e);
                SyncError::Credential(e.to_string())
            })?;

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

        // Create IMAP client and fetch
        let imap_client = ImapClient::new(imap_config, account.email.clone(), password);

        let mails = imap_client
            .fetch_emails("INBOX", 50)
            .await
            .map_err(|e| {
                println!("[Sync] IMAP fetch error for '{}': {}", account.email, e);
                SyncError::Imap(e.to_string())
            })?;

        println!("[Sync] Fetched {} mails for '{}'", mails.len(), account.email);

        // Store emails in database
        let mut inserted = 0u32;
        let mut skipped = 0u32;
        for mut mail in mails {
            // Tag each mail with the account that owns it
            mail.account_id = Some(account_id.to_string());

            match self.database.get_mail(&mail.id) {
                Ok(Some(_)) => {
                    skipped += 1;
                    continue;
                }
                _ => {}
            }

            self.database
                .insert_mail(&mail)
                .map_err(|e| {
                    println!("[Sync] DB insert error: {}", e);
                    SyncError::Database(e.to_string())
                })?;
            inserted += 1;
        }

        println!(
            "[Sync] DB: {} inserted, {} skipped (already existed) for '{}'",
            inserted, skipped, account.email
        );

        let now = chrono::Utc::now().timestamp_millis();

        let status = SyncStatus {
            account_id: account_id.to_string(),
            account_email: account.email.clone(),
            status: SyncState::Idle,
            last_sync: Some(now),
            error_message: None,
            retry_count: 0,
            new_count: inserted,
        };

        let _ = self.app_handle.emit("sync:completed", json!(status));

        // Only trigger UI reload when new emails were actually inserted
        if inserted > 0 {
            let _ = self.app_handle.emit("mails:updated", ());
        }

        println!("[Sync] Sync COMPLETED for '{}'", account.email);
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
    pub async fn test_account_connection(&self, account_id: &str) -> Result<()> {
        // Get the account
        let account = self
            .account_manager
            .get(account_id)
            .map_err(|e| SyncError::Account(e.to_string()))?;

        // Get credentials
        let password = self
            .credential_manager
            .get_password(account_id)
            .map_err(|e| SyncError::Credential(e.to_string()))?;

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
