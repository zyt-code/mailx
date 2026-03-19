use rusqlite::{Connection, Result as SqliteResult, params};
use std::sync::Mutex;
use thiserror::Error;

/// Account configuration for email providers
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct Account {
    pub id: String,
    pub email: String,
    pub name: String,
    pub imap_server: String,
    pub imap_port: u16,
    pub imap_use_ssl: bool,
    pub smtp_server: String,
    pub smtp_port: u16,
    pub smtp_use_ssl: bool,
    pub is_active: bool,
    pub created_at: i64,
    pub updated_at: i64,
}

/// IMAP configuration for connecting to email servers
#[derive(Debug, Clone)]
pub struct ImapConfig {
    pub server: String,
    pub port: u16,
    pub use_ssl: bool,
}

/// SMTP configuration for sending emails
#[derive(Debug, Clone)]
pub struct SmtpConfig {
    pub server: String,
    pub port: u16,
    pub use_ssl: bool,
}

/// Account management errors
#[derive(Debug, Error)]
pub enum AccountError {
    #[error("Database error: {0}")]
    Database(#[from] rusqlite::Error),

    #[error("Account not found: {0}")]
    NotFound(String),

    #[error("Invalid email format: {0}")]
    InvalidEmail(String),

    #[error("Email already exists: {0}")]
    EmailExists(String),

    #[error("Credential error: {0}")]
    Credential(String),

    #[error("Validation error: {0}")]
    Validation(String),
}

/// Result type for account operations
pub type Result<T> = std::result::Result<T, AccountError>;

/// Account manager for CRUD operations
pub struct AccountManager {
    conn: Mutex<Connection>,
}

unsafe impl Send for AccountManager {}
unsafe impl Sync for AccountManager {}

impl AccountManager {
    /// Create a new account manager with database connection
    pub fn new(conn: Connection) -> Self {
        Self { conn: Mutex::new(conn) }
    }

    /// Get all accounts from the database
    pub fn get_all(&self) -> Result<Vec<Account>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, email, name, imap_server, imap_port, imap_use_ssl,
                     smtp_server, smtp_port, smtp_use_ssl, is_active, created_at, updated_at
             FROM accounts ORDER BY created_at DESC"
        )?;

        let accounts = stmt.query_map([], |row| {
            Ok(Account {
                id: row.get(0)?,
                email: row.get(1)?,
                name: row.get(2)?,
                imap_server: row.get(3)?,
                imap_port: row.get(4)?,
                imap_use_ssl: row.get::<_, i32>(5)? == 1,
                smtp_server: row.get(6)?,
                smtp_port: row.get(7)?,
                smtp_use_ssl: row.get::<_, i32>(8)? == 1,
                is_active: row.get::<_, i32>(9)? == 1,
                created_at: row.get(10)?,
                updated_at: row.get(11)?,
            })
        })?
        .collect::<SqliteResult<Vec<_>>>()?;

