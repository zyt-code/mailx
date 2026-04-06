use super::*;

#[test]
fn test_classify_remote_folder_prefers_special_use_attributes() {
    let provider = MailProvider::Generic;

    assert_eq!(
        provider.classify_remote_folder("Deleted Messages", &["\\Trash".to_string()]),
        Some("trash".to_string())
    );
    assert_eq!(
        provider.classify_remote_folder("Archive", &["\\Archive".to_string()]),
        Some("archive".to_string())
    );
    assert_eq!(
        provider.classify_remote_folder("Sent Items", &["\\Sent".to_string()]),
        Some("sent".to_string())
    );
}

#[test]
fn test_classify_remote_folder_falls_back_to_provider_names() {
    let provider = MailProvider::ICloud;

    assert_eq!(
        provider.classify_remote_folder("INBOX", &[]),
        Some("inbox".to_string())
    );
    assert_eq!(
        provider.classify_remote_folder("Drafts", &[]),
        Some("drafts".to_string())
    );
}

#[test]
fn test_classify_remote_folder_returns_prefixed_custom_folder_key() {
    let provider = MailProvider::Generic;

    assert_eq!(
        provider.classify_remote_folder("Projects/2026", &[]),
        Some("custom:Projects/2026".to_string())
    );
}
