use std::fmt;

/// Mail provider types with different IMAP behaviors
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum MailProvider {
    /// Netease 163 mail service (163.com)
    Netease163,
    /// Apple iCloud mail (icloud.com, me.com, mac.com)
    ICloud,
    /// Generic IMAP server with standard behavior
    Generic,
}

impl MailProvider {
    /// Detect mail provider based on IMAP server hostname
    pub fn detect_from_host(host: &str) -> Self {
        let host_lower = host.to_lowercase();

        if host_lower.contains("163.com") {
            MailProvider::Netease163
        } else if host_lower.contains("icloud.com")
            || host_lower.contains("me.com")
            || host_lower.contains("mac.com")
        {
            MailProvider::ICloud
        } else {
            MailProvider::Generic
        }
    }

    /// Get the appropriate IMAP fetch command for this provider
    /// Returns the fetch query string (e.g., "(UID FLAGS INTERNALDATE BODY.PEEK[])")
    pub fn get_fetch_command(&self) -> &'static str {
        match self {
            // iCloud requires BODY.PEEK[] to avoid marking emails as read
            MailProvider::ICloud => "(UID FLAGS INTERNALDATE BODY.PEEK[])",
            // Netease163 and Generic can use standard fetch
            MailProvider::Netease163 | MailProvider::Generic => {
                "(UID FLAGS INTERNALDATE BODY.PEEK[])"
            }
        }
    }

    /// Get RFC822 fetch command for this provider (fallback for iCloud)
    pub fn get_rfc822_fetch_command(&self) -> &'static str {
        match self {
            // iCloud may need RFC822 as fallback
            MailProvider::ICloud => "(UID FLAGS INTERNALDATE RFC822)",
            // Other providers use standard body fetch
            MailProvider::Netease163 | MailProvider::Generic => {
                "(UID FLAGS INTERNALDATE BODY.PEEK[])"
            }
        }
    }

    /// Check if this provider may need RFC822 fallback for empty body
    pub fn needs_rfc822_fallback(&self) -> bool {
        matches!(self, MailProvider::ICloud)
    }

    /// Check if this provider requires IMAP ID command before login
    pub fn requires_imap_id(&self) -> bool {
        match self {
            // Chinese providers require IMAP ID command
            MailProvider::Netease163 => true,
            // iCloud and generic don't require ID
            MailProvider::ICloud | MailProvider::Generic => false,
        }
    }

    /// Get appropriate SMTP port for this provider
    #[allow(dead_code)]
    pub fn get_smtp_port(&self) -> u16 {
        match self {
            // Chinese providers use port 465 with SSL
            MailProvider::Netease163 => 465,
            // iCloud uses port 587 with STARTTLS
            MailProvider::ICloud => 587,
            // Generic uses standard port 587
            MailProvider::Generic => 587,
        }
    }

    /// Check if this provider uses SSL for SMTP (true) or STARTTLS (false)
    #[allow(dead_code)]
    pub fn use_smtp_ssl(&self) -> bool {
        match self {
            // Chinese providers use SSL on port 465
            MailProvider::Netease163 => true,
            // iCloud and generic use STARTTLS on port 587
            MailProvider::ICloud | MailProvider::Generic => false,
        }
    }
}

impl fmt::Display for MailProvider {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            MailProvider::Netease163 => write!(f, "Netease163"),
            MailProvider::ICloud => write!(f, "iCloud"),
            MailProvider::Generic => write!(f, "Generic"),
        }
    }
}
