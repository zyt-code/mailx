use super::*;
use crate::accounts::SmtpConfig;
use crate::database::{Attachment, EmailAddress, Mail};
use tempfile::NamedTempFile;

#[test]
fn test_generate_message_id() {
    let id1 = SmtpClient::generate_message_id("test@example.com");
    let id2 = SmtpClient::generate_message_id("test@example.com");
    let id3 = SmtpClient::generate_message_id("other@example.com");

    assert_ne!(id1, id2);
    assert!(!id1.is_empty());
    assert!(!id3.is_empty());
}

fn test_client() -> SmtpClient {
    SmtpClient::new(
        SmtpConfig {
            server: "smtp.example.com".to_string(),
            port: 587,
            use_ssl: true,
        },
        "sender@example.com".to_string(),
        "password".to_string(),
    )
}

fn test_mail() -> Mail {
    Mail {
        id: "mail-1".to_string(),
        uid: None,
        from_name: "Sender".to_string(),
        from_email: "sender@example.com".to_string(),
        subject: "HTML message".to_string(),
        preview: "Hello world".to_string(),
        body: "Hello world".to_string(),
        timestamp: 0,
        folder: "drafts".to_string(),
        unread: false,
        is_read: true,
        account_id: Some("acc-1".to_string()),
        to: Some(vec![EmailAddress {
            name: "Recipient".to_string(),
            email: "recipient@example.com".to_string(),
        }]),
        cc: None,
        bcc: None,
        html_body: Some("<p>Hello <strong>world</strong></p>".to_string()),
        reply_to: None,
        attachments: None,
        starred: None,
        has_attachments: Some(false),
        remote_uid_validity: None,
        content_state: "body_cached".to_string(),
    }
}

#[test]
fn test_build_email_message_uses_multipart_alternative_for_html_body() {
    let client = test_client();
    let mail = test_mail();

    let message = client.build_email_message(&mail, &[]).unwrap();
    let formatted = String::from_utf8(message.formatted()).unwrap();

    assert!(formatted.contains("multipart/alternative"));
    assert!(formatted.contains("Content-Type: text/plain"));
    assert!(formatted.contains("Content-Type: text/html"));
    assert!(formatted.contains("Hello world"));
    assert!(formatted.contains("<p>Hello <strong>world</strong></p>"));
}

#[test]
fn test_build_email_message_wraps_html_and_attachments_in_multipart_mixed() {
    let client = test_client();
    let mail = test_mail();
    let temp_file = NamedTempFile::new().unwrap();
    std::fs::write(temp_file.path(), b"attachment content").unwrap();

    let attachments = vec![Attachment {
        id: "attachment-1".to_string(),
        mail_id: mail.id.clone(),
        file_name: "notes.txt".to_string(),
        content_type: "text/plain".to_string(),
        size: 18,
        stored_path: temp_file.path().to_string_lossy().to_string(),
        created_at: 0,
    }];

    let message = client.build_email_message(&mail, &attachments).unwrap();
    let formatted = String::from_utf8(message.formatted()).unwrap();

    assert!(formatted.contains("multipart/mixed"));
    assert!(formatted.contains("multipart/alternative"));
    assert!(formatted.contains("notes.txt"));
    assert!(formatted.contains("<p>Hello <strong>world</strong></p>"));
}

#[test]
fn test_build_email_message_derives_plain_text_from_html_when_body_is_empty() {
    let client = test_client();
    let mut mail = test_mail();
    mail.body.clear();
    mail.html_body =
        Some("<div>Hello</div><div>Second line</div><ul><li>Bullet item</li></ul>".to_string());

    let message = client.build_email_message(&mail, &[]).unwrap();
    let formatted = String::from_utf8(message.formatted())
        .unwrap()
        .replace("\r\n", "\n");

    assert!(formatted.contains("Content-Type: text/plain"));
    assert!(formatted.contains("Hello\nSecond line\n- Bullet item"));
}

#[test]
fn test_connection_attempt_modes_prioritize_implicit_tls_on_port_465() {
    let client = SmtpClient::new(
        SmtpConfig {
            server: "smtp.163.com".to_string(),
            port: 465,
            use_ssl: true,
        },
        "sender@example.com".to_string(),
        "password".to_string(),
    );

    assert_eq!(
        client.connection_attempt_modes(),
        vec![
            TransportSecurityMode::ImplicitTls,
            TransportSecurityMode::StartTls,
            TransportSecurityMode::Plain,
        ]
    );
}

#[test]
fn test_connection_attempt_modes_fallback_from_plain_to_starttls_on_port_587() {
    let client = SmtpClient::new(
        SmtpConfig {
            server: "smtp.example.com".to_string(),
            port: 587,
            use_ssl: false,
        },
        "sender@example.com".to_string(),
        "password".to_string(),
    );

    assert_eq!(
        client.connection_attempt_modes(),
        vec![
            TransportSecurityMode::Plain,
            TransportSecurityMode::StartTls,
            TransportSecurityMode::ImplicitTls,
        ]
    );
}

#[test]
fn test_retryable_transport_error_detects_protocol_mismatch_messages() {
    assert!(SmtpClient::is_retryable_transport_error(
        "Failed to send email via STARTTLS on smtp.example.com:587: response error: incomplete response"
    ));
    assert!(SmtpClient::is_retryable_transport_error(
        "Connection test failed via STARTTLS on smtp.example.com:587: STARTTLS is not supported on this server"
    ));
    assert!(!SmtpClient::is_retryable_transport_error(
        "Failed to send email via implicit TLS on smtp.example.com:465: authentication failed"
    ));
}
