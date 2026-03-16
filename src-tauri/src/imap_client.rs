use crate::accounts::ImapConfig;
use crate::database::{EmailAddress, Mail};
use mail_parser::{Message, MessageParser};
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
        let tls = native_tls::TlsConnector::builder()
            .build()
            .map_err(|e| ImapError::Tls(format!("Failed to create TLS connector: {}", e)))?;

        let server = self.config.server.clone();
        let port = self.config.port;
        let email = self.email.clone();
        let password = self.password.clone();

        tokio::task::spawn_blocking(move || {
            let addr = (server.as_str(), port);
            let client = imap::connect(addr, addr.0, &tls)
                .map_err(|e| ImapError::ConnectionFailed(format!("Failed to connect: {}", e)))?;

            let mut session = client
                .login(&email, &password)
                .map_err(|(e, _)| ImapError::AuthenticationFailed(format!("Login failed: {}", e)))?;

            session
                .select("INBOX")
                .map_err(|e| ImapError::Protocol(format!("Failed to select INBOX: {}", e)))?;

            session
                .logout()
                .map_err(|e| ImapError::Protocol(format!("Logout failed: {}", e)))?;

            Ok(())
        })
        .await
        .map_err(|e| ImapError::ConnectionFailed(format!("Connection task failed: {}", e)))?
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
        let tls = native_tls::TlsConnector::builder()
            .build()
            .map_err(|e| ImapError::Tls(format!("Failed to create TLS connector: {}", e)))?;

        let addr = (config.server.as_str(), config.port);

        let client = imap::connect(addr, addr.0, &tls)
            .map_err(|e| ImapError::ConnectionFailed(format!("Failed to connect: {}", e)))?;

        let mut session = client
            .login(&email, &password)
            .map_err(|(e, _)| ImapError::AuthenticationFailed(format!("Login failed: {}", e)))?;

        let mailbox = session
            .select(folder)
            .map_err(|e| ImapError::Protocol(format!("Failed to select folder '{}': {}", folder, e)))?;

        // Get recent emails
        let exists = mailbox.exists;
        let start = if exists > limit as u32 {
            exists - limit as u32 + 1
        } else {
            1
        };
        let range = format!("{}:{}", start, exists);

        let fetch_results = session
            .fetch(range, "(RFC822 UID FLAGS)")
            .map_err(|e| ImapError::FetchFailed(format!("Fetch failed: {}", e)))?;

        let mut mails = Vec::new();
        for fetch in fetch_results.iter() {
            if let Ok(mail) = Self::parse_fetch_response(fetch, folder) {
                mails.push(mail);
            }
        }

        session
            .logout()
            .map_err(|e| ImapError::Protocol(format!("Logout failed: {}", e)))?;

        Ok(mails)
    }

    /// Parse a fetch response into a Mail structure
    fn parse_fetch_response(fetch: &imap::types::Fetch, folder: &str) -> Result<Mail> {
        // Get the UID
        let uid = fetch.uid.ok_or_else(|| {
            ImapError::ParseError("No UID in fetch response".to_string())
        })?;

        // Get the email body
        let body = fetch.body().ok_or_else(|| {
            ImapError::ParseError("No body in fetch response".to_string())
        })?;

        // Parse the email using mail-parser
        let message = MessageParser::default().parse(body)
            .ok_or_else(|| ImapError::ParseError("Failed to parse email".to_string()))?;

        // Extract from address
        let from_addr = message.from();
        let (from_name, from_email) = Self::extract_first_address(from_addr);

        let subject = message.subject().unwrap_or("").to_string();

        // Extract bodies
        let body_text = Self::extract_body_text(&message);
        let html_body = message.body_html(0).map(|h| h.to_string());
        let preview = Self::create_preview(&body_text);

        // Get flags for read/unread status
        let flags = fetch.flags();
        let is_seen = flags.iter().any(|f| matches!(f, imap::types::Flag::Seen));

        // Generate unique ID
        let id = Self::generate_id(&from_email, uid);

        // Get timestamp
        let timestamp = message
            .date()
            .map(|d| {
                chrono::DateTime::from_timestamp(d.to_timestamp(), 0)
                    .map(|dt| dt.timestamp_millis())
                    .unwrap_or_else(|| chrono::Utc::now().timestamp_millis())
            })
            .unwrap_or_else(|| chrono::Utc::now().timestamp_millis());

        // Parse recipients
        let to = Self::extract_from_address(message.to());
        let cc = Self::extract_from_address(message.cc());
        let bcc = Self::extract_from_address(message.bcc());
        let reply_to = Self::extract_from_address(message.reply_to());

        // Check for attachments
        let attachment_count = message.attachment_count();

        Ok(Mail {
            id,
            from_name,
            from_email,
            subject,
            preview,
            body: body_text,
            html_body,
            timestamp,
            folder: folder.to_string(),
            unread: !is_seen,
            to,
            cc,
            bcc,
            reply_to,
            attachments: None,
            starred: Some(false),
            has_attachments: Some(attachment_count > 0),
        })
    }

    /// Extract plain text body from an email
    fn extract_body_text(message: &Message) -> String {
        // Try to get plain text part first
        if let Some(text) = message.body_text(0) {
            return text.to_string();
        }

        // Fall back to HTML body (stripped)
        if let Some(html) = message.body_html(0) {
            return Self::strip_html(&html);
        }

        // No body available
        String::new()
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

    /// Extract the first address from an Address enum
    fn extract_first_address(address: Option<&mail_parser::Address>) -> (String, String) {
        match address {
            Some(mail_parser::Address::List(addrs)) if !addrs.is_empty() => {
                let addr = &addrs[0];
                let name = addr.name().unwrap_or("").to_string();
                let email = addr.address().unwrap_or("unknown@unknown").to_string();
                (name, email)
            }
            Some(mail_parser::Address::Group(groups)) if !groups.is_empty() => {
                // Get the first group and its first address
                let group = &groups[0];
                if let Some(addr) = group.addresses.first() {
                    let name = addr.name().unwrap_or("").to_string();
                    let email = addr.address().unwrap_or("unknown@unknown").to_string();
                    (name, email)
                } else {
                    ("Unknown".to_string(), "unknown@unknown".to_string())
                }
            }
            _ => ("Unknown".to_string(), "unknown@unknown".to_string()),
        }
    }

    /// Extract addresses from an Address enum (can be a list or group)
    fn extract_from_address(address: Option<&mail_parser::Address>) -> Option<Vec<EmailAddress>> {
        match address {
            Some(mail_parser::Address::List(addrs)) => {
                let list: Vec<EmailAddress> = addrs
                    .iter()
                    .filter_map(|addr| {
                        addr.address().map(|email| EmailAddress {
                            name: addr.name().unwrap_or("").to_string(),
                            email: email.to_string(),
                        })
                    })
                    .collect();
                if list.is_empty() { None } else { Some(list) }
            }
            Some(mail_parser::Address::Group(groups)) => {
                let list: Vec<EmailAddress> = groups
                    .iter()
                    .flat_map(|group| {
                        group.addresses.iter().filter_map(|addr| {
                            addr.address().map(|email| EmailAddress {
                                name: addr.name().unwrap_or("").to_string(),
                                email: email.to_string(),
                            })
                        })
                    })
                    .collect();
                if list.is_empty() { None } else { Some(list) }
            }
            None => None,
        }
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
