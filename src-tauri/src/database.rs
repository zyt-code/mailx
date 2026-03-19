use rusqlite::{Connection, Result as SqliteResult, params};
use std::fs;
use std::sync::Mutex;
use std::collections::HashSet;
use tauri::AppHandle;
use tauri::Manager;
use regex::Regex;

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
    conn: Mutex<Connection>,
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
        fs::create_dir_all(&app_data_dir)
            .expect("Failed to create app data directory");

        let db_path = app_data_dir.join("mailx.db");
        let conn = Connection::open(db_path)?;
        conn.execute_batch("PRAGMA journal_mode=WAL")?;

        let db = Database { conn: Mutex::new(conn) };
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

        drop(conn); // Release lock before calling seed_initial_data

        // Run any schema migrations BEFORE seeding
        self.run_migrations()?;

        Ok(())
    }

    /// Run database schema migrations
    fn run_migrations(&self) -> SqliteResult<()> {
        let conn = self.conn.lock().unwrap();

        // Add to_json column if not exists
        conn.execute("ALTER TABLE mails ADD COLUMN to_json TEXT", []).ok();

        // Add cc_json column if not exists
        conn.execute("ALTER TABLE mails ADD COLUMN cc_json TEXT", []).ok();

        // Add bcc_json column if not exists
        conn.execute("ALTER TABLE mails ADD COLUMN bcc_json TEXT", []).ok();

        // Add account_id column if not exists
        conn.execute("ALTER TABLE mails ADD COLUMN account_id TEXT", []).ok();

        // Add uid column if not exists
        conn.execute("ALTER TABLE mails ADD COLUMN uid INTEGER", []).ok();

        // Add html_body column if not exists (Phase 1)
        conn.execute("ALTER TABLE mails ADD COLUMN html_body TEXT", []).ok();

        // Add reply_to_json column if not exists (Phase 1)
        conn.execute("ALTER TABLE mails ADD COLUMN reply_to_json TEXT", []).ok();

        // Add starred column if not exists (Phase 1)
        conn.execute("ALTER TABLE mails ADD COLUMN starred INTEGER DEFAULT 0", []).ok();

        // Add has_attachments column if not exists (Phase 1)
        conn.execute("ALTER TABLE mails ADD COLUMN has_attachments INTEGER DEFAULT 0", []).ok();

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

        // Create index for account-based mail queries
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_mails_account ON mails(account_id, folder)",
            [],
        )?;

        Ok(())
    }


    /// Get all mails, optionally filtered by folder and account
    pub fn get_mails(&self, folder: Option<String>, account_id: Option<String>) -> SqliteResult<Vec<Mail>> {
        let conn = self.conn.lock().unwrap();

        let mut query = "SELECT id, uid, from_name, from_email, subject, preview, body, timestamp, folder, unread, account_id, to_json, cc_json, bcc_json, html_body, reply_to_json, starred, has_attachments FROM mails".to_string();
        let mut params: Vec<&dyn rusqlite::ToSql> = Vec::new();
        let mut conditions = Vec::new();

        // Build WHERE clause based on provided filters
        if let Some(folder) = &folder {
            conditions.push("folder = ?");
            params.push(folder);
        }
        if let Some(account_id) = &account_id {
            conditions.push("account_id = ?");
            params.push(account_id);
        }

        if !conditions.is_empty() {
            query.push_str(" WHERE ");
            query.push_str(&conditions.join(" AND "));
        }
        query.push_str(" ORDER BY timestamp DESC");

        let mut stmt = conn.prepare(&query)?;
        let mail_iter = stmt.query_map(rusqlite::params_from_iter(params), |row| {
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
                unread: row.get::<_, i32>(9)? == 1,
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

    /// Get a single mail by ID
    pub fn get_mail(&self, id: &str) -> SqliteResult<Option<Mail>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, uid, from_name, from_email, subject, preview, body, timestamp, folder, unread, account_id, to_json, cc_json, bcc_json, html_body, reply_to_json, starred, has_attachments
             FROM mails WHERE id = ?1"
        )?;

        let mail = stmt.query_row(params![id], |row| {
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
                unread: row.get::<_, i32>(9)? == 1,
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
                if mail.unread { 1 } else { 0 },
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
                if mail.unread { 1 } else { 0 },
                &mail.account_id,
                to_json,
                cc_json,
                bcc_json,
                &mail.html_body,
                reply_to_json,
                if mail.starred.unwrap_or(false) { 1 } else { 0 },
                if mail.has_attachments.unwrap_or(false) { 1 } else { 0 },
                &mail.id,
            ],
        )?;
        Ok(())
    }

    /// Delete a mail by ID
    pub fn delete_mail(&self, id: &str) -> SqliteResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM mails WHERE id = ?1", params![id])?;
        Ok(())
    }

    /// Clear all mails from the database (useful for re-syncing)
    pub fn clear_all_mails(&self) -> SqliteResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM mails", [])?;
        Ok(())
    }

    /// Mark a mail as read or unread
    pub fn mark_mail_read(&self, id: &str, read: bool) -> SqliteResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE mails SET unread = ?1 WHERE id = ?2",
            params![if read { 0 } else { 1 }, id],
        )?;
        Ok(())
    }

    /// Move a mail to trash (or permanent delete if already in trash)
    pub fn move_to_trash(&self, id: &str, current_folder: &str) -> SqliteResult<()> {
        let conn = self.conn.lock().unwrap();
        if current_folder == "trash" {
            // Permanent delete
            conn.execute("DELETE FROM mails WHERE id = ?1", params![id])?;
        } else {
            // Move to trash
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
    pub fn get_unread_count(&self, folder: &str) -> SqliteResult<i64> {
        let conn = self.conn.lock().unwrap();
        conn.query_row(
            "SELECT COUNT(*) FROM mails WHERE folder = ?1 AND unread = 1",
            params![folder],
            |row| row.get(0),
        )
    }
}

/// Parse a JSON string into a vector of EmailAddress
fn parse_json_addresses(json: Option<String>) -> Option<Vec<EmailAddress>> {
    json.and_then(|s| serde_json::from_str(&s).ok())
}

/// Serialize a vector of EmailAddress to a JSON string
fn serialize_addresses(addresses: &Option<Vec<EmailAddress>>) -> Option<String> {
    addresses.as_ref().and_then(|addrs| serde_json::to_string(addrs).ok())
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
