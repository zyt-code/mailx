/// Notification command tests
/// Tests the integration between Tauri commands and the notification system

#[cfg(test)]
mod tests {
    use crate::database::Database;
    use crate::commands;
    use rusqlite::Connection;
    use tempfile::TempDir;

    fn create_test_database() -> (Database, TempDir) {
        let temp_dir = TempDir::new().expect("Failed to create temp directory");
        let db_path = temp_dir.path().join("test_mailx.db");
        let conn = Connection::open(&db_path).expect("Failed to open test database");
        conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;").expect("Failed to set pragmas");
        init_test_schema(&conn);
        let db = Database { conn: std::sync::Mutex::new(conn), attachments_root: temp_dir.path().join("attachments") };
        (db, temp_dir)
    }

    fn init_test_schema(conn: &Connection) {
        conn.execute("CREATE TABLE IF NOT EXISTS notifications (id INTEGER PRIMARY KEY AUTOINCREMENT, account_id INTEGER NOT NULL, mail_id INTEGER, type TEXT NOT NULL, title TEXT NOT NULL, body TEXT NOT NULL, priority INTEGER NOT NULL DEFAULT 1, actions TEXT, created_at INTEGER NOT NULL, read_at INTEGER)", []).expect("Failed to create notifications table");
        conn.execute("CREATE INDEX IF NOT EXISTS idx_notifications_account ON notifications(account_id)", []).expect("Failed to create account index");
        conn.execute("CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC)", []).expect("Failed to create created_at index");
    }

    #[test]
    fn test_notification_record_creation() {
        let (db, _temp_dir) = create_test_database();
        let account_id = 123i64;
        let notification_id = db.insert_notification(
            account_id,
            Some(456i64),
            "test_email",
            "Test Notification",
            "This is a test notification body",
            1,
            None,
        ).unwrap();
        
        assert!(notification_id > 0, "Notification ID should be positive");
        
        let notifications = db.get_notifications(Some(account_id), 10).unwrap();
        assert_eq!(notifications.len(), 1);
        assert_eq!(notifications[0].notification_type, "test_email");
    }

    #[test]
    fn test_notification_with_json_actions() {
        let (db, _temp_dir) = create_test_database();
        let account_id = 123i64;
        let actions_json = r#"[{"id": "read", "label": "Read Email"}, {"id": "archive", "label": "Archive"}]"#;
        
        let _notification_id = db.insert_notification(
            account_id,
            Some(789i64),
            "new_email",
            "Email with Actions",
            "This email has actionable buttons",
            1,
            Some(actions_json),
        ).unwrap();
        
        let notifications = db.get_notifications(Some(account_id), 10).unwrap();
        assert_eq!(notifications.len(), 1);
        assert_eq!(notifications[0].actions, Some(actions_json.to_string()));
    }

    #[test]
    fn test_notification_priority_levels() {
        let (db, _temp_dir) = create_test_database();
        let account_id = 123i64;
        
        db.insert_notification(account_id, None, "low_priority", "Low Priority", "Body", 1, None).unwrap();
        db.insert_notification(account_id, None, "normal_priority", "Normal Priority", "Body", 2, None).unwrap();
        db.insert_notification(account_id, None, "high_priority", "High Priority", "Body", 3, None).unwrap();
        
        let notifications = db.get_notifications(Some(account_id), 100).unwrap();
        assert_eq!(notifications.len(), 3);
        
        let priorities: Vec<i32> = notifications.iter().map(|n| n.priority).collect();
        assert!(priorities.contains(&1));
        assert!(priorities.contains(&2));
        assert!(priorities.contains(&3));
    }

    #[test]
    fn test_notification_read_unread_states() {
        let (db, _temp_dir) = create_test_database();
        let account_id = 123i64;
        
        let id1 = db.insert_notification(account_id, None, "test1", "Test 1", "Body 1", 1, None).unwrap();
        let id2 = db.insert_notification(account_id, None, "test2", "Test 2", "Body 2", 1, None).unwrap();
        
        let notifications = db.get_notifications(Some(account_id), 100).unwrap();
        assert!(notifications.iter().all(|n| n.read_at.is_none()));
        
        db.mark_notification_read(id1).unwrap();
        
        let notifications = db.get_notifications(Some(account_id), 100).unwrap();
        let unread_count = notifications.iter().filter(|n| n.read_at.is_none()).count();
        let read_count = notifications.iter().filter(|n| n.read_at.is_some()).count();
        assert_eq!(unread_count, 1);
        assert_eq!(read_count, 1);
    }
}
