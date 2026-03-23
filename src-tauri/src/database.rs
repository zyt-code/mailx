use regex::Regex;
use rusqlite::{params, Connection, Result as SqliteResult};
use std::collections::HashSet;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use tauri::AppHandle;
use tauri::Manager;

/// Email address structure for recipients
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct EmailAddress {
    pub name: String,
    pub email: String,
}

/// Attachment structure for email attachments
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct Attachment {
    pub id: String,
    pub mail_id: String,
    pub file_name: String,
    pub content_type: String,
    pub size: i64,
    pub stored_path: String,
    pub created_at: i64,
}


/// Notification record for history tracking
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct NotificationRecord {
    pub id: i64,
    pub account_id: i64,
    pub mail_id: Option<i64>,
    pub notification_type: String,
    pub title: String,
    pub body: String,
    pub priority: i32,
    pub actions: Option<String>,
    pub created_at: i64,
    pub read_at: Option<i64>,
}

/// Mail structure matching frontend types
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct Mail {
    pub id: String,
    #[serde(default)]
    pub uid: Option<u32>,
    pub from_name: String,
    pub from_email: String,
    pub subject: String,
    pub preview: String,
    pub body: String,
    pub timestamp: i64,
    pub folder: String,
    pub unread: bool,
    #[serde(default)]
    pub is_read: bool,
    #[serde(default)]
    pub account_id: Option<String>,
    #[serde(default)]
    pub to: Option<Vec<EmailAddress>>,
    #[serde(default)]
    pub cc: Option<Vec<EmailAddress>>,
    #[serde(default)]
    pub bcc: Option<Vec<EmailAddress>>,
    #[serde(default)]
    pub html_body: Option<String>,
    #[serde(default)]
    pub reply_to: Option<Vec<EmailAddress>>,
    #[serde(default)]
    pub attachments: Option<Vec<Attachment>>,
    #[serde(default)]
    pub starred: Option<bool>,
    #[serde(default)]
    pub has_attachments: Option<bool>,
}

/// Database wrapper for SQLite operations
pub struct Database {
    pub conn: Mutex<Connection>,
    pub attachments_root: PathBuf,
}

// SAFETY: rusqlite::Connection is Send + Sync when using bundled features
// and we're using a Mutex to ensure only one thread accesses it at a time.
unsafe impl Send for Database {}
unsafe impl Sync for Database {}

impl Database {
    /// Create or open the database at the app data directory
    pub fn new(app_handle: &AppHandle) -> SqliteResult<Self> {
        let app_data_dir = app_handle
            .path()
            .app_data_dir()
            .expect("Failed to get app data dir");

        // Ensure app data directory exists
        fs::create_dir_all(&app_data_dir).expect("Failed to create app data directory");

        let db_path = app_data_dir.join("mailx.db");
        let attachments_root = app_data_dir.join("attachments");
        fs::create_dir_all(&attachments_root).expect("Failed to create attachments directory");
        let conn = Connection::open(db_path)?;
        conn.execute_batch(
            "PRAGMA journal_mode=WAL;
             PRAGMA foreign_keys=ON;",
        )?;

        let db = Database {
            conn: Mutex::new(conn),
            attachments_root,
        };
        db.init_schema()?;
        Ok(db)
    }

