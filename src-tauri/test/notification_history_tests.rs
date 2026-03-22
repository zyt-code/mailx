/// Notification history tests
#[cfg(test)]
mod tests {
    use crate::database::Database;
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
    fn test_save_notification_to_database() {
        let (db, _temp_dir) = create_test_database();
        let account_id = 123i64;
        let result = db.insert_notification(account_id, Some(456i64), "new_email", "New Email from Test", "You have received a new email", 1, Some("[{}]"));
        assert!(result.is_ok());
        assert!(result.unwrap() > 0);
        let notifications = db.get_notifications(Some(account_id), 10).unwrap();
        assert_eq!(notifications.len(), 1);
        assert_eq!(notifications[0].account_id, account_id);
        assert_eq!(notifications[0].title, "New Email from Test");
    }

    #[test]
    fn test_get_recent_notifications_limit_10() {
        let (db, _temp_dir) = create_test_database();
        let account_id = 123i64;
        for i in 1..=15 {
            db.insert_notification(account_id, Some(i as i64), "test_type", &format!("Test Title {}", i), "Test Body", 1, None).unwrap();
        }
        let notifications = db.get_notifications(Some(account_id), 10).unwrap();
        assert_eq!(notifications.len(), 10);
    }

    #[test]
    fn test_mark_notification_as_read() {
        let (db, _temp_dir) = create_test_database();
        let account_id = 123i64;
        let notification_id = db.insert_notification(account_id, Some(456i64), "new_email", "Test Title", "Test Body", 1, None).unwrap();
        let notifications = db.get_notifications(Some(account_id), 10).unwrap();
        assert!(notifications[0].read_at.is_none());
        db.mark_notification_read(notification_id).unwrap();
        let notifications = db.get_notifications(Some(account_id), 10).unwrap();
        assert!(notifications[0].read_at.is_some());
    }
    #[test]
    fn test_cleanup_old_notifications_30_days() {
        let (db, _temp_dir) = create_test_database();
        let account_id = 123i64;
        let conn = db.conn.lock().unwrap();
        let old_timestamp = chrono::Utc::now() - chrono::Duration::days(31);
        conn.execute("INSERT INTO notifications (account_id, mail_id, type, title, body, priority, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)", rusqlite::params![account_id, 100i64, "old_notification", "Old Notification", "This is old", 1i32, old_timestamp.timestamp_millis()]).unwrap();
        let recent_old_timestamp = chrono::Utc::now() - chrono::Duration::days(29);
        conn.execute("INSERT INTO notifications (account_id, mail_id, type, title, body, priority, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)", rusqlite::params![account_id, 101i64, "recent_old_notification", "Recent Old Notification", "This is recent", 1i32, recent_old_timestamp.timestamp_millis()]).unwrap();
        db.insert_notification(account_id, Some(102i64), "new_notification", "New Notification", "This is new", 1, None).unwrap();
        drop(conn);
        assert_eq!(db.get_notifications(Some(account_id), 100).unwrap().len(), 3);
        assert_eq!(db.cleanup_old_notifications(30).unwrap(), 1);
        assert_eq!(db.get_notifications(Some(account_id), 100).unwrap().len(), 2);
    }

    #[test]
    fn test_get_notifications_by_account() {
        let (db, _temp_dir) = create_test_database();
        let account1_id = 100i64;
        for i in 1..=5 { db.insert_notification(account1_id, Some(i as i64), "account1_type", &format!("Account 1 - Notification {}", i), "Body for account 1", 1, None).unwrap(); }
        let account2_id = 200i64;
        for i in 1..=3 { db.insert_notification(account2_id, Some(i as i64), "account2_type", &format!("Account 2 - Notification {}", i), "Body for account 2", 1, None).unwrap(); }
        assert_eq!(db.get_notifications(Some(account1_id), 100).unwrap().len(), 5);
        assert_eq!(db.get_notifications(Some(account2_id), 100).unwrap().len(), 3);
        assert_eq!(db.get_notifications(None, 100).unwrap().len(), 8);
    }
}
