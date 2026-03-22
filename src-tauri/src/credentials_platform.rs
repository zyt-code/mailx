/// Public re-export of platform-specific credential management
/// This module provides the platform-specific credential storage implementations

// Include the platform-specific credential modules directly
#[path = "credentials/platform.rs"]
pub mod platform;

#[path = "credentials/windows.rs"]
pub mod windows;

#[path = "credentials/fallback.rs"]
pub mod fallback;

pub use platform::{
    PlatformCredentialError, PlatformCredentialManager, PlatformResult,
};

#[cfg(target_os = "windows")]
pub use windows::WindowsCredentialManager;

#[cfg(target_os = "windows")]
pub use fallback::EncryptedFileStore;
