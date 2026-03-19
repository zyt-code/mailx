use super::*;

#[test]
fn test_sanitization_removes_scripts() {
    let html = "<p>Hello</p><script>alert('xss')</script>";
    let sanitized = sanitize_html(html);
    assert!(!sanitized.contains("<script>"));
    assert!(sanitized.contains("<p>Hello</p>"));
}

#[test]
fn test_sanitization_removes_event_handlers() {
    let html = r#"<div onclick=\"alert('xss')\">Click me</div>"#;
    let sanitized = sanitize_html(html);
    assert!(!sanitized.contains("onclick"));
}

#[test]
fn test_sanitization_allows_safe_html() {
    let html = "<p><strong>Hello</strong> <em>world</em></p>";
    let sanitized = sanitize_html(html);
    assert!(sanitized.contains("<strong>Hello</strong>"));
    assert!(sanitized.contains("<em>world</em>"));
}

#[test]
fn test_text_to_html_preserves_breaks() {
    let text = "Line 1\nLine 2\n\nLine 3";
    let html = text_to_html(text);
    assert!(html.contains("<br>"));
    assert!(html.contains("</p><p>"));
}
