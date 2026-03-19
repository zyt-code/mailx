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
