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
pub struct CredentialManager;

unsafe impl Send for CredentialManager {}
unsafe impl Sync for CredentialManager {}

impl CredentialManager {
    /// Create a new credential manager
    pub fn new() -> Self {
        Self
    }

    /// Store a password for an account in the OS keychain
    pub fn store_password(&self, account_id: &str, password: &str) -> Result<()> {
        let key = Self::format_key(account_id);
        let entry = keyring::Entry::new("mailx", &key)
            .map_err(|e| CredentialError::KeychainAccess(e.to_string()))?;
        entry
            .set_password(password)
            .map_err(|e| CredentialError::StorageFailed(e.to_string()))?;
        Ok(())
    }

    /// Retrieve a password for an account from the OS keychain
    pub fn get_password(&self, account_id: &str) -> Result<String> {
        let key = Self::format_key(account_id);
        let entry = keyring::Entry::new("mailx", &key)
            .map_err(|e| CredentialError::KeychainAccess(e.to_string()))?;
        entry.get_password().map_err(|e| match e {
            keyring::Error::NoEntry => CredentialError::NotFound(account_id.to_string()),
            _ => CredentialError::KeychainAccess(e.to_string()),
        })
    }

    /// Delete a password for an account from the OS keychain
    pub fn delete_password(&self, account_id: &str) -> Result<()> {
        let key = Self::format_key(account_id);
        let entry = keyring::Entry::new("mailx", &key)
            .map_err(|e| CredentialError::KeychainAccess(e.to_string()))?;
        entry.delete_credential().map_err(|e| match e {
            keyring::Error::NoEntry => CredentialError::NotFound(account_id.to_string()),
            _ => CredentialError::KeychainAccess(e.to_string()),
        })
    }

    /// Format the key for storing passwords in the keychain
    fn format_key(account_id: &str) -> String {
        format!("mailx_account_{}_password", account_id)
    }

    /// Validate a password format (basic validation)
    pub fn validate_password(&self, password: &str) -> Result<()> {
        if password.is_empty() {
            return Err(CredentialError::InvalidKey(
                "Password cannot be empty".to_string(),
            ));
        }
        if password.trim().is_empty() {
            return Err(CredentialError::InvalidKey(
                "Password cannot be whitespace only".to_string(),
            ));
        }
        Ok(())
    }

    /// Update a password for an account (delete old, store new)
    pub fn update_password(&self, account_id: &str, new_password: &str) -> Result<()> {
        let _ = self.delete_password(account_id);
        self.store_password(account_id, new_password)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_password() {
        let cm = CredentialManager::new();
        assert!(cm.validate_password("validpassword123").is_ok());
        assert!(cm.validate_password("  spaces  ").is_ok());
        assert!(cm.validate_password("").is_err());
        assert!(cm.validate_password("   ").is_err());
    }

    #[test]
    fn test_format_key() {
        let key = CredentialManager::format_key("account123");
        assert_eq!(key, "mailx_account_account123_password");
    }
}
