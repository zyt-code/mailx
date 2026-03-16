use crate::accounts::SmtpConfig;
use crate::database::{EmailAddress, Mail};
use lettre::message::{header, Mailbox, Message as LettreMessage};
use lettre::transport::smtp::authentication::Credentials;
use lettre::{Message, SmtpTransport, Transport};
use thiserror::Error;

/// SMTP client errors
#[derive(Debug, Error)]
pub enum SmtpError {
    #[error("Connection failed: {0}")]
    ConnectionFailed(String),

    #[error("Authentication failed: {0}")]
    AuthenticationFailed(String),

    #[error("Send failed: {0}")]
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
    pub async fn send_mail(&self, mail: &Mail) -> Result<String> {
        let email_message = self.build_email_message(mail)?;

        let mailer = self.build_transport()?;

        // Send the email
        tokio::task::spawn_blocking({
            let mailer = mailer;
            let email_message = email_message;
            move || {
                mailer.send(&email_message)
            }
        })
        .await
        .map_err(|e| SmtpError::SendFailed(format!("Send task failed: {}", e)))?
        .map_err(|e| SmtpError::SendFailed(format!("Failed to send email: {}", e)))?;

        Ok(mail.id.clone())
    }

    /// Send a raw email message with custom headers
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
            move || {
                mailer.send(&email_message)
            }
        })
        .await
        .map_err(|e| SmtpError::SendFailed(format!("Send task failed: {}", e)))?
        .map_err(|e| SmtpError::SendFailed(format!("Failed to send email: {}", e)))?;

        // Generate an ID for the sent email
        let id = Self::generate_message_id(from);
        Ok(id)
    }

    /// Build the SMTP transport
    fn build_transport(&self) -> Result<SmtpTransport> {
        let creds = Credentials::new(self.email.clone(), self.password.clone());

        let relay = &self.config.server;
        let port = self.config.port;

        let transport = if self.config.use_ssl {
            // Use TLS/SSL
            SmtpTransport::relay(relay)
                .map_err(|e| SmtpError::ConnectionFailed(format!("Failed to create transport: {}", e)))?
                .port(port)
                .credentials(creds)
                .build()
        } else {
            // Use STARTTLS
            SmtpTransport::starttls_relay(relay)
                .map_err(|e| SmtpError::ConnectionFailed(format!("Failed to create STARTTLS transport: {}", e)))?
                .port(port)
                .credentials(creds)
                .build()
        };

        Ok(transport)
    }

    /// Build an email message from a Mail structure
    fn build_email_message(&self, mail: &Mail) -> Result<LettreMessage> {
        // Parse from address
        let from_mailbox: Mailbox = mail.from_email.parse()
            .map_err(|_| SmtpError::InvalidEmail(format!("Invalid from email: {}", mail.from_email)))?;

        // Parse to addresses
        let to_addresses = mail.to.as_ref().map(|to| {
            to.iter()
                .map(|addr| addr.email.parse::<Mailbox>())
                .collect::<std::result::Result<Vec<_>, _>>()
        }).transpose()
            .map_err(|_| SmtpError::InvalidEmail("Invalid to email address".to_string()))?;

        // Parse cc addresses
        let cc_addresses = mail.cc.as_ref().map(|cc| {
            cc.iter()
                .map(|addr| addr.email.parse::<Mailbox>())
                .collect::<std::result::Result<Vec<_>, _>>()
        }).transpose()
            .map_err(|_| SmtpError::InvalidEmail("Invalid cc email address".to_string()))?;

        // Build the message
        let mut message_builder = Message::builder()
            .from(from_mailbox)
            .subject(&mail.subject);

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

        // Build the final message with body
        let message = message_builder
            .header(header::Date::now())
            .body(mail.body.clone())
            .map_err(|e| SmtpError::Build(format!("Failed to build message: {}", e)))?;

        Ok(message)
    }

    /// Build a raw email message
    fn build_raw_message(
        &self,
        from: &str,
        to: &[EmailAddress],
        cc: Option<&[EmailAddress]>,
        subject: &str,
        body: &str,
    ) -> Result<LettreMessage> {
        // Parse from address
        let from_mailbox: Mailbox = from.parse()
            .map_err(|_| SmtpError::InvalidEmail(format!("Invalid from email: {}", from)))?;

        // Build the message
        let mut message_builder = Message::builder()
            .from(from_mailbox)
            .subject(subject);

        // Add to addresses
        for addr in to {
            let mailbox: Mailbox = addr.email.parse()
                .map_err(|_| SmtpError::InvalidEmail(format!("Invalid to email: {}", addr.email)))?;
            message_builder = message_builder.to(mailbox);
        }

        // Add cc addresses
        if let Some(cc) = cc {
            for addr in cc {
                let mailbox: Mailbox = addr.email.parse()
                    .map_err(|_| SmtpError::InvalidEmail(format!("Invalid cc email: {}", addr.email)))?;
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
    fn generate_message_id(from_email: &str) -> String {
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};
        use std::time::SystemTime;

        let mut hasher = DefaultHasher::new();
        from_email.hash(&mut hasher);
        SystemTime::now().duration_since(SystemTime::UNIX_EPOCH)
            .unwrap_or_default().as_nanos().hash(&mut hasher);
        format!("{:x}", hasher.finish())
    }
}

impl Clone for SmtpConfig {
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
    fn test_generate_message_id() {
        let id1 = SmtpClient::generate_message_id("test@example.com");
        let id2 = SmtpClient::generate_message_id("test@example.com");
        let id3 = SmtpClient::generate_message_id("other@example.com");

        // IDs should be different due to timestamp
        assert_ne!(id1, id2);

        // IDs should be non-empty
        assert!(!id1.is_empty());
        assert!(!id3.is_empty());
    }
}
