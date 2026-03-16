use std::sync::Mutex;
use tauri::AppHandle;
use thiserror::Error;

/// Credential management errors
#[derive(Debug, Error)]
pub enum CredentialError {
    #[error("Failed to access keychain: {0}")]
    KeychainAccess(String),

    #[error("Password not found for account: {0}")]
    NotFound(String),

    #[error("Failed to store password: {0}")]
    StorageFailed(String),

    #[error("Invalid key format: {0}")]
    InvalidKey(String),
}

/// Result type for credential operations
pub type Result<T> = std::result::Result<T, CredentialError>;

/// Credential manager for secure password storage using OS keychain
pub struct CredentialManager {
    app_handle: AppHandle,
}

impl CredentialManager {
    /// Create a new credential manager
    pub fn new(app_handle: AppHandle) -> Self {
        Self { app_handle }
    }

    /// Store a password for an account in the OS keychain
    pub fn store_password(&self, account_id: &str, password: &str) -> Result<()> {
        let key = Self::format_key(account_id);

        // Use Tauri's credential plugin for secure storage
        self.app_handle
            .keychain()
            .set_password("mailx", &key, password)
            .map_err(|e| CredentialError::StorageFailed(e.to_string()))?;

        Ok(())
    }

    /// Retrieve a password for an account from the OS keychain
    pub fn get_password(&self, account_id: &str) -> Result<String> {
        let key = Self::format_key(account_id);

        let password = self
            .app_handle
            .keychain()
            .get_password("mailx", &key)
            .map_err(|e| match e {
                tauri::Error::Keychain(_, _) => CredentialError::NotFound(account_id.to_string()),
                _ => CredentialError::KeychainAccess(e.to_string()),
            })?;

        Ok(password)
    }

    /// Delete a password for an account from the OS keychain
    pub fn delete_password(&self, account_id: &str) -> Result<()> {
        let key = Self::format_key(account_id);

        self.app_handle
            .keychain()
            .delete_password("mailx", &key)
            .map_err(|e| match e {
                tauri::Error::Keychain(_, _) => CredentialError::NotFound(account_id.to_string()),
                _ => CredentialError::KeychainAccess(e.to_string()),
            })?;

        Ok(())
    }

    /// Format the key for storing passwords in the keychain
    fn format_key(account_id: &str) -> String {
        format!("mailx_account_{}_password", account_id)
    }

    /// Validate a password format (basic validation)
    pub fn validate_password(password: &str) -> Result<()> {
        if password.is_empty() {
            return Err(CredentialError::InvalidKey("Password cannot be empty".to_string()));
        }

        // Basic password validation - ensure it's not whitespace only
        if password.trim().is_empty() {
            return Err(CredentialError::InvalidKey("Password cannot be whitespace only".to_string()));
        }

        Ok(())
    }

    /// Update a password for an account (delete old, store new)
    pub fn update_password(&self, account_id: &str, new_password: &str) -> Result<()> {
        // First try to delete the old password (may not exist)
        let _ = self.delete_password(account_id);

        // Store the new password
        self.store_password(account_id, new_password)
    }
}

/// Thread-safe wrapper for CredentialManager
pub struct SharedCredentialManager(Mutex<CredentialManager>);

unsafe impl Send for SharedCredentialManager {}
unsafe impl Sync for SharedCredentialManager {}

impl SharedCredentialManager {
    /// Create a new shared credential manager
    pub fn new(app_handle: AppHandle) -> Self {
        Self(Mutex::new(CredentialManager::new(app_handle)))
    }

    /// Store a password for an account
    pub fn store_password(&self, account_id: &str, password: &str) -> Result<()> {
        let manager = self.0.lock().unwrap();
        manager.store_password(account_id, password)
    }

    /// Retrieve a password for an account
    pub fn get_password(&self, account_id: &str) -> Result<String> {
        let manager = self.0.lock().unwrap();
        manager.get_password(account_id)
    }

    /// Delete a password for an account
    pub fn delete_password(&self, account_id: &str) -> Result<()> {
        let manager = self.0.lock().unwrap();
        manager.delete_password(account_id)
    }

    /// Update a password for an account
    pub fn update_password(&self, account_id: &str, new_password: &str) -> Result<()> {
        let manager = self.0.lock().unwrap();
        manager.update_password(account_id, new_password)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_password() {
        assert!(CredentialManager::validate_password("validpassword123").is_ok());
        assert!(CredentialManager::validate_password("  spaces  ").is_ok());
        assert!(CredentialManager::validate_password("").is_err());
        assert!(CredentialManager::validate_password("   ").is_err());
    }

    #[test]
    fn test_format_key() {
        let key = CredentialManager::format_key("account123");
        assert_eq!(key, "mailx_account_account123_password");
    }
}
