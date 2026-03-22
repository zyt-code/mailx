/// Platform-specific credential management module
/// Provides Windows Credential Manager with encrypted file fallback,
/// and uses system keyring on other platforms

pub mod platform;
pub mod windows;
pub mod fallback;

#[cfg(test)]
#[cfg(target_os = "windows")]
mod windows_tests;
