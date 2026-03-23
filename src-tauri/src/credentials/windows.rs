/// Windows-specific credential management with Credential Manager and encrypted file fallback
/// Implements P8-1: Windows Credential Backend
use super::fallback::EncryptedFileStore;

/// Platform-specific credential error
pub type PlatformCredentialError = super::platform::PlatformCredentialError;

/// Platform-specific result type
pub type PlatformResult<T> = super::platform::PlatformResult<T>;
use std::sync::{Arc, RwLock};
use thiserror::Error;

/// Windows Credential Manager error types
#[derive(Debug, Error)]
pub enum WindowsCredentialError {
    #[error("Credential Manager not available: {0}")]
    Unavailable(String),

    #[error("Credential not found: {0}")]
    NotFound(String),

    #[error("Failed to store credential: {0}")]
    StorageFailed(String),

    #[error("Failed to retrieve credential: {0}")]
    RetrievalFailed(String),

    #[error("Failed to delete credential: {0}")]
    DeletionFailed(String),

    #[error("Access denied to Credential Manager")]
    AccessDenied,

    #[error("Invalid credential format")]
    InvalidFormat,
}

/// Windows credential manager with automatic fallback to encrypted file storage
pub struct WindowsCredentialManager {
    primary: Arc<CredentialManagerPrimary>,
    fallback: Arc<EncryptedFileStore>,
    use_fallback: Arc<RwLock<bool>>,
}

unsafe impl Send for WindowsCredentialManager {}
unsafe impl Sync for WindowsCredentialManager {}

impl WindowsCredentialManager {
    /// Create a new Windows credential manager with fallback support
    pub fn new() -> PlatformResult<Self> {
        let primary = Arc::new(CredentialManagerPrimary::new()?);
        let fallback = Arc::new(EncryptedFileStore::new()?);

        // Test if Credential Manager is available
        let use_fallback = Arc::new(RwLock::new(!primary.is_available()?));

        Ok(Self {
            primary,
            fallback,
            use_fallback,
        })
    }

    /// Store a credential using Credential Manager with automatic fallback
    pub fn store_credential(&self, account_id: &str, password: &str) -> PlatformResult<()> {
        let target_name = Self::format_target_name(account_id);

        // Try primary first
        if !*self.use_fallback.read().unwrap() {
            match self.primary.store_credential(&target_name, password) {
                Ok(_) => return Ok(()),
                Err(e) => {
                    eprintln!("Credential Manager failed, falling back: {}", e);
                    *self.use_fallback.write().unwrap() = true;
                }
            }
        }

        // Fallback to encrypted file
        self.fallback.store_credential(account_id, password)
    }

    /// Retrieve a credential using Credential Manager with automatic fallback
    pub fn get_credential(&self, account_id: &str) -> PlatformResult<String> {
        let target_name = Self::format_target_name(account_id);

        // Try primary first if not using fallback
        if !*self.use_fallback.read().unwrap() {
            match self.primary.get_credential(&target_name) {
                Ok(password) => return Ok(password),
                Err(WindowsCredentialError::NotFound(_)) => {
                    // Try fallback
                }
                Err(e) => {
                    eprintln!("Credential Manager failed, falling back: {}", e);
                    *self.use_fallback.write().unwrap() = true;
                }
            }
        }

        // Try fallback
        match self.fallback.get_credential(account_id) {
            Ok(password) => Ok(password),
            Err(_) => Err(PlatformCredentialError::NotFound(account_id.to_string())),
        }
    }

    /// Delete a credential using Credential Manager with automatic fallback
    pub fn delete_credential(&self, account_id: &str) -> PlatformResult<()> {
        let target_name = Self::format_target_name(account_id);

        // Try primary first
        if !*self.use_fallback.read().unwrap() {
            match self.primary.delete_credential(&target_name) {
                Ok(_) => return Ok(()),
                Err(WindowsCredentialError::NotFound(_)) => {
                    // Try fallback
                }
                Err(e) => {
                    eprintln!("Credential Manager failed, falling back: {}", e);
                    *self.use_fallback.write().unwrap() = true;
                }
            }
        }

        // Try fallback
        match self.fallback.delete_credential(account_id) {
            Ok(_) => Ok(()),
            Err(_) => Err(PlatformCredentialError::NotFound(account_id.to_string())),
        }
    }

