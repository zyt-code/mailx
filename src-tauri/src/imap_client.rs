use crate::accounts::ImapConfig;
use crate::database::{EmailAddress, Mail};
use crate::mail_provider::MailProvider;
use mail_parser::{Message, MessageParser};
use std::io::BufReader;
use thiserror::Error;

/// IMAP client errors
#[derive(Debug, Error)]
#[allow(dead_code)]
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
        let config = self.config.clone();
        let email = self.email.clone();
        let password = self.password.clone();

        tokio::task::spawn_blocking(move || {
            println!(
                "[IMAP] test_connection: {}:{} (SSL={})",
                config.server, config.port, config.use_ssl
            );

            if !config.use_ssl {
                let mut session = Self::connect_plain(&config, &email, &password)?;
                println!("[IMAP] test_connection: login OK, selecting INBOX...");
                session
                    .select("INBOX")
                    .map_err(|e| ImapError::Protocol(format!("Failed to select INBOX: {}", e)))?;
                println!("[IMAP] test_connection: INBOX selected OK");
                let _ = session.logout();
            } else {
                let mut session = Self::connect_and_login(&config, &email, &password)?;
                println!("[IMAP] test_connection: login OK, selecting INBOX...");
                session
                    .select("INBOX")
                    .map_err(|e| ImapError::Protocol(format!("Failed to select INBOX: {}", e)))?;
                println!("[IMAP] test_connection: INBOX selected OK");
                let _ = session.logout();
            }
            println!("[IMAP] test_connection: SUCCESS");
            Ok(())
        })
        .await
        .map_err(|e| ImapError::ConnectionFailed(format!("Connection task panicked: {}", e)))?
    }

    /// Establish connection and login — shared by test_connection and fetch.
    /// Handles both TLS and plain TCP connections based on configuration.
    /// For servers requiring an IMAP ID command (163.com, etc.), the ID is sent
    /// *before* the imap crate takes over to avoid its parser choking on the
    /// `* ID (...)` untagged response.
    fn connect_and_login(
        config: &ImapConfig,
        email: &str,
        password: &str,
    ) -> Result<imap::Session<native_tls::TlsStream<std::net::TcpStream>>> {
        let use_tls = config.use_ssl;

        println!(
            "[IMAP] Connection setup: use_tls={}, server={}, port={}",
            use_tls, config.server, config.port
        );

        let (server, _) = Self::split_server_port(&config.server, config.port);
        let addr = (server, config.port);

        if Self::needs_id_command(&config.server) {
            // ── Manual flow: TLS → greeting → ID → hand off to imap crate ──
            Self::connect_with_id(addr, email, password, use_tls)
        } else {
            // ── Standard flow via imap::connect ──
            Self::connect_standard(addr, email, password, use_tls)
        }
    }

    /// Standard connection flow for servers that don't need an ID command.
    /// Handles both TLS and plain TCP connections.
    fn connect_standard(
        addr: (&str, u16),
        email: &str,
        password: &str,
        use_tls: bool,
    ) -> Result<imap::Session<native_tls::TlsStream<std::net::TcpStream>>> {
        if use_tls {
            // TLS connection
            println!("[IMAP] Connecting to {}:{}... (TLS=true)", addr.0, addr.1);
            let tls = native_tls::TlsConnector::builder()
                .min_protocol_version(Some(native_tls::Protocol::Tlsv12))
                .build()
                .map_err(|e| ImapError::Tls(format!("Failed to create TLS connector: {}", e)))?;
            let client = imap::connect(addr, addr.0, &tls).map_err(|e| {
                println!("[IMAP] Connection FAILED: {}", e);
                ImapError::ConnectionFailed(format!(
                    "Failed to connect to {}:{} — {}",
                    addr.0, addr.1, e
                ))
            })?;
            println!("[IMAP] Connected OK (TLS)");

            println!("[IMAP] Logging in as '{}'...", email);
            let session = client.login(email, password).map_err(|(e, _)| {
                println!("[IMAP] Login FAILED: {}", e);
                ImapError::AuthenticationFailed(format!("Login failed for '{}': {}", email, e))
            })?;
            println!("[IMAP] Login OK");
            Ok(session)
        } else {
            // Plain TCP connection (no TLS) - use different session type
            println!("[IMAP] Connecting to {}:{}... (TLS=false)", addr.0, addr.1);
            let tcp = std::net::TcpStream::connect(addr).map_err(|e| {
                println!("[IMAP] TCP connection FAILED: {}", e);
                ImapError::ConnectionFailed(format!(
                    "Failed to connect to {}:{} — {}",
                    addr.0, addr.1, e
                ))
            })?;
            let client = imap::Client::new(tcp);
            println!("[IMAP] Connected OK (plain)");

            println!("[IMAP] Logging in as '{}'...", email);
            let _session = client.login(email, password).map_err(|(e, _)| {
                println!("[IMAP] Login FAILED: {}", e);
                ImapError::AuthenticationFailed(format!("Login failed for '{}': {}", email, e))
            })?;
            println!("[IMAP] Login OK");
            // Note: Plain connections return a different session type
            // We need to handle this at the caller level
            Err(ImapError::ConnectionFailed(
                "Plain connections not fully supported in standard flow".into(),
            ))
        }
    }

    /// Connection flow for Chinese email providers that require an IMAP ID command.
    ///
    /// The imap crate's response parser cannot handle the `* ID (...)` untagged
    /// response, so we handle the connection manually up to and including the ID
    /// exchange, then hand the clean stream to `imap::Client::new()`.
    fn connect_with_id(
        addr: (&str, u16),
        email: &str,
        password: &str,
        use_tls: bool,
    ) -> Result<imap::Session<native_tls::TlsStream<std::net::TcpStream>>> {
        use std::io::{BufRead, Write};

        println!(
            "[IMAP] Connecting to {}:{} (with ID)... (TLS={})",
            addr.0, addr.1, use_tls
        );

        // Note: ID command flow always requires TLS for Chinese providers
        if !use_tls {
            return Err(ImapError::ConnectionFailed(
                "ID command flow requires TLS but TLS was disabled".into(),
            ));
        }

        let tls = native_tls::TlsConnector::builder()
            .min_protocol_version(Some(native_tls::Protocol::Tlsv12))
            .build()
            .map_err(|e| ImapError::Tls(format!("Failed to create TLS connector: {}", e)))?;

        let tcp = std::net::TcpStream::connect(addr).map_err(|e| {
            println!("[IMAP] TCP connect FAILED: {}", e);
            ImapError::ConnectionFailed(format!(
                "Failed to connect to {}:{} — {}",
                addr.0, addr.1, e
            ))
        })?;

        let tls_stream = tls.connect(addr.0, tcp).map_err(|e| {
            println!("[IMAP] TLS handshake FAILED: {}", e);
            ImapError::Tls(format!("TLS handshake failed for {}: {}", addr.0, e))
        })?;
        println!("[IMAP] Connected OK");

        // Wrap in BufReader for reliable line-by-line reading.
        let mut reader = BufReader::new(tls_stream);

        // 1. Read server greeting (e.g. "* OK Coremail ... ready")
        let mut greeting = String::new();
        reader
            .read_line(&mut greeting)
            .map_err(|e| ImapError::Protocol(format!("Failed to read greeting: {}", e)))?;
        println!("[IMAP] Greeting: {}", greeting.trim());

        // 2. Send ID command with a tag that won't collide with the imap crate
        println!("[IMAP] Sending ID command...");
        let id_cmd = b"a0 ID (\"name\" \"mailx\" \"version\" \"1.0.0\" \"vendor\" \"Mailx\")\r\n";
        reader
            .get_mut()
            .write_all(id_cmd)
            .map_err(|e| ImapError::Protocol(format!("Failed to send ID: {}", e)))?;
        reader
            .get_mut()
            .flush()
            .map_err(|e| ImapError::Protocol(format!("Failed to flush ID: {}", e)))?;

        // 3. Read until the tagged response "a0 OK/NO/BAD ..."
        loop {
            let mut line = String::new();
            reader
                .read_line(&mut line)
                .map_err(|e| ImapError::Protocol(format!("Failed to read ID response: {}", e)))?;
            let trimmed = line.trim();
            println!("[IMAP] ID response: {}", trimmed);
            if trimmed.starts_with("a0 ") {
                break;
            }
        }
        println!("[IMAP] ID command OK");

        // 4. Brief pause to ensure 163.com has fully flushed its response
        std::thread::sleep(std::time::Duration::from_millis(250));

        // 5. Unwrap BufReader → raw TLS stream, then hand to the imap crate.
        let raw_stream = reader.into_inner();
        let client = imap::Client::new(raw_stream);

        // 6. Login normally via the imap crate
        println!("[IMAP] Logging in as '{}'...", email);
        let session = client.login(email, password).map_err(|(e, _)| {
            println!("[IMAP] Login FAILED: {}", e);
            ImapError::AuthenticationFailed(format!("Login failed for '{}': {}", email, e))
        })?;
        println!("[IMAP] Login OK");
        Ok(session)
    }

    /// Check if the IMAP server requires an ID command to allow folder selection.
    /// Chinese email providers (163, 126, QQ, etc.) reject SELECT without prior ID.
    fn needs_id_command(server: &str) -> bool {
        MailProvider::detect_from_host(server).requires_imap_id()
    }

    /// Split server string into host and port parts.
    /// Handles hostnames, IPv4 addresses, and IPv6 addresses in bracket notation.
    /// If the server string contains a colon followed by a valid port number,
    /// extracts that port and uses the preceding part as the hostname.
    /// Repeatedly extracts ports from the end to handle cases where the server
    /// string might have embedded port information (e.g., "host:port1:port2"
    /// where port1 is the actual port and :port2 is erroneous).
    /// Otherwise returns the server as hostname and the provided default port.
    fn split_server_port(server: &str, default_port: u16) -> (&str, u16) {
        let server = server.trim();

        // Handle IPv6 addresses in brackets like [::1]:993
        if server.starts_with('[') {
            if let Some(end_bracket) = server.find(']') {
                let host = &server[1..end_bracket];
                let port_part = &server[end_bracket + 1..];
                if port_part.starts_with(':') {
                    if let Ok(port) = port_part[1..].parse::<u16>() {
                        return (host, port);
                    }
                }
                // No port specified, use default
                return (host, default_port);
            }
        }

        // For hostnames, repeatedly try to split off a port from the end
        // as long as what remains looks like a valid hostname (no embedded ports)
        let mut current = server;
        let mut port = default_port;

        loop {
            // Try to split off a port from the end
            if let Some(last_colon) = current.rfind(':') {
                let host_candidate = &current[..last_colon];
                let port_str = &current[last_colon + 1..];

                // Check if port_str is a valid port number
                if let Ok(port_candidate) = port_str.parse::<u16>() {
                    // Check if host_candidate looks like it might still contain a port
                    // (i.e., contains a colon and is not an IPv6 address in brackets)
                    let host_candidate_might_have_port = host_candidate.contains(':')
                        && !(host_candidate.starts_with('[') && host_candidate.ends_with(']'));

                    if host_candidate_might_have_port {
                        // The host_candidate still looks like it has an embedded port,
                        // so continue trying to extract from it
                        current = host_candidate;
                        port = port_candidate;
                        continue;
                    } else {
                        // This looks like we've found the real host and port
                        return (host_candidate, port_candidate);
                    }
                }
            }
            // If we can't split off a port anymore, we're done
            break;
        }

        // Return what we have left and the last port we found (or default)
        (current, port)
    }

    /// Connect using plain TCP without TLS (for local development servers).
    /// Returns a Session with TcpStream for compatibility with the return type.
    fn connect_plain(
        config: &ImapConfig,
        email: &str,
        password: &str,
    ) -> Result<imap::Session<std::net::TcpStream>> {
        let (server, port) = Self::split_server_port(&config.server, config.port);
        let addr = (server, port);
        println!("[IMAP] Connecting (plain) to {}:{}...", addr.0, addr.1);
        let tcp = std::net::TcpStream::connect(addr).map_err(|e| {
            println!("[IMAP] TCP connect FAILED: {}", e);
            ImapError::ConnectionFailed(format!(
                "Failed to connect to {}:{} — {}",
                addr.0, addr.1, e
            ))
        })?;
        let client = imap::Client::new(tcp);
        println!("[IMAP] Connected OK (plain)");

        println!("[IMAP] Logging in as '{}'...", email);
        let session = client.login(email, password).map_err(|(e, _)| {
            println!("[IMAP] Login FAILED: {}", e);
            ImapError::AuthenticationFailed(format!("Login failed for '{}': {}", email, e))
        })?;
        println!("[IMAP] Login OK");
        Ok(session)
    }

    /// Fetch emails from a folder
    pub async fn fetch_emails(&self, folder: &str, limit: usize) -> Result<Vec<Mail>> {
        let config = self.config.clone();
        let email = self.email.clone();
        let password = self.password.clone();
        let folder = folder.to_string();

        tokio::task::spawn_blocking(move || {
            Self::fetch_emails_blocking(config, email, password, &folder, limit)
        })
        .await
        .map_err(|e| ImapError::FetchFailed(format!("Fetch task panicked: {}", e)))?
    }

    /// Fetch emails using blocking IMAP
    fn fetch_emails_blocking(
        config: ImapConfig,
        email: String,
        password: String,
        folder: &str,
        limit: usize,
    ) -> Result<Vec<Mail>> {
        if !config.use_ssl {
            Self::fetch_emails_blocking_plain(config, email, password, folder, limit)
        } else {
            Self::fetch_emails_blocking_tls(config, email, password, folder, limit)
        }
    }

    /// Fetch emails using plain TCP (no TLS)
    fn fetch_emails_blocking_plain(
        config: ImapConfig,
        email: String,
        password: String,
        folder: &str,
        limit: usize,
    ) -> Result<Vec<Mail>> {
        let mut session = Self::connect_plain(&config, &email, &password)?;

        println!("[IMAP] Selecting folder '{}'...", folder);
        let mailbox = session.select(folder).map_err(|e| {
            println!("[IMAP] Select folder '{}' FAILED: {}", folder, e);
            ImapError::Protocol(format!("Failed to select folder '{}': {}", folder, e))
        })?;

        let exists = mailbox.exists;
        println!(
            "[IMAP] Folder '{}': {} messages exist, uid_validity={:?}",
            folder, exists, mailbox.uid_validity
        );

        // Empty mailbox — return immediately
        if exists == 0 {
            println!("[IMAP] Mailbox empty, nothing to fetch");
            let _ = session.logout();
            return Ok(Vec::new());
        }

        // Calculate fetch range: last `limit` messages by sequence number
        let start = if exists > limit as u32 {
            exists - limit as u32 + 1
        } else {
            1
        };
        let range = format!("{}:{}", start, exists);
        println!(
            "[IMAP] Fetching sequence range {} ({} messages)...",
            range,
            exists - start + 1
        );

        // Detect mail provider for provider-specific fetch behavior
        let provider = MailProvider::detect_from_host(&config.server);
        let fetch_command = provider.get_fetch_command();
        println!(
            "[IMAP] Provider: {}, fetch command: {}",
            provider, fetch_command
        );

        let fetch_results = session.fetch(&range, fetch_command).map_err(|e| {
            println!("[IMAP] Fetch FAILED: {}", e);
            ImapError::FetchFailed(format!("Fetch range {} failed: {}", range, e))
        })?;

        println!(
            "[IMAP] Fetched {} responses, parsing...",
            fetch_results.len()
        );

        let mut mails = Vec::new();
        let mut parse_errors = 0u32;
        let needs_rfc822_retry = provider.needs_rfc822_fallback();

        for (i, fetch) in fetch_results.iter().enumerate() {
            match Self::parse_fetch_response(fetch, folder) {
                Ok(mail) => mails.push(mail),
                Err(e) => {
                    // Check if this is an empty body error for iCloud
                    if needs_rfc822_retry && e.to_string().contains("No body in fetch response") {
                        // Try RFC822 fallback - need to fetch this specific message again
                        if let Some(uid) = fetch.uid {
                            println!("[IMAP] iCloud empty body detected for UID={}, trying RFC822 fallback...", uid);
                            let uid_str = uid.to_string();
                            match session.fetch(&uid_str, provider.get_rfc822_fetch_command()) {
                                Ok(rfc822_results) => {
                                    if let Some(rfc822_fetch) = rfc822_results.first() {
                                        match Self::parse_fetch_response(rfc822_fetch, folder) {
                                            Ok(rfc822_mail) => {
                                                println!(
                                                    "[IMAP] RFC822 fallback succeeded for UID={}",
                                                    uid
                                                );
                                                mails.push(rfc822_mail);
                                                continue;
                                            }
                                            Err(e2) => {
                                                println!("[IMAP] RFC822 fallback parse failed for UID={}: {}", uid, e2);
                                            }
                                        }
                                    }
                                }
                                Err(e2) => {
                                    println!(
                                        "[IMAP] RFC822 fallback fetch failed for UID={}: {}",
                                        uid, e2
                                    );
                                }
                            }
                        }
                    }
                    parse_errors += 1;
                    let uid_str = fetch.uid.map(|u| u.to_string()).unwrap_or("?".into());
                    println!(
                        "[IMAP] Parse error on message {}/{} (UID={}): {}",
                        i + 1,
                        fetch_results.len(),
                        uid_str,
                        e
                    );
                }
            }
        }

        println!(
            "[IMAP] Parsed {} mails OK, {} parse errors",
            mails.len(),
            parse_errors
        );

        let _ = session.logout();
        println!("[IMAP] Logged out");

        Ok(mails)
    }

    /// Fetch emails using TLS
    fn fetch_emails_blocking_tls(
        config: ImapConfig,
        email: String,
        password: String,
        folder: &str,
        limit: usize,
    ) -> Result<Vec<Mail>> {
        let mut session = Self::connect_and_login(&config, &email, &password)?;

        println!("[IMAP] Selecting folder '{}'...", folder);
        let mailbox = session.select(folder).map_err(|e| {
            println!("[IMAP] Select folder '{}' FAILED: {}", folder, e);
            ImapError::Protocol(format!("Failed to select folder '{}': {}", folder, e))
        })?;

        let exists = mailbox.exists;
        println!(
            "[IMAP] Folder '{}': {} messages exist, uid_validity={:?}",
            folder, exists, mailbox.uid_validity
        );

        // Empty mailbox — return immediately
        if exists == 0 {
            println!("[IMAP] Mailbox empty, nothing to fetch");
            let _ = session.logout();
            return Ok(Vec::new());
        }

        // Calculate fetch range: last `limit` messages by sequence number
        let start = if exists > limit as u32 {
            exists - limit as u32 + 1
        } else {
            1
        };
        let range = format!("{}:{}", start, exists);
        println!(
            "[IMAP] Fetching sequence range {} ({} messages)...",
            range,
            exists - start + 1
        );

        // Detect mail provider for provider-specific fetch behavior
        let provider = MailProvider::detect_from_host(&config.server);
        let fetch_command = provider.get_fetch_command();
        println!(
            "[IMAP] Provider: {}, fetch command: {}",
            provider, fetch_command
        );

        let fetch_results = session.fetch(&range, fetch_command).map_err(|e| {
            println!("[IMAP] Fetch FAILED: {}", e);
            ImapError::FetchFailed(format!("Fetch range {} failed: {}", range, e))
        })?;

        println!(
            "[IMAP] Fetched {} responses, parsing...",
            fetch_results.len()
        );

        let mut mails = Vec::new();
        let mut parse_errors = 0u32;
        let needs_rfc822_retry = provider.needs_rfc822_fallback();

        for (i, fetch) in fetch_results.iter().enumerate() {
            match Self::parse_fetch_response(fetch, folder) {
                Ok(mail) => mails.push(mail),
                Err(e) => {
                    // Check if this is an empty body error for iCloud
                    if needs_rfc822_retry && e.to_string().contains("No body in fetch response") {
                        // Try RFC822 fallback - need to fetch this specific message again
                        if let Some(uid) = fetch.uid {
                            println!("[IMAP] iCloud empty body detected for UID={}, trying RFC822 fallback...", uid);
                            let uid_str = uid.to_string();
                            match session.fetch(&uid_str, provider.get_rfc822_fetch_command()) {
                                Ok(rfc822_results) => {
                                    if let Some(rfc822_fetch) = rfc822_results.first() {
                                        match Self::parse_fetch_response(rfc822_fetch, folder) {
                                            Ok(rfc822_mail) => {
                                                println!(
                                                    "[IMAP] RFC822 fallback succeeded for UID={}",
                                                    uid
                                                );
                                                mails.push(rfc822_mail);
                                                continue;
                                            }
                                            Err(e2) => {
                                                println!("[IMAP] RFC822 fallback parse failed for UID={}: {}", uid, e2);
                                            }
                                        }
                                    }
                                }
                                Err(e2) => {
                                    println!(
                                        "[IMAP] RFC822 fallback fetch failed for UID={}: {}",
                                        uid, e2
                                    );
                                }
                            }
                        }
                    }
                    parse_errors += 1;
                    let uid_str = fetch.uid.map(|u| u.to_string()).unwrap_or("?".into());
                    println!(
                        "[IMAP] Parse error on message {}/{} (UID={}): {}",
                        i + 1,
                        fetch_results.len(),
                        uid_str,
                        e
                    );
                }
            }
        }

        println!(
            "[IMAP] Parsed {} mails OK, {} parse errors",
            mails.len(),
            parse_errors
        );

        let _ = session.logout();
        println!("[IMAP] Logged out");

        Ok(mails)
    }

    /// Store IMAP flags on a message (async wrapper).
    ///
    /// This method allows you to modify message flags on the IMAP server, such as
    /// marking a message as read, flagged, or deleted. The operation is performed
    /// asynchronously using a blocking task.
    ///
    /// # Arguments
    ///
    /// * `folder` - The folder name (e.g., "INBOX", "Sent")
    /// * `uid` - The IMAP UID of the message to modify
    /// * `flags` - IMAP flag store command in the format accepted by the STORE command
    ///
    /// # Flag Format
    ///
    /// The `flags` parameter uses IMAP STORE command syntax:
    ///
    /// - To add flags: `"+FLAGS (\\Seen)"` or `"+FLAGS (\\Seen \\Flagged)"`
    /// - To remove flags: `"-FLAGS (\\Seen)"`
    /// - To replace flags: `"FLAGS (\\Seen \\Answered)"`
    ///
    /// Common IMAP system flags:
    ///
    /// - `\\Seen` - Message has been read
    /// - `\\Answered` - Message has been answered
    /// - `\\Flagged` - Message is flagged/marked
    /// - `\\Deleted` - Message is marked for deletion
    /// - `\\Draft` - Message is a draft
    ///
    /// # Examples
    ///
    /// ```text
    /// // Mark message as read
    /// client.store_flags("INBOX", 12345, "+FLAGS (\\Seen)").await?;
    ///
    /// // Mark message as flagged and read
    /// client.store_flags("INBOX", 12345, "+FLAGS (\\Seen \\Flagged)").await?;
    ///
    /// // Remove the Seen flag (mark as unread)
    /// client.store_flags("INBOX", 12345, "-FLAGS (\\Seen)").await?;
    ///
    /// // Mark message for deletion
    /// client.store_flags("INBOX", 12345, "+FLAGS (\\Deleted)").await?;
    /// ```
    ///
    /// # Use Cases
    ///
    /// - Marking emails as read when opened in the client
    /// - Flagging important messages
    /// - Marking messages for deletion before expunge
    /// - Syncing read/unread status across devices
    pub async fn store_flags(&self, folder: &str, uid: u32, flags: &str) -> Result<()> {
        let config = self.config.clone();
        let email = self.email.clone();
        let password = self.password.clone();
        let folder = folder.to_string();
        let flags = flags.to_string();

        tokio::task::spawn_blocking(move || {
            Self::store_flags_blocking(config, email, password, &folder, uid, &flags)
        })
        .await
        .map_err(|e| ImapError::ConnectionFailed(format!("Store flags task panicked: {}", e)))?
    }

    /// Store IMAP flags on a message using blocking IMAP operations.
    ///
    /// This is the blocking implementation of [`store_flags`]. It connects to the
    /// IMAP server, selects the specified folder, and executes a STORE command to
    /// modify the flags on the message with the given UID.
    ///
    /// # Arguments
    ///
    /// * `config` - IMAP server configuration
    /// * `email` - Email address for authentication
    /// * `password` - Password for authentication
    /// * `folder` - The folder name (e.g., "INBOX")
    /// * `uid` - The IMAP UID of the message to modify
    /// * `flags` - IMAP flag store command (e.g., "+FLAGS (\\Seen)")
    ///
    /// # Examples
    ///
    /// See [`store_flags`] for documentation on flag format and examples.
    fn store_flags_blocking(
        config: ImapConfig,
        email: String,
        password: String,
        folder: &str,
        uid: u32,
        flags: &str,
    ) -> Result<()> {
        if !config.use_ssl {
            let mut session = Self::connect_plain(&config, &email, &password)?;
            session.select(folder).map_err(|e| {
                println!("[IMAP] Select folder '{}' FAILED: {}", folder, e);
                ImapError::Protocol(format!("Failed to select folder '{}': {}", folder, e))
            })?;

            println!("[IMAP] Storing flags '{}' on UID {}...", flags, uid);
            let uid_str = uid.to_string();
            session.uid_store(&uid_str, flags).map_err(|e| {
                println!("[IMAP] Store flags FAILED for UID {}: {}", uid, e);
                ImapError::Protocol(format!("Failed to store flags '{}': {}", flags, e))
            })?;

            println!("[IMAP] Flags stored successfully for UID {}", uid);
            let _ = session.logout();
            println!("[IMAP] Logged out");
            return Ok(());
        }

        let mut session = Self::connect_and_login(&config, &email, &password)?;
        session.select(folder).map_err(|e| {
            println!("[IMAP] Select folder '{}' FAILED: {}", folder, e);
            ImapError::Protocol(format!("Failed to select folder '{}': {}", folder, e))
        })?;

        println!("[IMAP] Storing flags '{}' on UID {}...", flags, uid);
        let uid_str = uid.to_string();
        session.uid_store(&uid_str, flags).map_err(|e| {
            println!("[IMAP] Store flags FAILED for UID {}: {}", uid, e);
            ImapError::Protocol(format!("Failed to store flags '{}': {}", flags, e))
        })?;

        println!("[IMAP] Flags stored successfully for UID {}", uid);
        let _ = session.logout();
        println!("[IMAP] Logged out");
        Ok(())
    }

    /// Parse a fetch response into a Mail structure.
    /// Applies fallbacks so that malformed headers don't crash the whole sync.
    fn parse_fetch_response(fetch: &imap::types::Fetch, folder: &str) -> Result<Mail> {
        // Get the UID — required for dedup
        let uid = fetch
            .uid
            .ok_or_else(|| ImapError::ParseError("No UID in fetch response".to_string()))?;

        // Get the raw email body - now using BODY.PEEK[] from the fetch query
        let body = fetch.body().ok_or_else(|| {
            ImapError::ParseError(format!(
                "No body in fetch response (UID={}). Ensure fetch query includes BODY.PEEK[].",
                uid
            ))
        })?;

        // Log the body size for diagnostics
        println!("[IMAP] UID={} body size={} bytes", uid, body.len());

        // Parse the email using mail-parser. If parsing completely fails,
        // create a minimal fallback mail so the sync continues.
        println!("[IMAP] UID={} parsing email ({} bytes)...", uid, body.len());
        let message = MessageParser::default().parse(body);

        // Log parsing result for diagnostics
        if message.is_none() {
            println!(
                "[IMAP] UID={} mail-parser returned None - body may be corrupted or incomplete. First 200 chars: {}",
                uid,
                String::from_utf8_lossy(&body[..body.len().min(200)])
            );
        } else {
            println!("[IMAP] UID={} mail-parser OK - parsed successfully", uid);
        }

        let (
            from_name,
            from_email,
            subject,
            body_text,
            html_body,
            preview,
            timestamp,
            to,
            cc,
            bcc,
            reply_to,
            attachment_count,
        ) = if let Some(ref msg) = message {
            let from_addr = msg.from();
            let (fn_, fe_) = Self::extract_first_address(from_addr);
            let subj = msg.subject().unwrap_or("(No Subject)").to_string();
            let bt = Self::extract_body_text(msg);
            let hb = msg.body_html(0).map(|h| h.to_string());
            let pv = Self::create_preview(&bt);

            // Parse timestamp from email Date header
            // to_timestamp() returns seconds since epoch — multiply by 1000 for milliseconds
            // If Date header is invalid or < 1000000 (around 1970), use current time as fallback
            // Note: imap 0.9 doesn't have internal_date() method on Fetch, using current time
            let current_time_ms = chrono::Utc::now().timestamp_millis();
            let min_timestamp = 1000000i64; // 1970-01-12 approx in milliseconds
            let ts = msg.date()
                    .map(|d| {
                        let secs = d.to_timestamp();
                        let ms = secs * 1000;
                        if ms >= min_timestamp {
                            println!("[IMAP] UID={} Date header: {:?}, timestamp: {}ms", uid, d, ms);
                            ms
                        } else {
                            // Date header is invalid or before 1970, use current time
                            println!("[IMAP] UID={} Date header parsed to invalid timestamp: {:?} ({}ms), using current time: {}ms", uid, d, ms, current_time_ms);
                            current_time_ms
                        }
                    })
                    .unwrap_or_else(|| {
                        println!("[IMAP] UID={} no Date header found, using current time: {}ms", uid, current_time_ms);
                        current_time_ms
                    });

            let to_ = Self::extract_from_address(msg.to());
            let cc_ = Self::extract_from_address(msg.cc());
            let bcc_ = Self::extract_from_address(msg.bcc());
            let rt_ = Self::extract_from_address(msg.reply_to());
            let ac = msg.attachment_count();
            (fn_, fe_, subj, bt, hb, pv, ts, to_, cc_, bcc_, rt_, ac)
        } else {
            // mail-parser failed entirely — produce a stub
            println!(
                "[IMAP] mail-parser returned None for UID={}, creating fallback stub",
                uid
            );
            (
                "Unknown Sender".to_string(),
                "unknown@unknown".to_string(),
                "(Unparseable Email)".to_string(),
                String::new(),
                None,
                String::new(),
                chrono::Utc::now().timestamp_millis(),
                None,
                None,
                None,
                None,
                0,
            )
        };

        // Get flags for read/unread status
        let flags = fetch.flags();
        let is_seen = flags.iter().any(|f| matches!(f, imap::types::Flag::Seen));

        // Generate unique ID
        let id = Self::generate_id(&from_email, uid);

        Ok(Mail {
            id,
            uid: Some(uid),
            from_name,
            from_email,
            subject,
            preview,
            body: body_text,
            html_body,
            timestamp,
            folder: folder.to_lowercase(),
            unread: !is_seen,
            is_read: is_seen,
            account_id: None, // Set by SyncManager before DB insert
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

    /// Create a preview snippet from the body text (max 80 characters)
    fn create_preview(body: &str) -> String {
        let lines: Vec<&str> = body.lines().collect();
        let preview = lines
            .into_iter()
            .take(3)
            .collect::<Vec<_>>()
            .join(" ")
            .chars()
            .take(80)
            .collect::<String>();

        let result = if preview.len() >= 80 {
            format!("{}...", preview)
        } else {
            preview
        };

        // Filter out CSS class definitions (lines starting with . or containing .{)
        let filtered: String = result
            .lines()
            .filter(|line| {
                let trimmed = line.trim();
                !trimmed.starts_with('.') && !trimmed.contains(".{")
            })
            .collect::<Vec<_>>()
            .join(" ");

        if filtered.is_empty() {
            String::new()
        } else {
            filtered
        }
    }

    /// Strip HTML tags from a string, removing <style> and <script> blocks entirely
    fn strip_html(html: &str) -> String {
        // First remove <style>...</style> and <script>...</script> blocks entirely
        let lowered = html.to_lowercase();
        let mut cleaned = String::with_capacity(html.len());
        let mut i = 0;
        let bytes = html.as_bytes();
        let low_bytes = lowered.as_bytes();

        while i < bytes.len() {
            // Check for <style or <script tags
            if low_bytes[i] == b'<' && i + 7 < low_bytes.len() {
                let rest = &lowered[i..];
                if rest.starts_with("<style") || rest.starts_with("<script") {
                    let end_tag = if rest.starts_with("<style") {
                        "</style>"
                    } else {
                        "</script>"
                    };
                    if let Some(end_pos) = lowered[i..].find(end_tag) {
                        i += end_pos + end_tag.len();
                        continue;
                    }
                }
            }
            cleaned.push(bytes[i] as char);
            i += 1;
        }

        // Now strip remaining HTML tags
        let mut result = String::new();
        let mut in_tag = false;

        for ch in cleaned.chars() {
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

        // Collapse excessive whitespace
        let mut collapsed = String::new();
        let mut prev_ws = false;
        for ch in result.chars() {
            if ch.is_whitespace() {
                if !prev_ws {
                    collapsed.push(if ch == '\n' { '\n' } else { ' ' });
                }
                prev_ws = true;
            } else {
                collapsed.push(ch);
                prev_ws = false;
            }
        }

        collapsed.trim().to_string()
    }

    /// Extract the first address from an Address enum
    fn extract_first_address(address: Option<&mail_parser::Address>) -> (String, String) {
        match address {
            Some(mail_parser::Address::List(addrs)) if !addrs.is_empty() => {
                let addr = &addrs[0];
                let name = addr.name().unwrap_or("").to_string();
                let email = addr.address().unwrap_or("unknown@unknown").to_string();
                if name.is_empty() {
                    // Use the local part of the email as fallback name
                    let fallback = email.split('@').next().unwrap_or("Unknown").to_string();
                    (fallback, email)
                } else {
                    (name, email)
                }
            }
            Some(mail_parser::Address::Group(groups)) if !groups.is_empty() => {
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
                if list.is_empty() {
                    None
                } else {
                    Some(list)
                }
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
                if list.is_empty() {
                    None
                } else {
                    Some(list)
                }
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
#[path = "../test/imap_client_tests.rs"]
mod imap_client_tests;