    /// Initialize database schema with mails table and indexes
    fn init_schema(&self) -> SqliteResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "CREATE TABLE IF NOT EXISTS mails (
                id TEXT PRIMARY KEY,
                from_name TEXT NOT NULL,
                from_email TEXT NOT NULL,
                subject TEXT NOT NULL,
                preview TEXT,
                body TEXT,
                timestamp INTEGER NOT NULL,
                folder TEXT NOT NULL,
                unread INTEGER DEFAULT 1,
                created_at INTEGER NOT NULL
            )",
            [],
        )?;

        // Create indexes for common query patterns
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_mails_folder ON mails(folder)",
            [],
        )?;

        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_mails_timestamp ON mails(timestamp DESC)",
            [],
        )?;

        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_mails_unread ON mails(unread, folder)",
            [],
        )?;

        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_mails_account_uid ON mails(account_id, uid)",
            [],
        )?;

        drop(conn); // Release lock before calling seed_initial_data

        // Run any schema migrations BEFORE seeding
        self.run_migrations()?;

        Ok(())
    }

    /// Run database schema migrations
    fn run_migrations(&self) -> SqliteResult<()> {
        let conn = self.conn.lock().unwrap();

        // Add to_json column if not exists
        conn.execute("ALTER TABLE mails ADD COLUMN to_json TEXT", [])
            .ok();

        // Add cc_json column if not exists
        conn.execute("ALTER TABLE mails ADD COLUMN cc_json TEXT", [])
            .ok();

        // Add bcc_json column if not exists
        conn.execute("ALTER TABLE mails ADD COLUMN bcc_json TEXT", [])
            .ok();

        // Add account_id column if not exists
        conn.execute("ALTER TABLE mails ADD COLUMN account_id TEXT", [])
            .ok();

        // Add uid column if not exists
        conn.execute("ALTER TABLE mails ADD COLUMN uid INTEGER", [])
            .ok();

        // Add html_body column if not exists (Phase 1)
        conn.execute("ALTER TABLE mails ADD COLUMN html_body TEXT", [])
            .ok();

        // Add reply_to_json column if not exists (Phase 1)
        conn.execute("ALTER TABLE mails ADD COLUMN reply_to_json TEXT", [])
            .ok();

        // Add starred column if not exists (Phase 1)
        conn.execute("ALTER TABLE mails ADD COLUMN starred INTEGER DEFAULT 0", [])
            .ok();

        // Add has_attachments column if not exists (Phase 1)
        conn.execute(
            "ALTER TABLE mails ADD COLUMN has_attachments INTEGER DEFAULT 0",
            [],
        )
        .ok();

        // Add is_read column if not exists (Phase 2 - read/unread state tracking)
        conn.execute("ALTER TABLE mails ADD COLUMN is_read INTEGER DEFAULT 0", [])
            .ok();

        // Create accounts table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS accounts (
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
            )",
            [],
        )?;

        // Create imap_folders table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS imap_folders (
                id TEXT PRIMARY KEY,
                account_id TEXT NOT NULL,
                name TEXT NOT NULL,
                remote_uid_validity INTEGER NOT NULL,
                remote_last_uid INTEGER NOT NULL DEFAULT 0,
                local_count INTEGER NOT NULL DEFAULT 0,
                created_at INTEGER NOT NULL,
                FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
            )",
            [],
        )?;

        // Create sync_state table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS sync_state (
                account_id TEXT PRIMARY KEY,
                last_full_sync INTEGER,
                last_incremental_sync INTEGER,
                sync_status TEXT NOT NULL DEFAULT 'idle',
                error_message TEXT,
                retry_count INTEGER NOT NULL DEFAULT 0,
                FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
            )",
            [],
        )?;

        // Create outbox table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS outbox (
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
            )",
            [],
        )?;

        // Create attachments table for compose/uploaded files.
        conn.execute(
            "CREATE TABLE IF NOT EXISTS mail_attachments (
                id TEXT PRIMARY KEY,
                mail_id TEXT NOT NULL,
                file_name TEXT NOT NULL,
                content_type TEXT NOT NULL,
                size INTEGER NOT NULL,
                stored_path TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                FOREIGN KEY (mail_id) REFERENCES mails(id) ON DELETE CASCADE
            )",
            [],
        )?;

        // Create index for account-based mail queries
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_mails_account ON mails(account_id, folder)",
            [],
        )?;

        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_mail_attachments_mail_id ON mail_attachments(mail_id)",
            [],
        )?;


        // Create notifications table for history tracking
        conn.execute(
            "CREATE TABLE IF NOT EXISTS notifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                account_id INTEGER NOT NULL,
                mail_id INTEGER,
                type TEXT NOT NULL,
                title TEXT NOT NULL,
                body TEXT NOT NULL,
                priority INTEGER NOT NULL DEFAULT 1,
                actions TEXT,
                created_at INTEGER NOT NULL,
                read_at INTEGER,
                FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
            )",
            [],
        )?;

        // Create indexes for notifications
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_notifications_account ON notifications(account_id)",
            [],
        )?;

        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type)",
            [],
        )?;

        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC)",
            [],
        )?;

        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_notifications_account_created ON notifications(account_id, created_at DESC)",
            [],
        )?;

        Ok(())
    }

    /// Get mails with pagination, optionally filtered by folder and account
    pub fn get_mails(
        &self,
        folder: Option<String>,
        account_id: Option<String>,
        limit: Option<i64>,
        offset: Option<i64>,
    ) -> SqliteResult<Vec<Mail>> {
        let conn = self.conn.lock().unwrap();

        let mut query = "SELECT id, uid, from_name, from_email, subject, preview, body, timestamp, folder, unread, account_id, to_json, cc_json, bcc_json, html_body, reply_to_json, starred, has_attachments FROM mails".to_string();
        let mut params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();
        let mut conditions = Vec::new();

        // Build WHERE clause based on provided filters
        if let Some(folder) = &folder {
            conditions.push("folder = ?");
            params.push(Box::new(folder.clone()));
        }
        if let Some(account_id) = &account_id {
            conditions.push("account_id = ?");
            params.push(Box::new(account_id.clone()));
        }

        if !conditions.is_empty() {
            query.push_str(" WHERE ");
            query.push_str(&conditions.join(" AND "));
        }
        query.push_str(" ORDER BY timestamp DESC");

        // Apply pagination
        let effective_limit = limit.unwrap_or(50);
        let effective_offset = offset.unwrap_or(0);
        query.push_str(" LIMIT ? OFFSET ?");
        params.push(Box::new(effective_limit));
        params.push(Box::new(effective_offset));

        let mut stmt = conn.prepare(&query)?;
        let mail_iter = stmt.query_map(rusqlite::params_from_iter(params), |row| {
            let unread_flag = row.get::<_, i32>(9)? == 1;
            Ok(Mail {
                id: row.get(0)?,
                uid: row.get(1)?,
                from_name: row.get(2)?,
                from_email: row.get(3)?,
                subject: row.get(4)?,
                preview: row.get(5)?,
                body: row.get(6)?,
                timestamp: row.get(7)?,
                folder: row.get(8)?,
                unread: unread_flag,
                is_read: !unread_flag,
                account_id: row.get(10)?,
                to: parse_json_addresses(row.get(11)?),
                cc: parse_json_addresses(row.get(12)?),
                bcc: parse_json_addresses(row.get(13)?),
                html_body: row.get(14)?,
                reply_to: parse_json_addresses(row.get(15)?),
                starred: Some(row.get::<_, i32>(16).unwrap_or(0) == 1),
                has_attachments: Some(row.get::<_, i32>(17).unwrap_or(0) == 1),
                attachments: None, // Loaded separately
            })
        })?;

        let mut mails = Vec::new();
        for mail in mail_iter {
            mails.push(mail?);
        }

        Ok(mails)
    }

    /// Get total count of mails matching folder/account filters
    pub fn get_mails_count(
        &self,
        folder: Option<String>,
        account_id: Option<String>,
    ) -> SqliteResult<i64> {
        let conn = self.conn.lock().unwrap();

        let mut query = "SELECT COUNT(*) FROM mails".to_string();
        let mut params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();
        let mut conditions = Vec::new();

        if let Some(folder) = &folder {
            conditions.push("folder = ?");
            params.push(Box::new(folder.clone()));
        }
        if let Some(account_id) = &account_id {
            conditions.push("account_id = ?");
            params.push(Box::new(account_id.clone()));
        }

        if !conditions.is_empty() {
            query.push_str(" WHERE ");
            query.push_str(&conditions.join(" AND "));
        }

        let mut stmt = conn.prepare(&query)?;
        let count: i64 = stmt.query_row(rusqlite::params_from_iter(params), |row| row.get(0))?;
        Ok(count)
    }

    /// Get a single mail by ID
    pub fn get_mail(&self, id: &str) -> SqliteResult<Option<Mail>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, uid, from_name, from_email, subject, preview, body, timestamp, folder, unread, account_id, to_json, cc_json, bcc_json, html_body, reply_to_json, starred, has_attachments
             FROM mails WHERE id = ?1"
        )?;

        let mail = stmt.query_row(params![id], |row| {
            let unread_flag = row.get::<_, i32>(9)? == 1;
            Ok(Mail {
                id: row.get(0)?,
                uid: row.get(1)?,
                from_name: row.get(2)?,
                from_email: row.get(3)?,
                subject: row.get(4)?,
                preview: row.get(5)?,
                body: row.get(6)?,
                timestamp: row.get(7)?,
                folder: row.get(8)?,
                unread: unread_flag,
                is_read: !unread_flag,
                account_id: row.get(10)?,
                to: parse_json_addresses(row.get(11)?),
                cc: parse_json_addresses(row.get(12)?),
                bcc: parse_json_addresses(row.get(13)?),
                html_body: row.get(14)?,
                reply_to: parse_json_addresses(row.get(15)?),
                starred: Some(row.get::<_, i32>(16).unwrap_or(0) == 1),
                has_attachments: Some(row.get::<_, i32>(17).unwrap_or(0) == 1),
                attachments: None, // Loaded separately
            })
        });

        match mail {
            Ok(m) => Ok(Some(m)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e),
        }
    }

    /// Insert or update a mail, preserving the local read/unread status if it already exists
    pub fn upsert_mail_preserving_read_status(&self, mail: &Mail) -> SqliteResult<()> {
        let conn = self.conn.lock().unwrap();

        // Check if mail already exists and get the local-only fields we need to preserve
        let existing_row = conn.query_row(
            "SELECT unread, created_at, folder, starred FROM mails WHERE id = ?1",
            params![&mail.id],
            |row| {
                let unread: i32 = row.get(0)?;
                let created_at: i64 = row.get(1)?;
                let folder: String = row.get(2)?;
                // Starred is stored as 0/1 but may be NULL, so handle Option explicitly
                let starred: bool = match row.get::<_, Option<i32>>(3)? {
                    Some(value) => value == 1,
                    None => false,
                };
                Ok((unread == 1, created_at, folder, starred))
            },
        );

        // Use existing read status/created_at/folder/starred if mail exists,
        // or use server status + current time if new
        let (unread, is_read, created_at, folder_value, starred_value) = match existing_row {
            Ok((local_unread, local_created_at, local_folder, local_starred)) => {
                // Mail exists: preserve local read status, created timestamp,
                // folder (moves/archives) and starred state
                println!(
                    "[DB] Upsert mail {}: preserving local unread={}, folder='{}', starred={}, created_at={}",
                    mail.id, local_unread, local_folder, local_starred, local_created_at
                );
                (
                    local_unread,
                    !local_unread,
                    local_created_at,
                    local_folder,
                    local_starred,
                )
            }
            Err(_) => {
                // New mail: use the status from the server and current time
                let now = chrono::Utc::now().timestamp_millis();
                println!(
                    "[DB] Upsert mail {}: new mail, using server unread={}, folder='{}', starred={}, created_at={}",
                    mail.id,
                    mail.unread,
                    mail.folder,
                    mail.starred.unwrap_or(false),
                    now
                );
                (
                    mail.unread,
                    mail.is_read,
                    now,
                    mail.folder.clone(),
                    mail.starred.unwrap_or(false),
                )
            }
        };

        // Serialize addresses using the existing helper function
        let to_json = serialize_addresses(&mail.to);
        let cc_json = serialize_addresses(&mail.cc);
        let bcc_json = serialize_addresses(&mail.bcc);
        let reply_to_json = serialize_addresses(&mail.reply_to);
        let clean_preview = strip_html(&mail.preview);

        conn.execute(
            "INSERT OR REPLACE INTO mails (
                id, uid, from_name, from_email, subject, preview, body, timestamp,
                folder, unread, is_read, account_id, to_json, cc_json, bcc_json,
                html_body, reply_to_json, starred, has_attachments, created_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20)",
            params![
                &mail.id,
                mail.uid,
                &mail.from_name,
                &mail.from_email,
                &mail.subject,
                clean_preview,
                &mail.body,
                mail.timestamp,
                &folder_value,
                unread as i32,
                is_read as i32,
                &mail.account_id,
                to_json,
                cc_json,
                bcc_json,
                &mail.html_body,
                reply_to_json,
                starred_value as i32,
                mail.has_attachments.unwrap_or(false) as i32,
                created_at,
            ],
        )?;

        Ok(())
    }

    /// Get a single mail by account and UID
    pub fn get_mail_by_account_and_uid(
        &self,
        account_id: &str,
        uid: u32,
    ) -> SqliteResult<Option<Mail>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, uid, from_name, from_email, subject, preview, body, timestamp, folder, unread, account_id, to_json, cc_json, bcc_json, html_body, reply_to_json, starred, has_attachments
             FROM mails WHERE account_id = ?1 AND uid = ?2 LIMIT 1"
        )?;

        let mut rows = stmt.query(params![account_id, uid])?;
        if let Some(row) = rows.next()? {
            let unread_flag = row.get::<_, i32>(9)? == 1;
            Ok(Some(Mail {
                id: row.get(0)?,
                uid: row.get(1)?,
                from_name: row.get(2)?,
                from_email: row.get(3)?,
                subject: row.get(4)?,
                preview: row.get(5)?,
                body: row.get(6)?,
                timestamp: row.get(7)?,
                folder: row.get(8)?,
                unread: unread_flag,
                is_read: !unread_flag,
                account_id: row.get(10)?,
                to: parse_json_addresses(row.get(11)?),
                cc: parse_json_addresses(row.get(12)?),
                bcc: parse_json_addresses(row.get(13)?),
                html_body: row.get(14)?,
                reply_to: parse_json_addresses(row.get(15)?),
                starred: Some(row.get::<_, i32>(16).unwrap_or(0) == 1),
                has_attachments: Some(row.get::<_, i32>(17).unwrap_or(0) == 1),
                attachments: None,
            }))
        } else {
            Ok(None)
        }
    }

    /// Insert a new mail into the database
    pub fn insert_mail(&self, mail: &Mail) -> SqliteResult<()> {
        let conn = self.conn.lock().unwrap();
        let now = chrono::Utc::now().timestamp_millis();
        let to_json = serialize_addresses(&mail.to);
        let cc_json = serialize_addresses(&mail.cc);
        let bcc_json = serialize_addresses(&mail.bcc);
        let reply_to_json = serialize_addresses(&mail.reply_to);
        let clean_preview = strip_html(&mail.preview);
        conn.execute(
            "INSERT INTO mails (id, uid, from_name, from_email, subject, preview, body, timestamp, folder, unread, account_id, created_at, to_json, cc_json, bcc_json, html_body, reply_to_json, starred, has_attachments)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19)",
            params![
                &mail.id,
                &mail.uid,
                &mail.from_name,
                &mail.from_email,
                &mail.subject,
                clean_preview,
                &mail.body,
                &mail.timestamp,
                &mail.folder,
                if mail.is_read { 0 } else { 1 },
                &mail.account_id,
                now,
                to_json,
                cc_json,
                bcc_json,
                &mail.html_body,
                reply_to_json,
                if mail.starred.unwrap_or(false) { 1 } else { 0 },
                if mail.has_attachments.unwrap_or(false) { 1 } else { 0 },
            ],
        )?;
        Ok(())
    }

    /// Update an existing mail
    pub fn update_mail(&self, mail: &Mail) -> SqliteResult<()> {
        let conn = self.conn.lock().unwrap();
        let to_json = serialize_addresses(&mail.to);
        let cc_json = serialize_addresses(&mail.cc);
        let bcc_json = serialize_addresses(&mail.bcc);
        let reply_to_json = serialize_addresses(&mail.reply_to);
        let clean_preview = strip_html(&mail.preview);
        conn.execute(
            "UPDATE mails SET
             uid = ?1,
             from_name = ?2,
             from_email = ?3,
             subject = ?4,
             preview = ?5,
             body = ?6,
             timestamp = ?7,
             folder = ?8,
             unread = ?9,
             account_id = ?10,
             to_json = ?11,
             cc_json = ?12,
             bcc_json = ?13,
             html_body = ?14,
             reply_to_json = ?15,
             starred = ?16,
             has_attachments = ?17
             WHERE id = ?18",
            params![
                &mail.uid,
                &mail.from_name,
                &mail.from_email,
                &mail.subject,
                clean_preview,
                &mail.body,
                &mail.timestamp,
                &mail.folder,
                if mail.is_read { 0 } else { 1 },
                &mail.account_id,
                to_json,
                cc_json,
                bcc_json,
                &mail.html_body,
                reply_to_json,
                if mail.starred.unwrap_or(false) { 1 } else { 0 },
                if mail.has_attachments.unwrap_or(false) {
                    1
                } else {
                    0
                },
                &mail.id,
            ],
        )?;
        Ok(())
    }

    /// Persist an attachment file and register metadata for a mail draft.
    pub fn add_mail_attachment(
        &self,
        mail_id: &str,
        file_name: &str,
        content_type: &str,
        data: &[u8],
    ) -> Result<Attachment, String> {
        {
            let conn = self.conn.lock().unwrap();
            let exists: i64 = conn
                .query_row(
                    "SELECT COUNT(*) FROM mails WHERE id = ?1",
                    params![mail_id],
                    |row| row.get(0),
                )
                .map_err(|e| format!("Failed to verify mail: {}", e))?;
            if exists == 0 {
                return Err(format!("Mail '{}' not found", mail_id));
            }
        }

        let now = chrono::Utc::now();
        let created_at = now.timestamp_millis();
        let unique_ns = now.timestamp_nanos_opt().unwrap_or(created_at * 1_000_000);
        let attachment_id = format!(
            "att-{}-{}",
            unique_ns,
            sanitize_filename(file_name).chars().take(12).collect::<String>()
        );
        let safe_file_name = sanitize_filename(file_name);
        let mail_dir = self.attachments_root.join(mail_id);
        fs::create_dir_all(&mail_dir)
            .map_err(|e| format!("Failed to create attachment directory: {}", e))?;
        let stored_path = mail_dir.join(format!("{}-{}", attachment_id, safe_file_name));
        fs::write(&stored_path, data)
            .map_err(|e| format!("Failed to write attachment file: {}", e))?;

        let attachment = Attachment {
            id: attachment_id,
            mail_id: mail_id.to_string(),
            file_name: file_name.to_string(),
            content_type: content_type.to_string(),
            size: data.len() as i64,
            stored_path: stored_path.to_string_lossy().to_string(),
            created_at,
        };

        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO mail_attachments (id, mail_id, file_name, content_type, size, stored_path, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![
                &attachment.id,
                &attachment.mail_id,
                &attachment.file_name,
                &attachment.content_type,
                attachment.size,
                &attachment.stored_path,
                attachment.created_at,
            ],
        )
        .map_err(|e| format!("Failed to save attachment metadata: {}", e))?;

        conn.execute(
            "UPDATE mails SET has_attachments = 1 WHERE id = ?1",
            params![mail_id],
        )
        .map_err(|e| format!("Failed to update mail attachment flag: {}", e))?;

        Ok(attachment)
    }

    /// Get all persisted attachments for a mail.
    pub fn get_mail_attachments(&self, mail_id: &str) -> Result<Vec<Attachment>, String> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn
            .prepare(
                "SELECT id, mail_id, file_name, content_type, size, stored_path, created_at
                 FROM mail_attachments WHERE mail_id = ?1 ORDER BY created_at ASC",
            )
            .map_err(|e| format!("Failed to prepare attachment query: {}", e))?;

        let rows = stmt
            .query_map(params![mail_id], |row| {
                Ok(Attachment {
                    id: row.get(0)?,
                    mail_id: row.get(1)?,
                    file_name: row.get(2)?,
                    content_type: row.get(3)?,
                    size: row.get(4)?,
                    stored_path: row.get(5)?,
                    created_at: row.get(6)?,
                })
            })
            .map_err(|e| format!("Failed to query attachments: {}", e))?;

        let mut attachments = Vec::new();
        for row in rows {
            attachments.push(row.map_err(|e| format!("Failed to parse attachment row: {}", e))?);
        }
        Ok(attachments)
    }

    /// Remove an attachment and update the parent mail attachment flag.
    pub fn delete_mail_attachment(&self, attachment_id: &str) -> Result<(), String> {
        let (mail_id, stored_path) = {
            let conn = self.conn.lock().unwrap();
            let result = conn.query_row(
                "SELECT mail_id, stored_path FROM mail_attachments WHERE id = ?1",
                params![attachment_id],
                |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?)),
            );

            match result {
                Ok(data) => data,
                Err(rusqlite::Error::QueryReturnedNoRows) => return Ok(()),
                Err(e) => return Err(format!("Failed to find attachment: {}", e)),
            }
        };

        let conn = self.conn.lock().unwrap();
        conn.execute(
            "DELETE FROM mail_attachments WHERE id = ?1",
            params![attachment_id],
        )
        .map_err(|e| format!("Failed to delete attachment metadata: {}", e))?;

        let remaining: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM mail_attachments WHERE mail_id = ?1",
                params![&mail_id],
                |row| row.get(0),
            )
            .map_err(|e| format!("Failed to count remaining attachments: {}", e))?;

        conn.execute(
            "UPDATE mails SET has_attachments = ?1 WHERE id = ?2",
            params![if remaining > 0 { 1 } else { 0 }, &mail_id],
        )
        .map_err(|e| format!("Failed to update attachment flag: {}", e))?;

        drop(conn);

        // File delete runs after DB updates to avoid leaving stale metadata.
        if let Err(e) = fs::remove_file(Path::new(&stored_path)) {
            // Ignore not found to keep delete idempotent.
            if e.kind() != std::io::ErrorKind::NotFound {
                return Err(format!("Failed to remove attachment file: {}", e));
            }
        }

        Ok(())
    }

    /// Delete a mail by ID
    pub fn delete_mail(&self, id: &str) -> SqliteResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM mail_attachments WHERE mail_id = ?1", params![id])?;
        conn.execute("DELETE FROM mails WHERE id = ?1", params![id])?;
        drop(conn);

        let mail_dir = self.attachments_root.join(id);
        if let Err(e) = fs::remove_dir_all(&mail_dir) {
            if e.kind() != std::io::ErrorKind::NotFound {
                eprintln!(
                    "[DB] Failed to remove attachment directory for mail {}: {}",
                    id, e
                );
            }
        }
        Ok(())
    }

    /// Clear all mails from the database (useful for re-syncing)
    pub fn clear_all_mails(&self) -> SqliteResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM mail_attachments", [])?;
        conn.execute("DELETE FROM mails", [])?;
        drop(conn);

        if let Err(e) = fs::remove_dir_all(&self.attachments_root) {
            if e.kind() != std::io::ErrorKind::NotFound {
                eprintln!("[DB] Failed to clear attachment storage: {}", e);
            }
        }
        if let Err(e) = fs::create_dir_all(&self.attachments_root) {
            eprintln!("[DB] Failed to recreate attachment storage directory: {}", e);
        }
        Ok(())
    }

    /// Get the size of the database file in bytes
    pub fn get_database_size(&self) -> SqliteResult<u64> {
        let conn = self.conn.lock().unwrap();
        let path_opt = conn.path();
        let path_str = path_opt.ok_or_else(|| rusqlite::Error::InvalidPath(PathBuf::from("Database path not available")))?;
        let path = PathBuf::from(path_str);
        drop(conn);

        let metadata = fs::metadata(&path)
            .map_err(|e| rusqlite::Error::InvalidPath(PathBuf::from(format!("Failed to get database size: {}", e))))?;
        Ok(metadata.len())
    }

    /// Compact the database by running VACUUM
    pub fn compact_database(&self) -> SqliteResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("VACUUM", [])?;
        Ok(())
    }

    /// Mark a mail as read or unread
    pub fn mark_mail_read(&self, id: &str, read: bool) -> SqliteResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE mails SET unread = ?1, is_read = ?2 WHERE id = ?3",
            params![if read { 0 } else { 1 }, if read { 1 } else { 0 }, id],
        )?;
        Ok(())
    }

    /// Move a mail to trash (or permanent delete if already in trash)
    pub fn move_to_trash(&self, id: &str, current_folder: &str) -> SqliteResult<()> {
        if current_folder == "trash" {
            // Permanent delete
            return self.delete_mail(id);
        } else {
            // Move to trash
            let conn = self.conn.lock().unwrap();
            conn.execute(
                "UPDATE mails SET folder = 'trash' WHERE id = ?1",
                params![id],
            )?;
        }
        Ok(())
    }

    /// Move a mail to archive folder
    pub fn archive_mail(&self, id: &str) -> SqliteResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE mails SET folder = 'archive' WHERE id = ?1",
            params![id],
        )?;
        Ok(())
    }

    /// Unarchive a mail (move back to inbox)
    pub fn unarchive_mail(&self, id: &str) -> SqliteResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE mails SET folder = 'inbox' WHERE id = ?1",
            params![id],
        )?;
        Ok(())
    }

    /// Toggle star status for a mail
    pub fn toggle_star(&self, id: &str, starred: bool) -> SqliteResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE mails SET starred = ?1 WHERE id = ?2",
            params![if starred { 1 } else { 0 }, id],
        )?;
        Ok(())
    }

    /// Get count of unread mails in a folder
    pub fn get_unread_count(
        &self,
        folder: &str,
        account_id: Option<&str>,
    ) -> SqliteResult<i64> {
        let conn = self.conn.lock().unwrap();
        match account_id {
            Some(account_id) => conn.query_row(
                "SELECT COUNT(*) FROM mails WHERE folder = ?1 AND unread = 1 AND account_id = ?2",
                params![folder, account_id],
                |row| row.get(0),
            ),
            None => conn.query_row(
                "SELECT COUNT(*) FROM mails WHERE folder = ?1 AND unread = 1",
                params![folder],
                |row| row.get(0),
            ),
        }
    }

    // ========== Notification Methods ==========

    /// Insert a notification record into the database
    #[allow(dead_code)]
    pub fn insert_notification(
        &self,
        account_id: i64,
        mail_id: Option<i64>,
        notification_type: &str,
        title: &str,
        body: &str,
        priority: i32,
        actions: Option<&str>,
    ) -> SqliteResult<i64> {
        let conn = self.conn.lock().unwrap();
        let now = chrono::Utc::now().timestamp_millis();

        conn.execute(
            "INSERT INTO notifications (account_id, mail_id, type, title, body, priority, actions, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![
                account_id,
                mail_id,
                notification_type,
                title,
                body,
                priority,
                actions,
                now,
            ],
        )?;

        Ok(conn.last_insert_rowid())
    }

    /// Get notification history, optionally filtered by account
    pub fn get_notifications(
        &self,
        account_id: Option<i64>,
        limit: i64,
    ) -> SqliteResult<Vec<NotificationRecord>> {
        let conn = self.conn.lock().unwrap();

        let notifications = if let Some(acc_id) = account_id {
            let mut stmt = conn.prepare(
                "SELECT id, account_id, mail_id, type, title, body, priority, actions, created_at, read_at
                 FROM notifications
                 WHERE account_id = ?1
                 ORDER BY created_at DESC
                 LIMIT ?2"
            )?;

            let iter = stmt.query_map(params![acc_id, limit], |row| {
                Ok(NotificationRecord {
                    id: row.get(0)?,
                    account_id: row.get(1)?,
                    mail_id: row.get(2)?,
                    notification_type: row.get(3)?,
                    title: row.get(4)?,
                    body: row.get(5)?,
                    priority: row.get(6)?,
                    actions: row.get(7)?,
                    created_at: row.get(8)?,
                    read_at: row.get(9)?,
                })
            })?;

            let mut result = Vec::new();
            for notif in iter {
                result.push(notif?);
            }
            result
        } else {
            let mut stmt = conn.prepare(
                "SELECT id, account_id, mail_id, type, title, body, priority, actions, created_at, read_at
                 FROM notifications
                 ORDER BY created_at DESC
                 LIMIT ?1"
            )?;

            let iter = stmt.query_map(params![limit], |row| {
                Ok(NotificationRecord {
                    id: row.get(0)?,
                    account_id: row.get(1)?,
                    mail_id: row.get(2)?,
                    notification_type: row.get(3)?,
                    title: row.get(4)?,
                    body: row.get(5)?,
                    priority: row.get(6)?,
                    actions: row.get(7)?,
                    created_at: row.get(8)?,
                    read_at: row.get(9)?,
                })
            })?;

            let mut result = Vec::new();
            for notif in iter {
                result.push(notif?);
            }
            result
        };

        Ok(notifications)
    }

    /// Mark a notification as read
    #[allow(dead_code)]
    pub fn mark_notification_read(&self, id: i64) -> SqliteResult<()> {
        let conn = self.conn.lock().unwrap();
        let now = chrono::Utc::now().timestamp_millis();

        conn.execute(
            "UPDATE notifications SET read_at = ?1 WHERE id = ?2",
            params![now, id],
        )?;

        Ok(())
    }

    /// Clean up old notifications (older than specified days)
    #[allow(dead_code)]
    pub fn cleanup_old_notifications(&self, days: i64) -> SqliteResult<usize> {
        let conn = self.conn.lock().unwrap();
        let cutoff = chrono::Utc::now() - chrono::Duration::days(days);

        let count = conn.execute(
            "DELETE FROM notifications WHERE created_at < ?1",
            params![cutoff.timestamp_millis()],
        )?;

        Ok(count)
    }
}