        Ok(accounts)
    }

    /// Get a single account by ID
    pub fn get(&self, id: &str) -> Result<Account> {
        let conn = self.conn.lock().unwrap();
        let account = conn.query_row(
            "SELECT id, email, name, imap_server, imap_port, imap_use_ssl,
                     smtp_server, smtp_port, smtp_use_ssl, is_active, created_at, updated_at
             FROM accounts WHERE id = ?1",
            params![id],
            |row| {
                Ok(Account {
                    id: row.get(0)?,
                    email: row.get(1)?,
                    name: row.get(2)?,
                    imap_server: row.get(3)?,
                    imap_port: row.get(4)?,
                    imap_use_ssl: row.get::<_, i32>(5)? == 1,
                    smtp_server: row.get(6)?,
                    smtp_port: row.get(7)?,
                    smtp_use_ssl: row.get::<_, i32>(8)? == 1,
                    is_active: row.get::<_, i32>(9)? == 1,
                    created_at: row.get(10)?,
                    updated_at: row.get(11)?,
                })
            },
        );

        match account {
            Ok(acc) => Ok(acc),
            Err(rusqlite::Error::QueryReturnedNoRows) => Err(AccountError::NotFound(id.to_string())),
            Err(e) => Err(AccountError::Database(e)),
        }
    }

    /// Get an account by email address
    pub fn get_by_email(&self, email: &str) -> Result<Account> {
        let conn = self.conn.lock().unwrap();
        let account = conn.query_row(
            "SELECT id, email, name, imap_server, imap_port, imap_use_ssl,
                     smtp_server, smtp_port, smtp_use_ssl, is_active, created_at, updated_at
             FROM accounts WHERE email = ?1",
            params![email],
            |row| {
                Ok(Account {
                    id: row.get(0)?,
                    email: row.get(1)?,
                    name: row.get(2)?,
                    imap_server: row.get(3)?,
                    imap_port: row.get(4)?,
                    imap_use_ssl: row.get::<_, i32>(5)? == 1,
                    smtp_server: row.get(6)?,
                    smtp_port: row.get(7)?,
                    smtp_use_ssl: row.get::<_, i32>(8)? == 1,
                    is_active: row.get::<_, i32>(9)? == 1,
                    created_at: row.get(10)?,
                    updated_at: row.get(11)?,
                })
            },
        );

        match account {
            Ok(acc) => Ok(acc),
            Err(rusqlite::Error::QueryReturnedNoRows) => Err(AccountError::NotFound(email.to_string())),
            Err(e) => Err(AccountError::Database(e)),
        }
    }

    /// Get all active accounts
    pub fn get_active(&self) -> Result<Vec<Account>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, email, name, imap_server, imap_port, imap_use_ssl,
                     smtp_server, smtp_port, smtp_use_ssl, is_active, created_at, updated_at
             FROM accounts WHERE is_active = 1 ORDER BY created_at DESC"
        )?;

        let accounts = stmt.query_map([], |row| {
            Ok(Account {
                id: row.get(0)?,
                email: row.get(1)?,
                name: row.get(2)?,
                imap_server: row.get(3)?,
                imap_port: row.get(4)?,
                imap_use_ssl: row.get::<_, i32>(5)? == 1,
                smtp_server: row.get(6)?,
                smtp_port: row.get(7)?,
                smtp_use_ssl: row.get::<_, i32>(8)? == 1,
                is_active: row.get::<_, i32>(9)? == 1,
                created_at: row.get(10)?,
                updated_at: row.get(11)?,
            })
        })?
        .collect::<SqliteResult<Vec<_>>>()?;

        Ok(accounts)
    }

    /// Create a new account
    pub fn create(&self, account: &Account) -> Result<()> {
        // Validate email format
        Self::validate_email(&account.email)?;

        let conn = self.conn.lock().unwrap();

        // Check if email already exists
        let exists: bool = conn.query_row(
            "SELECT COUNT(*) > 0 FROM accounts WHERE email = ?1",
            params![&account.email],
            |row| row.get(0),
        )?;

        if exists {
            return Err(AccountError::EmailExists(account.email.clone()));
        }

        // Insert the account
        conn.execute(
            "INSERT INTO accounts (id, email, name, imap_server, imap_port, imap_use_ssl,
                                  smtp_server, smtp_port, smtp_use_ssl, is_active, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
            params![
                &account.id,
                &account.email,
                &account.name,
                &account.imap_server,
                account.imap_port,
                if account.imap_use_ssl { 1 } else { 0 },
                &account.smtp_server,
                account.smtp_port,
                if account.smtp_use_ssl { 1 } else { 0 },
                if account.is_active { 1 } else { 0 },
                account.created_at,
                account.updated_at,
            ],
        )?;

        Ok(())
    }

    /// Update an existing account
    pub fn update(&self, account: &Account) -> Result<()> {
        // Validate email format
        Self::validate_email(&account.email)?;

        let conn = self.conn.lock().unwrap();

        // Check if email exists for another account
        let email_exists: bool = conn.query_row(
            "SELECT COUNT(*) > 0 FROM accounts WHERE email = ?1 AND id != ?2",
            params![&account.email, &account.id],
            |row| row.get(0),
        )?;

        if email_exists {
            return Err(AccountError::EmailExists(account.email.clone()));
        }

        // Update the account
        let rows_affected = conn.execute(
            "UPDATE accounts SET
             email = ?1, name = ?2, imap_server = ?3, imap_port = ?4, imap_use_ssl = ?5,
             smtp_server = ?6, smtp_port = ?7, smtp_use_ssl = ?8, is_active = ?9, updated_at = ?10
             WHERE id = ?11",
            params![
                &account.email,
                &account.name,
                &account.imap_server,
                account.imap_port,
                if account.imap_use_ssl { 1 } else { 0 },
                &account.smtp_server,
                account.smtp_port,
                if account.smtp_use_ssl { 1 } else { 0 },
                if account.is_active { 1 } else { 0 },
                account.updated_at,
                &account.id,
            ],
        )?;

        if rows_affected == 0 {
            return Err(AccountError::NotFound(account.id.clone()));
        }

        Ok(())
    }

    /// Delete an account by ID
    pub fn delete(&self, id: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let rows_affected = conn.execute("DELETE FROM accounts WHERE id = ?1", params![id])?;

        if rows_affected == 0 {
            return Err(AccountError::NotFound(id.to_string()));
        }

        Ok(())
    }

    /// Validate email format
    fn validate_email(email: &str) -> Result<()> {
        if email.is_empty() {
            return Err(AccountError::InvalidEmail("Email is empty".to_string()));
        }

        // Basic email validation
        if !email.contains('@') || !email.contains('.') {
            return Err(AccountError::InvalidEmail(format!("Invalid email format: {}", email)));
        }

        // Check for basic structure: local@domain.tld
        let parts: Vec<&str> = email.split('@').collect();
        if parts.len() != 2 {
            return Err(AccountError::InvalidEmail(format!("Invalid email format: {}", email)));
        }

        let local = parts[0];
        let domain = parts[1];

        if local.is_empty() || domain.is_empty() || !domain.contains('.') {
            return Err(AccountError::InvalidEmail(format!("Invalid email format: {}", email)));
        }

        Ok(())
    }

    /// Get IMAP configuration for an account
    pub fn get_imap_config(&self, account_id: &str) -> Result<ImapConfig> {
        let account = self.get(account_id)?;
        Ok(ImapConfig {
            server: account.imap_server,
            port: account.imap_port,
            use_ssl: account.imap_use_ssl,
        })
    }

    /// Get SMTP configuration for an account
    pub fn get_smtp_config(&self, account_id: &str) -> Result<SmtpConfig> {
        let account = self.get(account_id)?;
        Ok(SmtpConfig {
            server: account.smtp_server,
            port: account.smtp_port,
            use_ssl: account.smtp_use_ssl,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_email() {
        assert!(AccountManager::validate_email("test@example.com").is_ok());
        assert!(AccountManager::validate_email("user.name+tag@domain.co.uk").is_ok());
        assert!(AccountManager::validate_email("").is_err());
        assert!(AccountManager::validate_email("invalid").is_err());
        assert!(AccountManager::validate_email("@example.com").is_err());
        assert!(AccountManager::validate_email("test@").is_err());
    }
}
