use crate::accounts::SmtpConfig;
use crate::database::{Attachment as MailAttachment, EmailAddress, Mail};
use lettre::message::{
    header, Attachment as MimeAttachment, Mailbox, Message, MultiPart, SinglePart,
};
use lettre::transport::smtp::authentication::Credentials;
use lettre::{SmtpTransport, Transport};
use thiserror::Error;

/// SMTP client errors
#[derive(Debug, Error)]
#[allow(dead_code)]
pub enum SmtpError {
    #[error("Connection failed: {0}")]
    ConnectionFailed(String),

    #[error("Authentication failed: {0}")]
    AuthenticationFailed(String),

    #[error("{0}")]
    SendFailed(String),

    #[error("Invalid email format: {0}")]
    InvalidEmail(String),

    #[error("Invalid credentials")]
    InvalidCredentials,

    #[error("Network error: {0}")]
    Network(String),

    #[error("Timeout")]
    Timeout,

    #[error("Not connected")]
    NotConnected,

    #[error("TLS error: {0}")]
    Tls(String),

    #[error("Build error: {0}")]
    Build(String),
}

/// Result type for SMTP operations
pub type Result<T> = std::result::Result<T, SmtpError>;

/// SMTP client for sending emails
pub struct SmtpClient {
    config: SmtpConfig,
    email: String,
    password: String,
}

impl SmtpClient {
    /// Create a new SMTP client
    pub fn new(config: SmtpConfig, email: String, password: String) -> Self {
        Self {
            config,
            email,
            password,
        }
    }

    /// Test the SMTP connection
    pub async fn test_connection(&self) -> Result<()> {
        let mailer = self.build_transport()?;

        // Try to connect and verify
        mailer
            .test_connection()
            .map_err(|e| SmtpError::ConnectionFailed(format!("Connection test failed: {}", e)))?;

        Ok(())
    }

    /// Send an email
    pub async fn send_mail(&self, mail: &Mail, attachments: &[MailAttachment]) -> Result<String> {
        let email_message = self.build_email_message(mail, attachments)?;

        let mailer = self.build_transport()?;

        // Send the email
        tokio::task::spawn_blocking({
            let mailer = mailer;
            let email_message = email_message;
            move || mailer.send(&email_message)
        })
        .await
        .map_err(|e| SmtpError::SendFailed(format!("Send task failed: {}", e)))?
        .map_err(|e| SmtpError::SendFailed(e.to_string()))?;

        Ok(mail.id.clone())
    }

    /// Send a raw email message with custom headers
    #[allow(dead_code)]
    pub async fn send_raw(
        &self,
        from: &str,
        to: &[EmailAddress],
        cc: Option<&[EmailAddress]>,
        subject: &str,
        body: &str,
    ) -> Result<String> {
        let email_message = self.build_raw_message(from, to, cc, subject, body)?;

        let mailer = self.build_transport()?;

        // Send the email
        tokio::task::spawn_blocking({
            let mailer = mailer;
            let email_message = email_message;
            move || mailer.send(&email_message)
        })
        .await
        .map_err(|e| SmtpError::SendFailed(format!("Send task failed: {}", e)))?
        .map_err(|e| SmtpError::SendFailed(e.to_string()))?;

        // Generate an ID for the sent email
        let id = Self::generate_message_id(from);
        Ok(id)
    }

    /// Build the SMTP transport
    ///
    /// Mapping strategy:
    /// - `use_ssl = true` and port 465: implicit TLS (SMTPS)
    /// - `use_ssl = true` and non-465 ports: STARTTLS (required)
    /// - `use_ssl = false`: plain SMTP (no TLS)
    fn build_transport(&self) -> Result<SmtpTransport> {
        let creds = Credentials::new(self.email.clone(), self.password.clone());

        let relay = &self.config.server;
        let port = self.config.port;

        let transport = if self.config.use_ssl {
            if port == 465 {
                SmtpTransport::relay(relay)
                    .map_err(|e| {
                        SmtpError::ConnectionFailed(format!(
                            "Failed to create TLS transport: {}",
                            e
                        ))
                    })?
                    .port(port)
                    .credentials(creds)
                    .build()
            } else {
                SmtpTransport::starttls_relay(relay)
                    .map_err(|e| {
                        SmtpError::ConnectionFailed(format!(
                            "Failed to create STARTTLS transport: {}",
                            e
                        ))
                    })?
                    .port(port)
                    .credentials(creds)
                    .build()
            }
        } else {
            SmtpTransport::builder_dangerous(relay)
                .port(port)
                .credentials(creds)
                .build()
        };

        Ok(transport)
    }

