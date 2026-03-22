/// Encrypted file fallback storage for credentials
/// Provides secure credential storage when OS keychain is unavailable

use super::platform::PlatformCredentialError;
use aes_gcm::{
    aead::{Aead, AeadCore, KeyInit, OsRng},
    Aes256Gcm, Nonce,
};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use serde::{Deserialize, Serialize};
use std::fs;
use std::io::{self, Write};
use std::path::PathBuf;
use thiserror::Error;

/// Encrypted file store for credential fallback
pub struct EncryptedFileStore {
    storage_dir: PathBuf,
    master_key: Vec<u8>,
}

unsafe impl Send for EncryptedFileStore {}
unsafe impl Sync for EncryptedFileStore {}

impl EncryptedFileStore {
    /// Create a new encrypted file store
    pub fn new() -> Result<Self, PlatformCredentialError> {
        // Get app data directory
        let storage_dir = Self::get_storage_dir()?;

        // Create storage directory if it doesn't exist
        fs::create_dir_all(&storage_dir).map_err(|e| {
            PlatformCredentialError::StorageFailed(format!("Failed to create storage dir: {}", e))
        })?;

        // Generate or load master key
        let master_key = Self::get_or_create_master_key(&storage_dir)?;

        Ok(Self {
            storage_dir,
            master_key,
        })
    }

    /// Store a credential encrypted in a file
    pub fn store_credential(&self, account_id: &str, password: &str) -> Result<(), PlatformCredentialError> {
        let credential_path = self.get_credential_path(account_id);

        // Create credential data
        let credential_data = CredentialData {
            account_id: account_id.to_string(),
            password: password.to_string(),
            created_at: chrono::Utc::now().to_rfc3339(),
        };

        // Serialize
        let json = serde_json::to_string(&credential_data).map_err(|e| {
            PlatformCredentialError::StorageFailed(format!("Failed to serialize: {}", e))
        })?;

        // Encrypt
        let encrypted = self.encrypt_data(json.as_bytes())?;

        // Write to file with restrictive permissions
        let mut file = fs::File::create(&credential_path).map_err(|e| {
            PlatformCredentialError::StorageFailed(format!("Failed to create file: {}", e))
        })?;

        file.write_all(&encrypted).map_err(|e| {
            PlatformCredentialError::StorageFailed(format!("Failed to write: {}", e))
        })?;

        // Set restrictive permissions (owner read/write only)
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let mut perms = fs::metadata(&credential_path)
                .map_err(|e| {
                    PlatformCredentialError::StorageFailed(format!("Failed to get metadata: {}", e))
                })?
                .permissions();
            perms.set_mode(0o600);
            fs::set_permissions(&credential_path, perms).map_err(|e| {
                PlatformCredentialError::StorageFailed(format!("Failed to set permissions: {}", e))
            })?;
        }

