use crate::accounts::ImapConfig;
use crate::database::{EmailAddress, Mail};
use mail_parser::Message;
use thiserror::Error;

/// IMAP client errors
#[derive(Debug, Error)]
pub enum ImapError {
    #[error("Connection failed: {0}")]
    ConnectionFailed(String),

    #[error("Authentication failed: {0}")]
    AuthenticationFailed(String),

    #[error("Fetch failed: {0}")]
    FetchFailed(String),

    #[error("Parse error: {0}")]
    ParseError(String),

    #[error("Invalid credentials")]
    InvalidCredentials,

    #[error("Network error: {0}")]
    Network(String),

    #[error("Timeout")]
    Timeout,

    #[error("Not connected")]
    NotConnected,

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("TLS error: {0}")]
    Tls(String),

    #[error("Protocol error: {0}")]
    Protocol(String),

    #[error("UTF-8 error: {0}")]
    Utf8(#[from] std::string::FromUtf8Error),
}

/// Result type for IMAP operations
pub type Result<T> = std::result::Result<T, ImapError>;

/// IMAP client for email fetching
pub struct ImapClient {
    config: ImapConfig,
    email: String,
    password: String,
}

impl ImapClient {
    /// Create a new IMAP client
    pub fn new(config: ImapConfig, email: String, password: String) -> Self {
        Self {
            config,
            email,
            password,
        }
    }

    /// Connect to the IMAP server and test authentication
    pub async fn test_connection(&self) -> Result<()> {
        use imap::{Client as ImapClient, types::Fetch};
        use native_tls::TlsConnector;

        let addr = format!("{}:{}", self.config.server, self.config.port);

        // Create TLS connector
        let tls = TlsConnector::builder()
            .build()
            .map_err(|e| ImapError::Tls(format!("Failed to create TLS connector: {}", e)))?;

        // Connect to the server
        let client = tokio::task::spawn_blocking({
            let addr = addr.clone();
            move || {
                ImapClient::builder()
                    .addr(&addr)
                    .connect(tls)
            }
        })
        .await
        .map_err(|e| ImapError::ConnectionFailed(format!("Connection task failed: {}", e)))?
        .map_err(|e| ImapError::ConnectionFailed(format!("Failed to connect to {}: {}", addr, e)))?;

        // Login
        let mut client = client
            .login(&self.email, &self.password)
            .map_err(|e| match e {
                imap::error::Error::Login { .. } => ImapError::InvalidCredentials,
                _ => ImapError::AuthenticationFailed(format!("Login failed: {}", e)),
            })?;

        // Try to select INBOX
        client
            .select("INBOX")
            .map_err(|e| ImapError::Protocol(format!("Failed to select INBOX: {}", e)))?;

        // Logout
        client
            .logout()
            .map_err(|e| ImapError::Protocol(format!("Logout failed: {}", e)))?;

        Ok(())
    }

    /// Fetch emails from a folder since a specific UID
    pub async fn fetch_emails(&self, folder: &str, limit: usize) -> Result<Vec<Mail>> {
        use imap::types::{Fetch, Flag};

        let mails = tokio::task::spawn_blocking({
            let config = self.config.clone();
            let email = self.email.clone();
            let password = self.password.clone();
            let folder = folder.to_string();
            move || {
                Self::fetch_emails_blocking(config, email, password, &folder, limit)
            }
        })
        .await
        .map_err(|e| ImapError::FetchFailed(format!("Fetch task failed: {}", e)))??;

        Ok(mails)
    }

    /// Fetch emails using blocking IMAP
    fn fetch_emails_blocking(
        config: ImapConfig,
        email: String,
        password: String,
        folder: &str,
        limit: usize,
    ) -> Result<Vec<Mail>> {
        use imap::types::{Fetch, Flag};

        let addr = format!("{}:{}", config.server, config.port);

        // Create TLS connector
        let tls = TlsConnector::builder()
            .build()
            .map_err(|e| ImapError::Tls(format!("Failed to create TLS connector: {}", e)))?;

        // Connect to the server
        let client = imap::Client::builder()
            .addr(&addr)
            .connect(tls)
            .map_err(|e| ImapError::ConnectionFailed(format!("Failed to connect: {}", e)))?;

        // Login
        let mut client = client
            .login(&email, &password)
            .map_err(|e| match e {
                imap::error::Error::Login { .. } => ImapError::InvalidCredentials,
                _ => ImapError::AuthenticationFailed(format!("Login failed: {}", e)),
            })?;

        // Select folder
        let mailbox = client
            .select(folder)
            .map_err(|e| ImapError::Protocol(format!("Failed to select folder '{}': {}", folder, e)))?;

        // Get recent emails
        let max_uid = mailbox.uid_next.unwrap_or(0);
        let start_uid = max_uid.saturating_sub(limit as u32);
        let uid_range = if start_uid == 0 {
            format!("1:*")
        } else {
            format!("{}:*", start_uid)
        };

        // Fetch the emails
        let fetch_results = client
            .uid_fetch(format!("{}", uid_range), "(RFC822 UID FLAGS)")
            .map_err(|e| ImapError::FetchFailed(format!("Fetch failed: {}", e)))?;

        let mut mails = Vec::new();
        for fetch in fetch_results {
            if let Ok(mail) = Self::parse_fetch_response(&fetch, folder) {
                mails.push(mail);
            }
        }

        // Logout
        client
            .logout()
            .map_err(|e| ImapError::Protocol(format!("Logout failed: {}", e)))?;

        Ok(mails)
    }

