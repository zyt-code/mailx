use super::*;

#[test]
fn test_generate_message_id() {
    let id1 = SmtpClient::generate_message_id("test@example.com");
    let id2 = SmtpClient::generate_message_id("test@example.com");
    let id3 = SmtpClient::generate_message_id("other@example.com");

    assert_ne!(id1, id2);
    assert!(!id1.is_empty());
    assert!(!id3.is_empty());
}