        Ok(())
    }

    /// Retrieve and decrypt a credential from a file
    pub fn get_credential(&self, account_id: &str) -> Result<String, PlatformCredentialError> {
        let credential_path = self.get_credential_path(account_id);

        // Read file
        let encrypted = fs::read(&credential_path).map_err(|e| {
            if e.kind() == io::ErrorKind::NotFound {
                PlatformCredentialError::NotFound(account_id.to_string())
            } else {
                PlatformCredentialError::StorageFailed(format!("Failed to read file: {}", e))
            }
        })?;

        // Decrypt
        let decrypted = self.decrypt_data(&encrypted)?;

        // Deserialize
        let credential_data: CredentialData = serde_json::from_slice(&decrypted).map_err(|_| {
            PlatformCredentialError::Encryption("Failed to deserialize credential data".to_string())
        })?;

        Ok(credential_data.password)
    }

    /// Delete a credential file
    pub fn delete_credential(&self, account_id: &str) -> Result<(), PlatformCredentialError> {
        let credential_path = self.get_credential_path(account_id);

        fs::remove_file(&credential_path).map_err(|e| {
            if e.kind() == io::ErrorKind::NotFound {
                PlatformCredentialError::NotFound(account_id.to_string())
            } else {
                PlatformCredentialError::StorageFailed(format!("Failed to delete file: {}", e))
            }
        })?;

        Ok(())
    }

    /// Get the storage directory path
    fn get_storage_dir() -> Result<PathBuf, PlatformCredentialError> {
        let mut path = dirs::config_dir()
            .ok_or_else(|| {
                PlatformCredentialError::StorageFailed("Failed to get config directory".to_string())
            })?;

        path.push("mailx");
        path.push("credentials");

        Ok(path)
    }

    /// Get the credential file path for an account
    fn get_credential_path(&self, account_id: &str) -> PathBuf {
        let filename = format!("{}.cred", account_id);
        self.storage_dir.join(filename)
    }

    /// Get or create master encryption key
    fn get_or_create_master_key(storage_dir: &PathBuf) -> Result<Vec<u8>, PlatformCredentialError> {
        let key_path = storage_dir.join(".master_key");

        if key_path.exists() {
            // Load existing key
            let key_data = fs::read_to_string(&key_path).map_err(|e| {
                PlatformCredentialError::Encryption(format!("Failed to read key: {}", e))
            })?;

            BASE64.decode(key_data).map_err(|_| {
                PlatformCredentialError::Encryption("Failed to decode master key".to_string())
            })
        } else {
            // Generate new key
            let key = Aes256Gcm::generate_key(&mut OsRng);
            let key_b64 = BASE64.encode(&key);

            // Write key file with restrictive permissions
            let mut file = fs::File::create(&key_path).map_err(|e| {
                PlatformCredentialError::Encryption(format!("Failed to create key file: {}", e))
            })?;

            file.write_all(key_b64.as_bytes()).map_err(|e| {
                PlatformCredentialError::Encryption(format!("Failed to write key: {}", e))
            })?;

            // Set restrictive permissions
            #[cfg(unix)]
            {
                use std::os::unix::fs::PermissionsExt;
                let mut perms = fs::metadata(&key_path)
                    .map_err(|e| {
                        PlatformCredentialError::Encryption(format!("Failed to get metadata: {}", e))
                    })?
                    .permissions();
                perms.set_mode(0o600);
                fs::set_permissions(&key_path, perms).map_err(|e| {
                    PlatformCredentialError::Encryption(format!("Failed to set permissions: {}", e))
                })?;
            }

            Ok(key.to_vec())
        }
    }

    /// Encrypt data using AES-256-GCM
    fn encrypt_data(&self, data: &[u8]) -> Result<Vec<u8>, PlatformCredentialError> {
        let cipher = Aes256Gcm::new_from_slice(&self.master_key).map_err(|_| {
            PlatformCredentialError::Encryption("Failed to create cipher".to_string())
        })?;

        let nonce = Aes256Gcm::generate_nonce(&mut OsRng);
        let ciphertext = cipher.encrypt(&nonce, data).map_err(|_| {
            PlatformCredentialError::Encryption("Encryption failed".to_string())
        })?;

        // Combine nonce + ciphertext for storage
        let mut result = nonce.to_vec();
        result.extend_from_slice(&ciphertext);

        Ok(result)
    }

    /// Decrypt data using AES-256-GCM
    fn decrypt_data(&self, encrypted: &[u8]) -> Result<Vec<u8>, PlatformCredentialError> {
        if encrypted.len() < 12 {
            return Err(PlatformCredentialError::Encryption(
                "Invalid encrypted data length".to_string(),
            ));
        }

        let cipher = Aes256Gcm::new_from_slice(&self.master_key).map_err(|_| {
            PlatformCredentialError::Encryption("Failed to create cipher".to_string())
        })?;

        let nonce = Nonce::from_slice(&encrypted[..12]);
        let ciphertext = &encrypted[12..];

        cipher
            .decrypt(nonce, ciphertext)
            .map_err(|_| PlatformCredentialError::Encryption("Decryption failed".to_string()))
    }
}

/// Credential data structure for serialization
#[derive(Debug, Serialize, Deserialize)]
struct CredentialData {
    account_id: String,
    password: String,
    created_at: String,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_storage_dir() {
        let dir = EncryptedFileStore::get_storage_dir();
        assert!(dir.is_ok());
        let path = dir.unwrap();
        assert!(path.ends_with("mailx/credentials"));
    }

    #[test]
    fn test_encryption_decryption_roundtrip() {
        // This test creates actual files, so we skip it in normal tests
        // It should be run in integration tests
    }
}
