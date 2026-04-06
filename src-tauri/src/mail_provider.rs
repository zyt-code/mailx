use std::fmt;

pub const SYSTEM_LOCAL_FOLDERS: [&str; 5] = ["inbox", "sent", "drafts", "archive", "trash"];

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

    /// Get the lightweight metadata fetch command used for mailbox list sync.
    pub fn get_metadata_fetch_command(&self) -> &'static str {
        match self {
            MailProvider::ICloud | MailProvider::Netease163 | MailProvider::Generic => {
                "(UID FLAGS INTERNALDATE ENVELOPE BODY.PEEK[TEXT]<0.2048>)"
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

    /// Get IMAP folder names to sync with their local folder mappings.
    /// Returns Vec<(imap_folder_name, local_folder_name)>.
    /// Multiple IMAP names may map to the same local folder (tried in order, first success wins).
    pub fn get_sync_folders(&self) -> Vec<(&'static str, &'static str)> {
        match self {
            // Netease 163 (Coremail) — try UTF-7 encoded names first (canonical),
            // then English fallback. Fewer attempts = fewer connections.
            MailProvider::Netease163 => vec![
                ("INBOX", "inbox"),
                ("&XfJT0ZAB-", "sent"),   // 已发送 (UTF-7)
                ("&g0l6P3ux-", "drafts"), // 草稿箱 (UTF-7)
                ("&XfJSIJZk-", "trash"),  // 已删除 (UTF-7)
            ],
            // iCloud uses standard names
            MailProvider::ICloud => vec![
                ("INBOX", "inbox"),
                ("Sent Messages", "sent"),
                ("Drafts", "drafts"),
                ("Deleted Messages", "trash"),
                ("Archive", "archive"),
                ("Junk", "trash"),
            ],
            // Generic IMAP: try common conventions
            MailProvider::Generic => vec![
                ("INBOX", "inbox"),
                ("Sent", "sent"),
                ("Sent Messages", "sent"),
                ("Sent Items", "sent"),
                ("Drafts", "drafts"),
                ("Trash", "trash"),
                ("Deleted Messages", "trash"),
                ("Archive", "archive"),
                ("Junk", "trash"),
            ],
        }
    }

    pub fn preferred_remote_folder_for_local(&self, local_folder: &str) -> Option<&'static str> {
        self.get_sync_folders()
            .into_iter()
            .find(|(_, local)| *local == local_folder)
            .map(|(remote, _)| remote)
    }

    pub fn classify_remote_folder(
        &self,
        remote_name: &str,
        attributes: &[String],
    ) -> Option<String> {
        let trimmed = remote_name.trim();
        if trimmed.is_empty() {
            return None;
        }

        for attribute in attributes {
            if let Some(system_folder) = Self::classify_attribute(attribute) {
                return Some(system_folder.to_string());
            }
        }

        if let Some(system_folder) = self.classify_remote_name(trimmed) {
            return Some(system_folder.to_string());
        }

        Some(Self::custom_local_folder_name(trimmed))
    }

    pub fn custom_local_folder_name(remote_name: &str) -> String {
        format!("custom:{}", remote_name.trim())
    }

    pub fn is_system_local_folder(local_folder: &str) -> bool {
        SYSTEM_LOCAL_FOLDERS.contains(&local_folder)
    }

    fn classify_attribute(attribute: &str) -> Option<&'static str> {
        match attribute.trim().to_ascii_lowercase().as_str() {
            "\\inbox" => Some("inbox"),
            "\\sent" => Some("sent"),
            "\\drafts" => Some("drafts"),
            "\\archive" | "\\all" => Some("archive"),
            "\\trash" | "\\junk" => Some("trash"),
            _ => None,
        }
    }

    fn classify_remote_name(&self, remote_name: &str) -> Option<&'static str> {
        self.get_sync_folders()
            .into_iter()
            .find_map(|(candidate_remote, local)| {
                if candidate_remote.eq_ignore_ascii_case(remote_name) || candidate_remote == remote_name
                {
                    Some(local)
                } else {
                    None
                }
            })
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

#[cfg(test)]
#[path = "../test/mail_provider_tests.rs"]
mod mail_provider_tests;
