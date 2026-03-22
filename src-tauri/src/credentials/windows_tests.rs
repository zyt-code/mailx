/// Windows credential management integration tests
/// Implements P8-2: Integration Testing for Windows credentials
/// 14 comprehensive test scenarios covering all credential operations

#[cfg(test)]
mod windows_credential_tests {
    use super::super::*;

    /// Helper function to generate unique test account IDs
    fn test_account_id(suffix: &str) -> String {
        format!("test_account_{}_{:?}", suffix, std::thread::current().id())
    }

    /// Helper function to generate unique test passwords
    fn test_password() -> String {
        format!("test_password_{}", chrono::Utc::now().timestamp_nanos())
    }

    // Test 1: Credential Manager initialization
    #[test]
    fn test_windows_credential_manager_init() {
        let result = WindowsCredentialManager::new();
        assert!(
            result.is_ok(),
            "WindowsCredentialManager should initialize successfully"
        );
        let manager = result.unwrap();
        assert!(
            manager.is_available().is_ok(),
            "Credential Manager should report availability status"
        );
    }

    // Test 2: Store credential in primary backend
    #[test]
    fn test_store_credential_primary() {
        let manager = WindowsCredentialManager::new().unwrap();
        manager.reset_to_primary(); // Ensure we're testing primary backend

        let account_id = test_account_id("store_primary");
        let password = test_password();

        let result = manager.store_credential(&account_id, &password);
        assert!(
            result.is_ok(),
            "Should store credential in primary backend: {:?}",
            result
        );

        // Cleanup
        let _ = manager.delete_credential(&account_id);
    }

    // Test 3: Retrieve credential from primary backend
    #[test]
    fn test_retrieve_credential_primary() {
        let manager = WindowsCredentialManager::new().unwrap();
        manager.reset_to_primary();

        let account_id = test_account_id("retrieve_primary");
        let password = test_password();

        // Store first
        manager.store_credential(&account_id, &password).unwrap();

        // Retrieve
        let result = manager.get_credential(&account_id);
        assert!(
            result.is_ok(),
            "Should retrieve credential from primary backend"
        );
        let retrieved = result.unwrap();
        assert_eq!(
            retrieved, password,
            "Retrieved password should match stored password"
        );

        // Cleanup
        let _ = manager.delete_credential(&account_id);
    }

    // Test 4: Delete credential from primary backend
    #[test]
    fn test_delete_credential_primary() {
        let manager = WindowsCredentialManager::new().unwrap();
        manager.reset_to_primary();

        let account_id = test_account_id("delete_primary");
        let password = test_password();

        // Store first
        manager.store_credential(&account_id, &password).unwrap();

        // Delete
        let result = manager.delete_credential(&account_id);
        assert!(
            result.is_ok(),
            "Should delete credential from primary backend"
        );

        // Verify it's gone
        let retrieve_result = manager.get_credential(&account_id);
        assert!(
            retrieve_result.is_err(),
            "Deleted credential should not be retrievable"
        );
    }

    // Test 5: Store non-existent credential (should succeed)
    #[test]
    fn test_store_new_credential() {
        let manager = WindowsCredentialManager::new().unwrap();
        manager.reset_to_primary();

        let account_id = test_account_id("new_credential");
        let password = test_password();

        // Storing a new credential should succeed
        let result = manager.store_credential(&account_id, &password);
        assert!(
            result.is_ok(),
            "Storing new credential should succeed"
        );

        // Cleanup
        let _ = manager.delete_credential(&account_id);
    }

    // Test 6: Retrieve non-existent credential (should fail)
    #[test]
    fn test_retrieve_nonexistent_credential() {
        let manager = WindowsCredentialManager::new().unwrap();
        manager.reset_to_primary();

        let account_id = test_account_id("nonexistent");

        let result = manager.get_credential(&account_id);
        assert!(
            result.is_err(),
            "Retrieving non-existent credential should fail"
        );

        match result {
            Err(PlatformCredentialError::NotFound(_)) => {
                // Expected error type
            }
            Err(e) => {
                panic!("Expected NotFound error, got: {:?}", e);
            }
            Ok(_) => {
                panic!("Should not retrieve non-existent credential");
            }
        }
    }

    // Test 7: Delete non-existent credential (should fail gracefully)
    #[test]
    fn test_delete_nonexistent_credential() {
        let manager = WindowsCredentialManager::new().unwrap();
        manager.reset_to_primary();

        let account_id = test_account_id("nonexistent_delete");

        let result = manager.delete_credential(&account_id);
        assert!(
            result.is_err(),
            "Deleting non-existent credential should fail"
        );

        match result {
            Err(PlatformCredentialError::NotFound(_)) => {
                // Expected error type
            }
            Err(e) => {
                panic!("Expected NotFound error, got: {:?}", e);
            }
            Ok(_) => {
                panic!("Should not delete non-existent credential");
            }
        }
    }

    // Test 8: Update existing credential
    #[test]
    fn test_update_existing_credential() {
        let manager = WindowsCredentialManager::new().unwrap();
        manager.reset_to_primary();

        let account_id = test_account_id("update");
        let password1 = test_password();
        let password2 = test_password();

        // Store initial credential
        manager.store_credential(&account_id, &password1).unwrap();

        // Update with new password (store again)
        manager.store_credential(&account_id, &password2).unwrap();

        // Retrieve and verify
        let result = manager.get_credential(&account_id);
        assert!(result.is_ok(), "Should retrieve updated credential");
        let retrieved = result.unwrap();
        assert_eq!(
            retrieved, password2,
            "Retrieved password should be the updated password"
        );
        assert_ne!(
            retrieved, password1,
            "Retrieved password should not be the old password"
        );

        // Cleanup
        let _ = manager.delete_credential(&account_id);
    }

