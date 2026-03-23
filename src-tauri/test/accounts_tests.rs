use super::*;
use rusqlite::{params, Connection};

#[test]
fn test_validate_email() {
    assert!(AccountManager::validate_email("test@example.com").is_ok());
    assert!(AccountManager::validate_email("user.name+tag@domain.co.uk").is_ok());
    assert!(AccountManager::validate_email("").is_err());
    assert!(AccountManager::validate_email("invalid").is_err());
    assert!(AccountManager::validate_email("@example.com").is_err());
    assert!(AccountManager::validate_email("test@").is_err());
}

#[test]
fn test_delete_account_removes_account_scoped_data() {
    let conn = Connection::open_in_memory().expect("open in-memory db");
    conn.execute_batch(
        "
        PRAGMA foreign_keys=ON;
        CREATE TABLE accounts (
            id TEXT PRIMARY KEY,
            email TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL,
            imap_server TEXT NOT NULL,
            imap_port INTEGER NOT NULL DEFAULT 993,
            imap_use_ssl INTEGER NOT NULL DEFAULT 1,
            smtp_server TEXT NOT NULL,
            smtp_port INTEGER NOT NULL DEFAULT 587,
            smtp_use_ssl INTEGER NOT NULL DEFAULT 1,
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        );
        CREATE TABLE mails (
            id TEXT PRIMARY KEY,
            account_id TEXT,
            subject TEXT NOT NULL
        );
        CREATE TABLE mail_attachments (
            id TEXT PRIMARY KEY,
            mail_id TEXT NOT NULL,
            file_name TEXT NOT NULL,
            content_type TEXT NOT NULL,
            size INTEGER NOT NULL,
            stored_path TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            FOREIGN KEY (mail_id) REFERENCES mails(id) ON DELETE CASCADE
        );
        CREATE TABLE outbox (
            id TEXT PRIMARY KEY,
            account_id TEXT NOT NULL,
            mail_data TEXT NOT NULL,
            recipients TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            error_message TEXT,
            retry_count INTEGER NOT NULL DEFAULT 0,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
        );
        CREATE TABLE sync_state (
            account_id TEXT PRIMARY KEY,
            last_full_sync INTEGER,
            last_incremental_sync INTEGER,
            sync_status TEXT NOT NULL DEFAULT 'idle',
            error_message TEXT,
            retry_count INTEGER NOT NULL DEFAULT 0,
            FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
        );
        CREATE TABLE imap_folders (
            id TEXT PRIMARY KEY,
            account_id TEXT NOT NULL,
            name TEXT NOT NULL,
            remote_uid_validity INTEGER NOT NULL,
            remote_last_uid INTEGER NOT NULL DEFAULT 0,
            local_count INTEGER NOT NULL DEFAULT 0,
            created_at INTEGER NOT NULL,
            FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
        );
        ",
    )
    .expect("create schema");

    conn.execute(
        "INSERT INTO accounts (id, email, name, imap_server, imap_port, imap_use_ssl, smtp_server, smtp_port, smtp_use_ssl, is_active, created_at, updated_at)
         VALUES (?1, ?2, ?3, 'imap.example.com', 993, 1, 'smtp.example.com', 587, 1, 1, 1, 1)",
        params!["acc-a", "a@example.com", "A"],
    )
    .expect("insert account a");
    conn.execute(
        "INSERT INTO accounts (id, email, name, imap_server, imap_port, imap_use_ssl, smtp_server, smtp_port, smtp_use_ssl, is_active, created_at, updated_at)
         VALUES (?1, ?2, ?3, 'imap.example.com', 993, 1, 'smtp.example.com', 587, 1, 1, 1, 1)",
        params!["acc-b", "b@example.com", "B"],
    )
    .expect("insert account b");

    conn.execute(
        "INSERT INTO mails (id, account_id, subject) VALUES (?1, ?2, ?3)",
        params!["mail-a", "acc-a", "mail for a"],
    )
    .expect("insert mail a");
    conn.execute(
        "INSERT INTO mails (id, account_id, subject) VALUES (?1, ?2, ?3)",
        params!["mail-b", "acc-b", "mail for b"],
    )
    .expect("insert mail b");

    conn.execute(
        "INSERT INTO mail_attachments (id, mail_id, file_name, content_type, size, stored_path, created_at)
         VALUES (?1, ?2, 'a.txt', 'text/plain', 1, '/tmp/a.txt', 1)",
        params!["att-a", "mail-a"],
    )
    .expect("insert attachment a");
    conn.execute(
        "INSERT INTO mail_attachments (id, mail_id, file_name, content_type, size, stored_path, created_at)
         VALUES (?1, ?2, 'b.txt', 'text/plain', 1, '/tmp/b.txt', 1)",
        params!["att-b", "mail-b"],
    )
    .expect("insert attachment b");

    conn.execute(
        "INSERT INTO outbox (id, account_id, mail_data, recipients, status, created_at, updated_at)
         VALUES (?1, ?2, '{}', '[]', 'pending', 1, 1)",
        params!["out-a", "acc-a"],
    )
    .expect("insert outbox a");
    conn.execute(
        "INSERT INTO sync_state (account_id, sync_status, retry_count) VALUES (?1, 'idle', 0)",
        params!["acc-a"],
    )
    .expect("insert sync_state a");
    conn.execute(
        "INSERT INTO imap_folders (id, account_id, name, remote_uid_validity, remote_last_uid, local_count, created_at)
         VALUES (?1, ?2, 'INBOX', 1, 1, 1, 1)",
        params!["folder-a", "acc-a"],
    )
    .expect("insert folder a");

    let manager = AccountManager::new(conn);
    manager.delete("acc-a").expect("delete account a");

    let conn = manager.conn.lock().expect("lock conn");

    let account_a_count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM accounts WHERE id = 'acc-a'",
            [],
            |row| row.get(0),
        )
        .expect("query account a count");
    let account_b_count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM accounts WHERE id = 'acc-b'",
            [],
            |row| row.get(0),
        )
        .expect("query account b count");
    let mail_a_count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM mails WHERE account_id = 'acc-a'",
            [],
            |row| row.get(0),
        )
        .expect("query mail a count");
    let mail_b_count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM mails WHERE account_id = 'acc-b'",
            [],
            |row| row.get(0),
        )
        .expect("query mail b count");
    let attachment_a_count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM mail_attachments WHERE mail_id = 'mail-a'",
            [],
            |row| row.get(0),
        )
        .expect("query attachment a count");
    let attachment_b_count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM mail_attachments WHERE mail_id = 'mail-b'",
            [],
            |row| row.get(0),
        )
        .expect("query attachment b count");

    assert_eq!(account_a_count, 0);
    assert_eq!(account_b_count, 1);
    assert_eq!(mail_a_count, 0);
    assert_eq!(mail_b_count, 1);
    assert_eq!(attachment_a_count, 0);
    assert_eq!(attachment_b_count, 1);
}
