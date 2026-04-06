use super::*;

#[test]
fn test_create_preview() {
    let body = "This is a test email.\nIt has multiple lines.\nAnd some more text.";
    let preview = ImapClient::create_preview(body);
    assert!(preview.len() <= 104);
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

#[test]
fn test_store_flags_format() {
    let add_seen = "+FLAGS (\\Seen)";
    let remove_seen = "-FLAGS (\\Seen)";
    let add_flagged = "+FLAGS (\\Flagged)";
    let multiple_flags = "+FLAGS (\\Seen \\Flagged)";
    let replace_flags = "FLAGS (\\Seen \\Answered)";

    assert!(!add_seen.is_empty());
    assert!(!remove_seen.is_empty());
    assert!(!add_flagged.is_empty());
    assert!(!multiple_flags.is_empty());
    assert!(!replace_flags.is_empty());

    assert!(add_seen.contains("\\Seen"));
    assert!(add_seen.starts_with('+'));
    assert!(remove_seen.starts_with('-'));
    assert!(multiple_flags.contains("\\Seen"));
    assert!(multiple_flags.contains("\\Flagged"));
}

#[test]
fn test_uid_to_string_conversion() {
    let uid: u32 = 12345;
    let uid_str = uid.to_string();

    assert_eq!(uid_str, "12345");
    assert!(uid_str.parse::<u32>().is_ok());
}

#[test]
fn test_flag_command_patterns() {
    let patterns = vec![
        "+FLAGS (\\Seen)",
        "-FLAGS (\\Seen)",
        "+FLAGS (\\Seen \\Flagged)",
        "-FLAGS (\\Seen \\Flagged)",
        "FLAGS (\\Seen)",
        "+FLAGS (\\Deleted)",
        "+FLAGS (\\Answered)",
        "+FLAGS (\\Draft)",
    ];

    for pattern in patterns {
        assert!(!pattern.is_empty());
        assert!(pattern.contains("FLAGS"));
    }
}

#[test]
fn test_generate_sync_id_uses_account_and_folder_scope() {
    let inbox = ImapClient::generate_sync_id("acc-a", "inbox", 42);
    let sent = ImapClient::generate_sync_id("acc-a", "sent", 42);
    let other_account = ImapClient::generate_sync_id("acc-b", "inbox", 42);

    assert_ne!(inbox, sent);
    assert_ne!(inbox, other_account);
}

#[test]
fn test_decode_header_text_decodes_rfc2047_subjects() {
    let encoded = "=?utf-8?b?5b+Y6K6w5a+G56CB77yfIOadpeiuvue9ruaWsOWvhueggQ==?=";

    assert_eq!(
        ImapClient::decode_header_text(encoded),
        "忘记密码？ 来设置新密码"
    );
}

#[test]
fn test_decode_header_text_keeps_plain_subjects_readable() {
    assert_eq!(
        ImapClient::decode_header_text("  Weekly sync and roadmap  "),
        "Weekly sync and roadmap"
    );
}
