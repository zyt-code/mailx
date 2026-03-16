use crate::accounts::{Account, AccountManager, ImapConfig};
use crate::credentials::CredentialManager;
use crate::database::Database;
use crate::imap_client::ImapClient;
use std::sync::{Arc, Mutex};
use std::time::Duration;
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
        }
    }

    /// Start the background sync loop for all active accounts
    pub fn start_background_sync(&self) -> Result<()> {
        let handles = self.sync_handles.clone();

        // Spawn a task that syncs all active accounts every 5 minutes
        let handle = tokio::spawn(async move {
            let mut interval = tokio::time::interval(Duration::from_secs(300)); // 5 minutes

            loop {
                interval.tick().await;

                // Sync all active accounts
                // In a real implementation, we'd get the account manager here
                // and sync each account
            }
        });

        handles.lock().unwrap().push(handle);

        Ok(())
    }

    /// Trigger an immediate sync for a specific account
    pub async fn sync_account(&self, account_id: &str) -> Result<SyncStatus> {
        // Get the account
        let account = self
            .account_manager
            .get(account_id)
            .map_err(|e| SyncError::Account(e.to_string()))?;

        // Emit sync started event
        let _ = self.app_handle.emit("sync:started", json!({
            "account_id": account_id,
            "email": account.email,
        }));

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

        // Create IMAP client
        let imap_client = ImapClient::new(imap_config, account.email.clone(), password);

        // Fetch emails (last 100)
        let mails = imap_client
            .fetch_emails("INBOX", 100)
            .await
            .map_err(|e| SyncError::Imap(e.to_string()))?;

        // Store emails in database
        for mail in mails {
            // Check if email already exists
            if self.database.get_mail(&mail.id).is_ok() {
                // Email exists, skip or update
                continue;
            }

            // Insert new email
            self.database
                .insert_mail(&mail)
                .map_err(|e| SyncError::Database(e.to_string()))?;
        }

        let now = chrono::Utc::now().timestamp_millis();

        // Emit sync completed event
        let status = SyncStatus {
            account_id: account_id.to_string(),
            account_email: account.email,
            status: SyncState::Idle,
            last_sync: Some(now),
            error_message: None,
            retry_count: 0,
        };

        let _ = self.app_handle.emit("sync:completed", json!(status));

        // Emit mails updated event
        let _ = self.app_handle.emit("mails:updated", ());

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
mod tests {
    use super::*;

    #[test]
    fn test_sync_state_serialization() {
        let state = SyncState::Syncing;
        let json = serde_json::to_string(&state).unwrap();
        assert!(json.contains("Syncing"));
    }

    #[test]
    fn test_sync_status_serialization() {
        let status = SyncStatus {
            account_id: "test_id".to_string(),
            account_email: "test@example.com".to_string(),
            status: SyncState::Idle,
            last_sync: Some(123456789),
            error_message: None,
            retry_count: 0,
        };

        let json = serde_json::to_string(&status).unwrap();
        assert!(json.contains("test@example.com"));
    }
}