    /// Build an email message from a Mail structure
    fn build_email_message(&self, mail: &Mail, attachments: &[MailAttachment]) -> Result<Message> {
        // Parse from address
        let from_mailbox: Mailbox = mail.from_email.parse().map_err(|_| {
            SmtpError::InvalidEmail(format!("Invalid from email: {}", mail.from_email))
        })?;

        // Parse to addresses
        let to_addresses = mail
            .to
            .as_ref()
            .map(|to| {
                to.iter()
                    .map(|addr| addr.email.parse::<Mailbox>())
                    .collect::<std::result::Result<Vec<_>, _>>()
            })
            .transpose()
            .map_err(|_| SmtpError::InvalidEmail("Invalid to email address".to_string()))?;

        // Parse cc addresses
        let cc_addresses = mail
            .cc
            .as_ref()
            .map(|cc| {
                cc.iter()
                    .map(|addr| addr.email.parse::<Mailbox>())
                    .collect::<std::result::Result<Vec<_>, _>>()
            })
            .transpose()
            .map_err(|_| SmtpError::InvalidEmail("Invalid cc email address".to_string()))?;

        // Build the message
        let mut message_builder = Message::builder().from(from_mailbox).subject(&mail.subject);

        // Add to addresses
        if let Some(to) = to_addresses {
            for addr in to {
                message_builder = message_builder.to(addr);
            }
        }

        // Add cc addresses
        if let Some(cc) = cc_addresses {
            for addr in cc {
                message_builder = message_builder.cc(addr);
            }
        }

        let message_builder = message_builder.header(header::Date::now());
        let plain_body = if mail.body.trim().is_empty() {
            mail.html_body
                .as_deref()
                .map(strip_html_markup)
                .unwrap_or_default()
        } else {
            mail.body.clone()
        };
        let html_body = mail
            .html_body
            .as_ref()
            .map(|html| html.trim())
            .filter(|html| !html.is_empty());

        // Build the final message with body / multipart attachments.
        let message = if attachments.is_empty() {
            if let Some(html) = html_body {
                message_builder
                    .multipart(MultiPart::alternative_plain_html(
                        plain_body.clone(),
                        html.to_string(),
                    ))
                    .map_err(|e| SmtpError::Build(format!("Failed to build message: {}", e)))?
            } else {
                message_builder
                    .body(plain_body.clone())
                    .map_err(|e| SmtpError::Build(format!("Failed to build message: {}", e)))?
            }
        } else {
            let body_part = if let Some(html) = html_body {
                MultiPart::alternative_plain_html(plain_body.clone(), html.to_string())
            } else {
                MultiPart::mixed().singlepart(
                    SinglePart::builder()
                        .header(header::ContentType::TEXT_PLAIN)
                        .body(plain_body.clone()),
                )
            };

            let mut multipart = MultiPart::mixed().multipart(body_part);

            for attachment in attachments {
                let bytes = std::fs::read(&attachment.stored_path).map_err(|e| {
                    SmtpError::Build(format!(
                        "Failed to read attachment '{}': {}",
                        attachment.file_name, e
                    ))
                })?;
                let content_type =
                    header::ContentType::parse(&attachment.content_type).map_err(|e| {
                        SmtpError::Build(format!(
                            "Invalid content type for '{}': {}",
                            attachment.file_name, e
                        ))
                    })?;
                let part =
                    MimeAttachment::new(attachment.file_name.clone()).body(bytes, content_type);
                multipart = multipart.singlepart(part);
            }

            message_builder.multipart(multipart).map_err(|e| {
                SmtpError::Build(format!("Failed to build multipart message: {}", e))
            })?
        };

        Ok(message)
    }

