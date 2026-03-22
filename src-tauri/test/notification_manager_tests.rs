use crate::notification_manager::*;

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
