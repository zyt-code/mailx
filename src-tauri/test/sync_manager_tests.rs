use super::*;

#[test]
fn test_sync_state_serialization() {
    let state = SyncState::Syncing;
    let json = serde_json::to_string(&state).unwrap();
    assert!(json.contains("Syncing"));
}

#[test]
fn test_sync_status_serialization() {
    let status = SyncStatus {
        account_id: "test_id".to_string(),
        account_email: "test@example.com".to_string(),
        status: SyncState::Idle,
        last_sync: Some(123456789),
        error_message: None,
        retry_count: 0,
        new_count: 0,
    };

    let json = serde_json::to_string(&status).unwrap();
    assert!(json.contains("test@example.com"));
}