    /// Build a raw email message
    #[allow(dead_code)]
    fn build_raw_message(
        &self,
        from: &str,
        to: &[EmailAddress],
        cc: Option<&[EmailAddress]>,
        subject: &str,
        body: &str,
    ) -> Result<Message> {
        // Parse from address
        let from_mailbox: Mailbox = from
            .parse()
            .map_err(|_| SmtpError::InvalidEmail(format!("Invalid from email: {}", from)))?;

        // Build the message
        let mut message_builder = Message::builder().from(from_mailbox).subject(subject);

        // Add to addresses
        for addr in to {
            let mailbox: Mailbox = addr.email.parse().map_err(|_| {
                SmtpError::InvalidEmail(format!("Invalid to email: {}", addr.email))
            })?;
            message_builder = message_builder.to(mailbox);
        }

        // Add cc addresses
        if let Some(cc) = cc {
            for addr in cc {
                let mailbox: Mailbox = addr.email.parse().map_err(|_| {
                    SmtpError::InvalidEmail(format!("Invalid cc email: {}", addr.email))
                })?;
                message_builder = message_builder.cc(mailbox);
            }
        }

        // Build the final message with body
        let message = message_builder
            .header(header::Date::now())
            .body(body.to_string())
            .map_err(|e| SmtpError::Build(format!("Failed to build message: {}", e)))?;

        Ok(message)
    }

    /// Generate a unique message ID
    #[allow(dead_code)]
    fn generate_message_id(from_email: &str) -> String {
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};
        use std::time::SystemTime;

        let mut hasher = DefaultHasher::new();
        from_email.hash(&mut hasher);
        SystemTime::now()
            .duration_since(SystemTime::UNIX_EPOCH)
            .unwrap_or_default()
            .as_nanos()
            .hash(&mut hasher);
        format!("{:x}", hasher.finish())
    }
}

fn strip_html_markup(html: &str) -> String {
    let mut plain = String::with_capacity(html.len());
    let mut chars = html.chars().peekable();

    while let Some(ch) = chars.next() {
        match ch {
            '<' => {
                let mut tag = String::new();
                while let Some(next) = chars.next() {
                    if next == '>' {
                        break;
                    }
                    tag.push(next);
                }
                push_tag_breaks(&mut plain, &tag);
            }
            '&' => {
                let mut entity = String::new();
                while let Some(&next) = chars.peek() {
                    chars.next();
                    if next == ';' {
                        break;
                    }
                    entity.push(next);
                }

                plain.push(match entity.as_str() {
                    "nbsp" => ' ',
                    "lt" => '<',
                    "gt" => '>',
                    "amp" => '&',
                    "quot" => '"',
                    "#39" => '\'',
                    _ => ' ',
                });
            }
            _ => plain.push(ch),
        }
    }

    plain
        .lines()
        .map(|line| line.trim())
        .filter(|line| !line.is_empty())
        .collect::<Vec<_>>()
        .join("\n")
}

fn push_tag_breaks(plain: &mut String, tag: &str) {
    let normalized = tag.trim().to_ascii_lowercase();
    if normalized.is_empty() {
        return;
    }

    let is_closing = normalized.starts_with('/');
    let tag_name = normalized
        .trim_start_matches('/')
        .split_whitespace()
        .next()
        .unwrap_or_default();

    match tag_name {
        "br" => push_plain_newline(plain),
        "li" => {
            if !is_closing {
                push_plain_newline(plain);
                plain.push_str("- ");
            } else {
                push_plain_newline(plain);
            }
        }
        "p" | "div" | "section" | "article" | "header" | "footer" | "blockquote" | "ul" | "ol"
        | "table" | "tr" => push_plain_newline(plain),
        "td" | "th" => {
            if !plain.ends_with([' ', '\n', '\t']) && !plain.is_empty() {
                plain.push('\t');
            }
        }
        _ => {}
    }
}

fn push_plain_newline(plain: &mut String) {
    if !plain.ends_with('\n') && !plain.is_empty() {
        plain.push('\n');
    }
}

#[cfg(test)]
#[path = "../test/smtp_client_tests.rs"]
mod smtp_client_tests;
