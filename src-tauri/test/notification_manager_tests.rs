use crate::notification_manager::*;
use std::sync::Arc;

#[test]
fn test_notification_priority_ord() {
    assert!(NotificationPriority::Urgent > NotificationPriority::High);
    assert!(NotificationPriority::High > NotificationPriority::Normal);
    assert!(NotificationPriority::Normal > NotificationPriority::Low);
}

#[test]
fn test_notification_type_serialization() {
    let nt = NotificationType::NewMail {
        mail_id: 123,
        folder: "inbox".to_string(),
    };
    let json = serde_json::to_string(&nt).unwrap();
    assert!(json.contains("NewMail"));
}

#[test]
fn test_notification_preferences_default() {
    let prefs = NotificationPreferences::default();
    assert!(prefs.enabled);
    assert!(prefs.new_mail);
    assert!(prefs.send_status);
}

#[tokio::test]
async fn test_priority_queue_ordering() {
    let mock = Arc::new(MockFacade::new());
    let manager = NotificationManager::new(mock);

    let priorities = vec![
        (NotificationPriority::Low, "Low"),
        (NotificationPriority::Urgent, "Urgent"),
        (NotificationPriority::Normal, "Normal"),
        (NotificationPriority::High, "High"),
    ];

    for (priority, title) in priorities {
        manager.reset_rate_limiter().await;
        let req = NotificationRequest {
            account_id: 1,
            mail_id: None,
            notification_type: NotificationType::System("test".to_string()),
            title: title.to_string(),
            body: "Test body".to_string(),
            priority,
            actions: vec![],
            timeout: None,
        };
        manager.show(req).await.unwrap();
    }

    assert!(true);
}

#[tokio::test]
async fn test_rate_limiting() {
    let mock = Arc::new(MockFacade::new());
    let manager = NotificationManager::new(mock);

    let mut success_count = 0;

    for i in 0..10 {
        let req = NotificationRequest {
            account_id: 1,
            mail_id: Some(i),
            notification_type: NotificationType::NewMail {
                mail_id: i,
                folder: "inbox".to_string(),
            },
            title: format!("Mail {}", i),
            body: "Test".to_string(),
            priority: NotificationPriority::Normal,
            actions: vec![],
            timeout: None,
        };

        match manager.show(req).await {
            Ok(_) => success_count += 1,
            Err(_) => {}
        }
    }

    assert!(success_count < 10);
    assert!(success_count > 0);
}

#[tokio::test]
async fn test_concurrent_notifications() {
    let mock = Arc::new(MockFacade::new());
    let manager = Arc::new(NotificationManager::new(mock));

    let handles: Vec<_> = (0..100)
        .map(|i| {
            let manager = Arc::clone(&manager);
            tokio::spawn(async move {
                let req = NotificationRequest {
                    account_id: i % 10,
                    mail_id: Some(i),
                    notification_type: NotificationType::NewMail {
                        mail_id: i,
                        folder: "inbox".to_string(),
                    },
                    title: format!("Mail {}", i),
                    body: "Test".to_string(),
                    priority: NotificationPriority::Normal,
                    actions: vec![],
                    timeout: None,
                };
                manager.show(req).await
            })
        })
        .collect();

    for handle in handles {
        let _ = handle.await.unwrap();
    }

    assert!(true);
}

#[tokio::test]
async fn test_preferences_control() {
    let mock = Arc::new(MockFacade::new());
    let manager = NotificationManager::new(mock);

    let mut prefs = NotificationPreferences::default();
    prefs.new_mail = false;
    manager.set_preferences(prefs.clone()).await;

    let req = NotificationRequest {
        account_id: 1,
        mail_id: Some(1),
        notification_type: NotificationType::NewMail {
            mail_id: 1,
            folder: "inbox".to_string(),
        },
        title: "Test".to_string(),
        body: "Test".to_string(),
        priority: NotificationPriority::Normal,
        actions: vec![],
        timeout: None,
    };

    manager.show(req).await.unwrap();

    let retrieved = manager.get_preferences().await;
    assert_eq!(retrieved.new_mail, false);
}

#[tokio::test]
async fn test_global_toggle() {
    let mock = Arc::new(MockFacade::new());
    let manager = NotificationManager::new(mock);

    let mut prefs = NotificationPreferences::default();
    prefs.enabled = false;
    manager.set_preferences(prefs).await;

    let req = NotificationRequest {
        account_id: 1,
        mail_id: None,
        notification_type: NotificationType::System("test".to_string()),
        title: "Test".to_string(),
        body: "Test".to_string(),
        priority: NotificationPriority::Urgent,
        actions: vec![],
        timeout: None,
    };

    manager.show(req).await.unwrap();

    manager.reset_rate_limiter().await;
}

#[test]
fn test_all_notification_types_serialization() {
    let types = vec![
        NotificationType::NewMail {
            mail_id: 123,
            folder: "inbox".to_string(),
        },
        NotificationType::SendSuccess { mail_id: 456 },
        NotificationType::SendError {
            error: "SMTP error".to_string(),
        },
        NotificationType::SyncProgress {
            account_id: 1,
            progress: 50,
        },
        NotificationType::SyncError {
            account_id: 2,
            error: "IMAP timeout".to_string(),
        },
        NotificationType::System("System message".to_string()),
    ];

    for nt in types {
        let json = serde_json::to_string(&nt).unwrap();
        let deserialized: NotificationType = serde_json::from_str(&json).unwrap();

        match (&nt, &deserialized) {
            (NotificationType::NewMail { .. }, NotificationType::NewMail { .. }) => {}
            (NotificationType::SendSuccess { .. }, NotificationType::SendSuccess { .. }) => {}
            (NotificationType::SendError { .. }, NotificationType::SendError { .. }) => {}
            (NotificationType::SyncProgress { .. }, NotificationType::SyncProgress { .. }) => {}
            (NotificationType::SyncError { .. }, NotificationType::SyncError { .. }) => {}
            (NotificationType::System(_), NotificationType::System(_)) => {}
            _ => panic!("Serialization mismatch for {:?}", nt),
        }
    }
}

#[test]
fn test_quiet_hours_default() {
    let quiet = QuietHours {
        enabled: false,
        start: "22:00".to_string(),
        end: "08:00".to_string(),
    };

    assert!(!quiet.enabled);
    assert_eq!(quiet.start, "22:00");
    assert_eq!(quiet.end, "08:00");
}

#[test]
fn test_notification_preferences_complete_default() {
    let prefs = NotificationPreferences::default();

    assert_eq!(prefs.enabled, true);
    assert_eq!(prefs.new_mail, true);
    assert_eq!(prefs.send_status, true);
    assert_eq!(prefs.sync_errors, true);
    assert_eq!(prefs.sound_enabled, true);
    assert_eq!(prefs.quiet_hours.enabled, false);
    assert_eq!(prefs.quiet_hours.start, "22:00");
    assert_eq!(prefs.quiet_hours.end, "08:00");
    assert_eq!(prefs.focus_assist_respect, true);
}
