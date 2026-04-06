use super::*;
use crate::imap_client::{RemoteFolder, SyncFolderRequest};
use crate::mail_provider::MailProvider;
use std::collections::HashSet;

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

#[test]
fn test_partition_sync_requests_keeps_inbox_sent_and_drafts_on_fast_path() {
    let requests = vec![
        SyncFolderRequest {
            local_folder: "trash".to_string(),
            candidate_remote_folders: vec!["Deleted Messages".to_string()],
            last_seen_uid: 0,
            known_uid_validity: None,
            initial_fetch_limit: 20,
        },
        SyncFolderRequest {
            local_folder: "inbox".to_string(),
            candidate_remote_folders: vec!["INBOX".to_string()],
            last_seen_uid: 0,
            known_uid_validity: None,
            initial_fetch_limit: 75,
        },
        SyncFolderRequest {
            local_folder: "sent".to_string(),
            candidate_remote_folders: vec!["Sent Messages".to_string()],
            last_seen_uid: 0,
            known_uid_validity: None,
            initial_fetch_limit: 40,
        },
        SyncFolderRequest {
            local_folder: "archive".to_string(),
            candidate_remote_folders: vec!["Archive".to_string()],
            last_seen_uid: 0,
            known_uid_validity: None,
            initial_fetch_limit: 20,
        },
    ];

    let (high_priority, low_priority) = partition_sync_requests(requests);

    assert_eq!(
        high_priority
            .iter()
            .map(|request| request.local_folder.as_str())
            .collect::<Vec<_>>(),
        vec!["inbox", "sent"]
    );
    assert_eq!(
        low_priority
            .iter()
            .map(|request| request.local_folder.as_str())
            .collect::<Vec<_>>(),
        vec!["trash", "archive"]
    );
}

#[test]
fn test_sync_batch_stats_tracks_inserted_updated_and_new_inbox_unread() {
    let mut stats = SyncBatchStats::default();

    stats.record_mail("inbox", true, true);
    stats.record_mail("inbox", true, false);
    stats.record_mail("sent", false, false);

    assert_eq!(
        stats,
        SyncBatchStats {
            inserted: 2,
            updated: 1,
            new_inbox_unread: 1,
        }
    );
}

#[test]
fn test_sync_batch_stats_reports_when_mailbox_refresh_is_needed() {
    let mut stats = SyncBatchStats::default();
    assert!(!stats.has_mailbox_changes());

    stats.record_mail("archive", false, false);
    assert!(stats.has_mailbox_changes());
}

#[test]
fn test_sync_batch_stats_merges_into_totals() {
    let stats = SyncBatchStats {
        inserted: 3,
        updated: 2,
        new_inbox_unread: 1,
    };

    let mut total_inserted = 4;
    let mut total_updated = 5;
    let mut total_new_inbox_unread = 6;

    stats.merge_into(
        &mut total_inserted,
        &mut total_updated,
        &mut total_new_inbox_unread,
    );

    assert_eq!(total_inserted, 7);
    assert_eq!(total_updated, 7);
    assert_eq!(total_new_inbox_unread, 7);
}

#[test]
fn test_plan_discovered_remote_folders_keeps_custom_and_unsynced_system_folders() {
    let remote_folders = vec![
        RemoteFolder {
            name: "Projects".to_string(),
            attributes: vec![],
        },
        RemoteFolder {
            name: "Archive".to_string(),
            attributes: vec!["\\Archive".to_string()],
        },
        RemoteFolder {
            name: "Deleted Messages".to_string(),
            attributes: vec!["\\Trash".to_string()],
        },
        RemoteFolder {
            name: "Receipts".to_string(),
            attributes: vec!["\\NoSelect".to_string()],
        },
    ];
    let synced_local_folders = HashSet::from([
        "inbox".to_string(),
        "sent".to_string(),
        "trash".to_string(),
    ]);

    let plan =
        plan_discovered_remote_folders(MailProvider::ICloud, remote_folders, &synced_local_folders);

    assert_eq!(
        plan,
        vec![
            DiscoveredFolderPlan {
                local_folder: "custom:Projects".to_string(),
                remote_folder: "Projects".to_string(),
                is_custom: true,
            },
            DiscoveredFolderPlan {
                local_folder: "archive".to_string(),
                remote_folder: "Archive".to_string(),
                is_custom: false,
            },
        ]
    );
}
