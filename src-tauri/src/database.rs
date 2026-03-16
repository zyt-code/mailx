use rusqlite::{Connection, Result as SqliteResult, params};
use std::fs;
use std::sync::Mutex;
use tauri::AppHandle;
use tauri::Manager;

/// Email address structure for recipients
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct EmailAddress {
    pub name: String,
    pub email: String,
}

/// Mail structure matching frontend types
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct Mail {
    pub id: String,
    pub from_name: String,
    pub from_email: String,
    pub subject: String,
    pub preview: String,
    pub body: String,
    pub timestamp: i64,
    pub folder: String,
    pub unread: bool,
    #[serde(default)]
    pub to: Option<Vec<EmailAddress>>,
    #[serde(default)]
    pub cc: Option<Vec<EmailAddress>>,
    #[serde(default)]
    pub bcc: Option<Vec<EmailAddress>>,
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

        // Seed initial data if database is empty
        drop(conn); // Release lock before calling seed_initial_data
        self.seed_initial_data()?;

        // Run any schema migrations
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

    /// Seed initial test data if the database is empty
    fn seed_initial_data(&self) -> SqliteResult<()> {
        let conn = self.conn.lock().unwrap();

        // Check if database is empty
        let count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM mails",
            [],
            |row| row.get(0)
        ).unwrap_or(0);

        if count > 0 {
            return Ok(()); // Database already has data
        }

        drop(conn); // Release lock before calling insert_mail

        let now = chrono::Utc::now().timestamp_millis();
        let one_day = 24 * 60 * 60 * 1000;
        let two_days = one_day * 2;
        let four_days = one_day * 4;

        let seed_mails = vec![
            Mail {
                id: "1".to_string(),
                from_name: "Alice Chen".to_string(),
                from_email: "alice.chen@example.com".to_string(),
                subject: "Project update for Q1".to_string(),
                preview: "Hi team, here is the latest update on our Q1 goals...".to_string(),
                body: "Hi team,\n\nHere is the latest update on our Q1 goals. We have completed 80% of the planned features and are on track to deliver by the end of March.\n\nKey highlights:\n- Authentication module is complete\n- Dashboard redesign is in review\n- API performance improved by 40%\n\nPlease review the attached report and let me know if you have any questions.\n\nBest,\nAlice".to_string(),
                timestamp: now - (4 * 60 * 60 * 1000), // 4 hours ago
                folder: "inbox".to_string(),
                unread: true,
                to: None,
                cc: None,
                bcc: None,
            },
            Mail {
                id: "2".to_string(),
                from_name: "Bob Smith".to_string(),
                from_email: "bob.smith@example.com".to_string(),
                subject: "Meeting notes".to_string(),
                preview: "Attached are the meeting notes from yesterday's standup...".to_string(),
                body: "Hi everyone,\n\nAttached are the meeting notes from yesterday's standup. Here's a quick summary:\n\n1. Sprint progress is at 65%\n2. Two blockers identified — need design review for the new sidebar and API endpoint for mail sync\n3. Next demo is scheduled for Friday\n\nAction items:\n- Alice: Finalize Q1 report\n- Carol: Update mockups\n- David: Send invoices\n\nThanks,\nBob".to_string(),
                timestamp: now - (5 * 60 * 60 * 1000), // 5 hours ago
                folder: "inbox".to_string(),
                unread: true,
                to: None,
                cc: None,
                bcc: None,
            },
            Mail {
                id: "3".to_string(),
                from_name: "Carol Wang".to_string(),
                from_email: "carol.wang@example.com".to_string(),
                subject: "Design review feedback".to_string(),
                preview: "Great work on the mockups! I have a few suggestions...".to_string(),
                body: "Great work on the mockups! I have a few suggestions:\n\n1. The sidebar could use more contrast between active and inactive states\n2. Consider adding a subtle animation for the panel resize\n3. The mobile layout should stack vertically rather than hiding the mail list\n\nOverall the direction looks fantastic. Let me know when you have an updated version and I will do another pass.\n\nCheers,\nCarol".to_string(),
                timestamp: now - one_day,
                folder: "inbox".to_string(),
                unread: false,
                to: None,
                cc: None,
                bcc: None,
            },
            Mail {
                id: "4".to_string(),
                from_name: "David Lee".to_string(),
                from_email: "david.lee@example.com".to_string(),
                subject: "Invoice #1234".to_string(),
                preview: "Please find the invoice for March attached...".to_string(),
                body: "Hi,\n\nPlease find the invoice for March attached. The total amount is $4,500 for the consulting services provided.\n\nPayment terms: Net 30\nDue date: April 15, 2026\n\nLet me know if you need any adjustments.\n\nRegards,\nDavid Lee".to_string(),
                timestamp: now - two_days,
                folder: "inbox".to_string(),
                unread: false,
                to: None,
                cc: None,
                bcc: None,
            },
            Mail {
                id: "5".to_string(),
                from_name: "Eve Johnson".to_string(),
                from_email: "eve.johnson@example.com".to_string(),
                subject: "Welcome to the team!".to_string(),
                preview: "We are thrilled to have you join us. Here is what...".to_string(),
                body: "Welcome to the team!\n\nWe are thrilled to have you join us. Here is what you need to get started:\n\n1. Set up your development environment using the README\n2. Join our Slack channels: #general, #engineering, #random\n3. Schedule a 1:1 with your manager\n4. Complete the onboarding checklist in Notion\n\nIf you have any questions, do not hesitate to reach out. We are here to help!\n\nBest,\nEve".to_string(),
                timestamp: now - four_days,
                folder: "inbox".to_string(),
                unread: false,
                to: None,
                cc: None,
                bcc: None,
            },
            Mail {
                id: "6".to_string(),
                from_name: "Me".to_string(),
                from_email: "me@example.com".to_string(),
                subject: "Re: Project update for Q1".to_string(),
                preview: "Thanks for the update, Alice. Looks great!".to_string(),
                body: "Thanks for the update, Alice. Looks great!\n\nI reviewed the report and everything is on track. Let us schedule a quick sync on Wednesday to discuss the remaining 20%.\n\nBest regards".to_string(),
                timestamp: now - (3 * 60 * 60 * 1000), // 3 hours ago
                folder: "sent".to_string(),
                unread: false,
                to: Some(vec![EmailAddress {
                    name: "Alice Chen".to_string(),
                    email: "alice.chen@example.com".to_string(),
                }]),
                cc: None,
                bcc: None,
            },
            Mail {
                id: "7".to_string(),
                from_name: "Me".to_string(),
                from_email: "me@example.com".to_string(),
                subject: "Draft: Team offsite planning".to_string(),
                preview: "Ideas for the upcoming team offsite in April...".to_string(),
                body: "Ideas for the upcoming team offsite in April:\n\n- Location: Mountain retreat or coastal venue\n- Duration: 2-3 days\n- Activities: Team building, strategy planning, hackathon\n- Budget: TBD\n\nNeed to finalize by end of month.".to_string(),
                timestamp: now - (6 * 24 * 60 * 60 * 1000), // 6 days ago
                folder: "drafts".to_string(),
                unread: false,
                to: Some(vec![
                    EmailAddress {
                        name: "Bob Smith".to_string(),
                        email: "bob.smith@example.com".to_string(),
                    },
                    EmailAddress {
                        name: "Carol Wang".to_string(),
                        email: "carol.wang@example.com".to_string(),
                    },
                ]),
                cc: None,
                bcc: None,
            },
        ];

        for mail in seed_mails {
            self.insert_mail(&mail)?;
        }

        Ok(())
    }

    /// Get all mails, optionally filtered by folder
    pub fn get_mails(&self, folder: Option<String>) -> SqliteResult<Vec<Mail>> {
        let conn = self.conn.lock().unwrap();

        let mut query = "SELECT id, from_name, from_email, subject, preview, body, timestamp, folder, unread, to_json, cc_json, bcc_json FROM mails".to_string();
        let mut mails: Vec<Mail> = Vec::new();

        if let Some(folder) = folder {
            query.push_str(" WHERE folder = ?1 ORDER BY timestamp DESC");
            let mut stmt = conn.prepare(&query)?;
            let mail_iter = stmt.query_map(params![&folder], |row| {
                Ok(Mail {
                    id: row.get(0)?,
                    from_name: row.get(1)?,
                    from_email: row.get(2)?,
                    subject: row.get(3)?,
                    preview: row.get(4)?,
                    body: row.get(5)?,
                    timestamp: row.get(6)?,
                    folder: row.get(7)?,
                    unread: row.get::<_, i32>(8)? == 1,
                    to: parse_json_addresses(row.get(9)?),
                    cc: parse_json_addresses(row.get(10)?),
                    bcc: parse_json_addresses(row.get(11)?),
                })
            })?;
            for mail in mail_iter {
                mails.push(mail?);
            }
        } else {
            query.push_str(" ORDER BY timestamp DESC");
            let mut stmt = conn.prepare(&query)?;
            let mail_iter = stmt.query_map([], |row| {
                Ok(Mail {
                    id: row.get(0)?,
                    from_name: row.get(1)?,
                    from_email: row.get(2)?,
                    subject: row.get(3)?,
                    preview: row.get(4)?,
                    body: row.get(5)?,
                    timestamp: row.get(6)?,
                    folder: row.get(7)?,
                    unread: row.get::<_, i32>(8)? == 1,
                    to: parse_json_addresses(row.get(9)?),
                    cc: parse_json_addresses(row.get(10)?),
                    bcc: parse_json_addresses(row.get(11)?),
                })
            })?;
            for mail in mail_iter {
                mails.push(mail?);
            }
        }

        Ok(mails)
    }

    /// Get a single mail by ID
    pub fn get_mail(&self, id: &str) -> SqliteResult<Option<Mail>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, from_name, from_email, subject, preview, body, timestamp, folder, unread, to_json, cc_json, bcc_json
             FROM mails WHERE id = ?1"
        )?;

        let mail = stmt.query_row(params![id], |row| {
            Ok(Mail {
                id: row.get(0)?,
                from_name: row.get(1)?,
                from_email: row.get(2)?,
                subject: row.get(3)?,
                preview: row.get(4)?,
                body: row.get(5)?,
                timestamp: row.get(6)?,
                folder: row.get(7)?,
                unread: row.get::<_, i32>(8)? == 1,
                to: parse_json_addresses(row.get(9)?),
                cc: parse_json_addresses(row.get(10)?),
                bcc: parse_json_addresses(row.get(11)?),
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
        conn.execute(
            "INSERT INTO mails (id, from_name, from_email, subject, preview, body, timestamp, folder, unread, created_at, to_json, cc_json, bcc_json)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
            params![
                &mail.id,
                &mail.from_name,
                &mail.from_email,
                &mail.subject,
                &mail.preview,
                &mail.body,
                &mail.timestamp,
                &mail.folder,
                if mail.unread { 1 } else { 0 },
                now,
                to_json,
                cc_json,
                bcc_json,
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
        conn.execute(
            "UPDATE mails SET
             from_name = ?1,
             from_email = ?2,
             subject = ?3,
             preview = ?4,
             body = ?5,
             timestamp = ?6,
             folder = ?7,
             unread = ?8,
             to_json = ?9,
             cc_json = ?10,
             bcc_json = ?11
             WHERE id = ?12",
            params![
                &mail.from_name,
                &mail.from_email,
                &mail.subject,
                &mail.preview,
                &mail.body,
                &mail.timestamp,
                &mail.folder,
                if mail.unread { 1 } else { 0 },
                to_json,
                cc_json,
                bcc_json,
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
}

/// Parse a JSON string into a vector of EmailAddress
fn parse_json_addresses(json: Option<String>) -> Option<Vec<EmailAddress>> {
    json.and_then(|s| serde_json::from_str(&s).ok())
}

/// Serialize a vector of EmailAddress to a JSON string
fn serialize_addresses(addresses: &Option<Vec<EmailAddress>>) -> Option<String> {
    addresses.as_ref().and_then(|addrs| serde_json::to_string(addrs).ok())
}