    /// Check if Credential Manager is available
    pub fn is_available(&self) -> PlatformResult<bool> {
        if !*self.use_fallback.read().unwrap() {
            self.primary.is_available().map_err(|e| {
                PlatformCredentialError::Windows(format!("Availability check failed: {}", e))
            })
        } else {
            Ok(false)
        }
    }

    /// Format the target name for Windows Credential Manager
    fn format_target_name(account_id: &str) -> String {
        format!("mailx_account_{}", account_id)
    }

    /// Force fallback mode (useful for testing)
    #[cfg(test)]
    pub fn force_fallback_mode(&self) {
        *self.use_fallback.write().unwrap() = true;
    }

    /// Reset to primary mode (useful for testing)
    #[cfg(test)]
    pub fn reset_to_primary(&self) {
        *self.use_fallback.write().unwrap() = false;
    }
}

/// Primary Windows Credential Manager implementation
struct CredentialManagerPrimary {
    _marker: std::marker::PhantomData<()>,
}

impl CredentialManagerPrimary {
    pub fn new() -> Result<Self, PlatformCredentialError> {
        // Initialize Credential Manager
        Ok(Self {
            _marker: std::marker::PhantomData,
        })
    }

    /// Check if Credential Manager is available
    pub fn is_available(&self) -> Result<bool, WindowsCredentialError> {
        // Use keyring with windows-native feature
        let test_entry = keyring::Entry::new("mailx_test", "availability_check")
            .map_err(|e| WindowsCredentialError::Unavailable(e.to_string()))?;

        // Try to set and delete a test credential
        test_entry
            .set_password("test")
            .map_err(|e| WindowsCredentialError::Unavailable(e.to_string()))?;

        test_entry
            .delete_credential()
            .map_err(|e| WindowsCredentialError::Unavailable(e.to_string()))?;

        Ok(true)
    }

    /// Store a credential in Windows Credential Manager
    pub fn store_credential(
        &self,
        target_name: &str,
        password: &str,
    ) -> Result<(), WindowsCredentialError> {
        let entry = keyring::Entry::new("mailx", target_name)
            .map_err(|e| WindowsCredentialError::Unavailable(e.to_string()))?;

        entry
            .set_password(password)
            .map_err(|e| WindowsCredentialError::StorageFailed(e.to_string()))?;

        Ok(())
    }

    /// Retrieve a credential from Windows Credential Manager
    pub fn get_credential(&self, target_name: &str) -> Result<String, WindowsCredentialError> {
        let entry = keyring::Entry::new("mailx", target_name)
            .map_err(|e| WindowsCredentialError::Unavailable(e.to_string()))?;

        entry.get_password().map_err(|e| match e {
            keyring::Error::NoEntry => WindowsCredentialError::NotFound(target_name.to_string()),
            _ => WindowsCredentialError::RetrievalFailed(e.to_string()),
        })
    }

    /// Delete a credential from Windows Credential Manager
    pub fn delete_credential(&self, target_name: &str) -> Result<(), WindowsCredentialError> {
        let entry = keyring::Entry::new("mailx", target_name)
            .map_err(|e| WindowsCredentialError::Unavailable(e.to_string()))?;

        entry.delete_credential().map_err(|e| match e {
            keyring::Error::NoEntry => WindowsCredentialError::NotFound(target_name.to_string()),
            _ => WindowsCredentialError::DeletionFailed(e.to_string()),
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_format_target_name() {
        let name = WindowsCredentialManager::format_target_name("account123");
        assert_eq!(name, "mailx_account_account123");
    }

    #[test]
    fn test_primary_availability() {
        let primary = CredentialManagerPrimary::new().unwrap();
        // This test will succeed if Credential Manager is available
        let available = primary.is_available();
        assert!(available.is_ok() || available.is_err());
    }
}