/// Parse a JSON string into a vector of EmailAddress
fn parse_json_addresses(json: Option<String>) -> Option<Vec<EmailAddress>> {
    json.and_then(|s| serde_json::from_str(&s).ok())
}

/// Serialize a vector of EmailAddress to a JSON string
fn serialize_addresses(addresses: &Option<Vec<EmailAddress>>) -> Option<String> {
    addresses
        .as_ref()
        .and_then(|addrs| serde_json::to_string(addrs).ok())
}

/// Sanitize a user-provided filename for local storage.
fn sanitize_filename(input: &str) -> String {
    let mut output = String::with_capacity(input.len());
    for ch in input.chars() {
        if ch.is_ascii_alphanumeric() || matches!(ch, '.' | '_' | '-') {
            output.push(ch);
        } else {
            output.push('_');
        }
    }
    let trimmed = output.trim_matches('_');
    if trimmed.is_empty() {
        "attachment.bin".to_string()
    } else {
        trimmed.to_string()
    }
}

/// Strip HTML tags from text, returning plain text only
/// Uses ammonia to safely remove HTML/CSS while preserving text content
fn strip_html(html: &str) -> String {
    // First remove style and script tags with their content
    let style_re = Regex::new(r"(?is)<style.*?>.*?</style>").unwrap();
    let script_re = Regex::new(r"(?is)<script.*?>.*?</script>").unwrap();

    let mut cleaned = html.to_string();
    cleaned = style_re.replace_all(&cleaned, "").to_string();
    cleaned = script_re.replace_all(&cleaned, "").to_string();

    // Configure ammonia to remove all HTML tags
    let clean = ammonia::Builder::default()
        .tags(HashSet::new()) // Remove all HTML tags
        .clean(&cleaned)
        .to_string();

    // Clean up extra whitespace that may result from HTML removal
    clean.split_whitespace().collect::<Vec<_>>().join(" ")
}

#[cfg(test)]
#[path = "../test/notification_history_tests.rs"]
mod notification_history_tests;
