use super::*;

#[test]
fn test_validate_email() {
    assert!(AccountManager::validate_email("test@example.com").is_ok());
    assert!(AccountManager::validate_email("user.name+tag@domain.co.uk").is_ok());
    assert!(AccountManager::validate_email("").is_err());
    assert!(AccountManager::validate_email("invalid").is_err());
    assert!(AccountManager::validate_email("@example.com").is_err());
    assert!(AccountManager::validate_email("test@").is_err());
}
