#[cfg(test)]
mod tests {
    use crate::platform::windows_notification::*;

    #[test]
    fn test_xml_escape() {
        assert_eq!(
            xml_escape("test & < > \" '"),
            "test &amp; &lt; &gt; &quot; &apos;"
        );
    }

    #[test]
    fn test_xml_escape_empty() {
        assert_eq!(xml_escape(""), "");
    }

    #[test]
    fn test_xml_escape_no_special_chars() {
        assert_eq!(xml_escape("hello world"), "hello world");
    }

    #[test]
    fn test_xml_escape_multiple_special_chars() {
        assert_eq!(
            xml_escape("A&B <C> \"D\" 'E'"),
            "A&amp;B &lt;C&gt; &quot;D&quot; &apos;E&apos;"
        );
    }

    #[test]
    fn test_windows_notification_new() {
        let notif = WindowsNotification::new("com.mailx.app".to_string());
        assert!(notif.is_ok());

        let notif = notif.unwrap();
        assert_eq!(notif.app_id, "com.mailx.app");
    }

    #[test]
    fn test_build_toast_xml_basic() {
        let notif = WindowsNotification::new("com.mailx.app".to_string()).unwrap();
        let request = crate::notification_manager::NotificationRequest {
            account_id: 1,
            mail_id: None,
            notification_type: crate::notification_manager::NotificationType::System(
                "Test".to_string(),
            ),
            title: "Test Title".to_string(),
            body: "Test Body".to_string(),
            priority: crate::notification_manager::NotificationPriority::Normal,
            actions: vec![],
            timeout: None,
        };

        let xml = notif.build_toast_xml(&request);
        assert!(xml.is_ok());

        let xml_str = xml.unwrap();
        assert!(xml_str.contains("Test Title"));
        assert!(xml_str.contains("Test Body"));
        assert!(xml_str.contains("<toast>"));
        assert!(xml_str.contains("</toast>"));
    }

    #[test]
    fn test_build_toast_xml_with_actions() {
        let notif = WindowsNotification::new("com.mailx.app".to_string()).unwrap();
        let action = crate::notification_manager::NotificationAction {
            id: "action1".to_string(),
            label: "Click Me".to_string(),
            payload: serde_json::json!({"key": "value"}),
        };

        let request = crate::notification_manager::NotificationRequest {
            account_id: 1,
            mail_id: None,
            notification_type: crate::notification_manager::NotificationType::System(
                "Test".to_string(),
            ),
            title: "Test Title".to_string(),
            body: "Test Body".to_string(),
            priority: crate::notification_manager::NotificationPriority::Normal,
            actions: vec![action],
            timeout: None,
        };

        let xml = notif.build_toast_xml(&request);
        assert!(xml.is_ok());

        let xml_str = xml.unwrap();
        assert!(xml_str.contains("<actions>"));
        assert!(xml_str.contains("Click Me"));
        assert!(xml_str.contains("</actions>"));
    }

    #[test]
    fn test_build_toast_xml_urgent_priority() {
        let notif = WindowsNotification::new("com.mailx.app".to_string()).unwrap();
        let request = crate::notification_manager::NotificationRequest {
            account_id: 1,
            mail_id: None,
            notification_type: crate::notification_manager::NotificationType::System(
                "Test".to_string(),
            ),
            title: "Urgent Test".to_string(),
            body: "Urgent Body".to_string(),
            priority: crate::notification_manager::NotificationPriority::Urgent,
            actions: vec![],
            timeout: None,
        };

        let xml = notif.build_toast_xml(&request);
        assert!(xml.is_ok());

        let xml_str = xml.unwrap();
        assert!(xml_str.contains("Notification.Looping.Alarm"));
        assert!(xml_str.contains("loop='true'"));
    }

    #[test]
    fn test_xml_escaping_in_request() {
        let notif = WindowsNotification::new("com.mailx.app".to_string()).unwrap();
        let request = crate::notification_manager::NotificationRequest {
            account_id: 1,
            mail_id: None,
            notification_type: crate::notification_manager::NotificationType::System(
                "Test".to_string(),
            ),
            title: "Title with <tags> & \"quotes\"".to_string(),
            body: "Body with 'apostrophes' & <more>".to_string(),
            priority: crate::notification_manager::NotificationPriority::Normal,
            actions: vec![],
            timeout: None,
        };

        let xml = notif.build_toast_xml(&request);
        assert!(xml.is_ok());

        let xml_str = xml.unwrap();
        // Check that special characters are properly escaped
        assert!(xml_str.contains("&lt;tags&gt;"));
        assert!(xml_str.contains("&amp;"));
        assert!(xml_str.contains("&quot;"));
        assert!(xml_str.contains("&apos;"));
    }
}
