/// Platform-specific credential management
/// This module provides the abstraction layer for different OS credential storage backends

/// Unified error type for platform credential operations
#[derive(Debug, thiserror::Error)]
pub enum PlatformCredentialError {
    #[error("Windows Credential Manager error: {0}")]
    Windows(String),

    #[error("Keyring error: {0}")]
    Keyring(String),

    #[error("Credential not found: {0}")]
    NotFound(String),

    #[error("Storage operation failed: {0}")]
    StorageFailed(String),

    #[error("Fallback encryption error: {0}")]
    Encryption(String),

    #[error("All credential backends failed")]
    AllBackendsFailed,
}

// Implement From conversions for WindowsCredentialError
#[cfg(target_os = "windows")]
impl From<super::windows::WindowsCredentialError> for PlatformCredentialError {
    fn from(err: super::windows::WindowsCredentialError) -> Self {
        PlatformCredentialError::Windows(err.to_string())
    }
}

/// Result type for platform credential operations
pub type PlatformResult<T> = std::result::Result<T, PlatformCredentialError>;

cfg_if::cfg_if! {
    if #[cfg(target_os = "windows")] {
        pub use super::windows::WindowsCredentialManager as PlatformCredentialManager;
    } else if #[cfg(target_os = "macos")] {
        pub use keyring::Entry as PlatformCredentialManager;
    } else if #[cfg(target_os = "linux")] {
        pub use keyring::Entry as PlatformCredentialManager;
    }
}