    /// Parse a fetch response into a Mail structure
    fn parse_fetch_response(fetch: &imap::types::Fetch, folder: &str) -> Result<Mail> {
        use imap::types::Flag;

        // Get the UID
        let uid = fetch.uid.ok_or_else(|| {
            ImapError::ParseError("No UID in fetch response".to_string())
        })?;

        // Get the email body
        let body = fetch.body().ok_or_else(|| {
            ImapError::ParseError("No body in fetch response".to_string())
        })?;

        // Parse the email using mail-parser
        let message = Message::parse(body)
            .ok_or_else(|| ImapError::ParseError("Failed to parse email".to_string()))?;

        // Extract headers
        let from = message.from().and_then(|f| f.first()).ok_or_else(|| {
            ImapError::ParseError("No from address".to_string())
        })?;

        let from_name = from.name().unwrap_or("").to_string();
        let from_email = from.address().to_string();

        let subject = message.subject().unwrap_or("").to_string();
        let body_text = Self::extract_body_text(&message);
        let preview = Self::create_preview(&body_text);

        // Get flags for read/unread status
        let is_seen = fetch.flags.contains(&Flag::Seen);

        // Generate unique ID
        let id = Self::generate_id(&from_email, uid);

        // Get timestamp
        let timestamp = message
            .date()
            .and_then(|d| {
                chrono::DateTime::parse_from_rfc2822(d)
                    .ok()
                    .map(|dt| dt.timestamp_millis())
            })
            .unwrap_or_else(|| chrono::Utc::now().timestamp_millis());

        Ok(Mail {
            id,
            from_name,
            from_email,
            subject,
            preview,
            body: body_text,
            timestamp,
            folder: folder.to_string(),
            unread: !is_seen,
            to: Self::parse_address_list(message.to()),
            cc: Self::parse_address_list(message.cc()),
            bcc: Self::parse_address_list(message.bcc()),
        })
    }

    /// Extract plain text body from an email
    fn extract_body_text(message: &Message) -> String {
        // Try to get plain text part first
        if let Some(text) = message.text_body(0) {
            return text.to_string();
        }

        // Fall back to HTML body (stripped)
        if let Some(html) = message.html_body(0) {
            return Self::strip_html(html);
        }

        // Fall back to raw body
        message
            .body()
            .map(|b| String::from_utf8_lossy(b).to_string())
            .unwrap_or_else(|| "".to_string())
    }

    /// Create a preview snippet from the body text
    fn create_preview(body: &str) -> String {
        let lines: Vec<&str> = body.lines().collect();
        let preview = lines
            .into_iter()
            .take(3)
            .collect::<Vec<_>>()
            .join(" ")
            .chars()
            .take(100)
            .collect::<String>();

        if preview.len() >= 100 {
            format!("{}...", preview)
        } else {
            preview
        }
    }

    /// Strip HTML tags from a string
    fn strip_html(html: &str) -> String {
        // Simple HTML tag removal
        let mut result = String::new();
        let mut in_tag = false;

        for ch in html.chars() {
            match ch {
                '<' => in_tag = true,
                '>' => in_tag = false,
                _ if !in_tag => result.push(ch),
                _ => {}
            }
        }

        // Decode common HTML entities
        result = result.replace("&nbsp;", " ");
        result = result.replace("&lt;", "<");
        result = result.replace("&gt;", ">");
        result = result.replace("&amp;", "&");
        result = result.replace("&quot;", "\"");
        result = result.replace("&#39;", "'");

        result
    }

    /// Parse an address list from the email message
    fn parse_address_list(addresses: Option<&[mail_parser::Address]>) -> Option<Vec<EmailAddress>> {
        addresses.map(|addrs| {
            addrs
                .iter()
                .filter_map(|addr| {
                    if let Some(email) = addr.address() {
                        Some(EmailAddress {
                            name: addr.name().unwrap_or("").to_string(),
                            email: email.to_string(),
                        })
                    } else {
                        None
                    }
                })
                .collect()
        })
    }

    /// Generate a unique ID for an email
    fn generate_id(from_email: &str, uid: u32) -> String {
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};

        let mut hasher = DefaultHasher::new();
        from_email.hash(&mut hasher);
        uid.hash(&mut hasher);
        format!("{:x}", hasher.finish())
    }
}

impl Clone for ImapConfig {
    fn clone(&self) -> Self {
        Self {
            server: self.server.clone(),
            port: self.port,
            use_ssl: self.use_ssl,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_create_preview() {
        let body = "This is a test email.\nIt has multiple lines.\nAnd some more text.";
        let preview = ImapClient::create_preview(body);
        assert!(preview.len() <= 104); // 100 + "..."
    }

    #[test]
    fn test_strip_html() {
        let html = "<p>Hello <b>world</b>!</p>";
        let text = ImapClient::strip_html(html);
        assert_eq!(text.trim(), "Hello world!");
    }

    #[test]
    fn test_generate_id() {
        let id1 = ImapClient::generate_id("test@example.com", 123);
        let id2 = ImapClient::generate_id("test@example.com", 123);
        let id3 = ImapClient::generate_id("test@example.com", 456);

        assert_eq!(id1, id2);
        assert_ne!(id1, id3);
    }
}