    // Test 9: Automatic fallback to encrypted file storage
    #[test]
    fn test_automatic_fallback_to_file_storage() {
        let manager = WindowsCredentialManager::new().unwrap();

        // Force fallback mode
        manager.force_fallback_mode();

        let account_id = test_account_id("fallback");
        let password = test_password();

        // Store in fallback
        let result = manager.store_credential(&account_id, &password);
        assert!(
            result.is_ok(),
            "Should store credential in fallback storage"
        );

        // Retrieve from fallback
        let retrieve_result = manager.get_credential(&account_id);
        assert!(
            retrieve_result.is_ok(),
            "Should retrieve from fallback storage"
        );
        assert_eq!(
            retrieve_result.unwrap(),
            password,
            "Fallback retrieved password should match"
        );

        // Delete from fallback
        let delete_result = manager.delete_credential(&account_id);
        assert!(
            delete_result.is_ok(),
            "Should delete from fallback storage"
        );

        // Verify deletion
        let verify_result = manager.get_credential(&account_id);
        assert!(
            verify_result.is_err(),
            "Deleted credential should not exist in fallback"
        );
    }

    // Test 10: Special characters in password
    #[test]
    fn test_special_characters_in_password() {
        let manager = WindowsCredentialManager::new().unwrap();
        manager.reset_to_primary();

        let account_id = test_account_id("special_chars");
        let password = "p@$$w0rd!#$%^&*()_+-=[]{}|;':\",./<>?`~";

        let store_result = manager.store_credential(&account_id, password);
        assert!(
            store_result.is_ok(),
            "Should handle special characters in password"
        );

        let retrieve_result = manager.get_credential(&account_id);
        assert!(
            retrieve_result.is_ok(),
            "Should retrieve password with special characters"
        );
        assert_eq!(
            retrieve_result.unwrap(),
            password,
            "Special characters should be preserved"
        );

        // Cleanup
        let _ = manager.delete_credential(&account_id);
    }

    // Test 11: Empty password handling
    #[test]
    fn test_empty_password_handling() {
        let manager = WindowsCredentialManager::new().unwrap();
        manager.reset_to_primary();

        let account_id = test_account_id("empty_password");
        let password = "";

        // Empty passwords should be stored (some systems allow this)
        let result = manager.store_credential(&account_id, password);
        // This may succeed or fail depending on the backend
        // We're just testing that it doesn't crash

        // Cleanup
        let _ = manager.delete_credential(&account_id);
    }

    // Test 12: Long password handling
    #[test]
    fn test_long_password_handling() {
        let manager = WindowsCredentialManager::new().unwrap();
        manager.reset_to_primary();

        let account_id = test_account_id("long_password");
        let password = "a".repeat(10000); // 10KB password

        let store_result = manager.store_credential(&account_id, &password);
        assert!(
            store_result.is_ok(),
            "Should handle long passwords"
        );

        let retrieve_result = manager.get_credential(&account_id);
        assert!(
            retrieve_result.is_ok(),
            "Should retrieve long password"
        );
        assert_eq!(
            retrieve_result.unwrap().len(),
            10000,
            "Long password length should be preserved"
        );

        // Cleanup
        let _ = manager.delete_credential(&account_id);
    }

    // Test 13: Concurrent credential operations
    #[test]
    fn test_concurrent_operations() {
        use std::sync::Arc;
        use std::thread;

        let manager = Arc::new(WindowsCredentialManager::new().unwrap());
        manager.reset_to_primary();

        let mut handles = vec![];

        // Spawn multiple threads performing concurrent operations
        for i in 0..5 {
            let manager_clone = Arc::clone(&manager);
            let account_id = test_account_id(&format!("concurrent_{}", i));
            let password = format!("password_{}", i);

            let handle = thread::spawn(move || {
                let store_result = manager_clone.store_credential(&account_id, &password);
                assert!(store_result.is_ok(), "Thread {} should store credential", i);

                let retrieve_result = manager_clone.get_credential(&account_id);
                assert!(retrieve_result.is_ok(), "Thread {} should retrieve credential", i);
                assert_eq!(retrieve_result.unwrap(), password);

                let delete_result = manager_clone.delete_credential(&account_id);
                assert!(delete_result.is_ok(), "Thread {} should delete credential", i);

                account_id
            });

            handles.push(handle);
        }

        // Wait for all threads to complete
        for handle in handles {
            handle.join().unwrap();
        }
    }

    // Test 14: Backend availability detection
    #[test]
    fn test_backend_availability_detection() {
        let manager = WindowsCredentialManager::new().unwrap();

        // Test availability check
        let available = manager.is_available();
        assert!(
            available.is_ok(),
            "Should be able to check backend availability"
        );

        let is_available = available.unwrap();
        // If primary is available, we should be able to use it
        if is_available {
            manager.reset_to_primary();
            let account_id = test_account_id("availability");
            let password = test_password();

            let store_result = manager.store_credential(&account_id, &password);
            assert!(
                store_result.is_ok(),
                "Should use primary backend when available"
            );

            // Cleanup
            let _ = manager.delete_credential(&account_id);
        }
    }
}
