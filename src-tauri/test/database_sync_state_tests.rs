use super::*;
use rusqlite::{params, Connection};
use std::path::PathBuf;
use std::sync::Mutex;

fn make_database() -> Database {
    let conn = Connection::open_in_memory().expect("open in-memory db");
    conn.execute_batch(
        "
        PRAGMA foreign_keys=ON;
        CREATE TABLE mails (
            id TEXT PRIMARY KEY,
            uid INTEGER,
            from_name TEXT NOT NULL,
            from_email TEXT NOT NULL,
            subject TEXT NOT NULL,
            preview TEXT,
            body TEXT,
            timestamp INTEGER NOT NULL,
            folder TEXT NOT NULL,
            unread INTEGER DEFAULT 1,
            is_read INTEGER DEFAULT 0,
            account_id TEXT,
            to_json TEXT,
            cc_json TEXT,
            bcc_json TEXT,
            html_body TEXT,
            reply_to_json TEXT,
            starred INTEGER DEFAULT 0,
            has_attachments INTEGER DEFAULT 0,
            created_at INTEGER NOT NULL,
            remote_uid_validity INTEGER,
            content_state TEXT
        );
        ",
    )
    .expect("create mails schema");

    Database {
        conn: Mutex::new(conn),
        attachments_root: PathBuf::from("."),
    }
}

#[test]
fn test_upsert_mail_reuses_existing_row_for_same_account_folder_and_uid() {
    let database = make_database();

    {
        let conn = database.conn.lock().expect("lock db");
        conn.execute(
            "INSERT INTO mails (
                id, uid, from_name, from_email, subject, preview, body, timestamp,
                folder, unread, is_read, account_id, starred, has_attachments,
                created_at, remote_uid_validity, content_state
            ) VALUES (?1, ?2, 'Legacy', 'legacy@example.com', 'Old', '', 'cached body', 1, 'inbox', 1, 0, ?3, 0, 0, 1, NULL, 'body_cached')",
            params!["legacy-id", 42u32, "acc-a"],
        )
        .expect("insert legacy mail");
    }

    let mail = Mail {
        id: "new-generated-id".to_string(),
        uid: Some(42),
        from_name: "Sender".to_string(),
        from_email: "sender@example.com".to_string(),
        subject: "Subject".to_string(),
        preview: "Metadata preview".to_string(),
        body: String::new(),
        timestamp: 2,
        folder: "inbox".to_string(),
        unread: false,
        is_read: true,
        account_id: Some("acc-a".to_string()),
        to: None,
        cc: None,
        bcc: None,
        html_body: None,
        reply_to: None,
        attachments: None,
        starred: Some(false),
        has_attachments: Some(false),
        remote_uid_validity: Some(99),
        content_state: "metadata_only".to_string(),
    };

    database
        .upsert_mail_preserving_read_status(&mail)
        .expect("upsert metadata mail");

    let conn = database.conn.lock().expect("lock db");
    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM mails", [], |row| row.get(0))
        .expect("query count");
    let row: (String, String, Option<i64>) = conn
        .query_row(
            "SELECT id, content_state, remote_uid_validity FROM mails WHERE account_id = ?1 AND folder = ?2 AND uid = ?3",
            params!["acc-a", "inbox", 42u32],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
        )
        .expect("query upgraded row");

    assert_eq!(count, 1);
    assert_eq!(row.0, "legacy-id");
    assert_eq!(row.1, "body_cached");
    assert_eq!(row.2, Some(99));
}
