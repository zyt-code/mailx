#![allow(dead_code)]

use crate::notification_manager::{
    NotificationFacade, NotificationPriority, NotificationRequest,
};
use windows::core::*;
use windows::Data::Xml::Dom::*;
use windows::UI::Notifications::*;

/// Windows原生通知实现
pub struct WindowsNotification {
    app_id: String,
}

impl WindowsNotification {
    pub fn new(app_id: String) -> std::result::Result<Self, Box<dyn std::error::Error>> {
        Ok(Self {
            app_id,
        })
    }

    /// 构建Toast XML模板
    fn build_toast_xml(&self, request: &NotificationRequest) -> std::result::Result<String, Box<dyn std::error::Error>> {
        // 使用ToastGeneric模板支持自定义布局
        let template = r#"
<toast>
    <visual>
        <binding template='ToastGeneric'>
            <text id='1'>{title}</text>
            <text id='2' placement='content'>{body}</text>
        </binding>
    </visual>
    {actions}
    {audio}
</toast>"#;

        // 构建按钮
        let actions_xml = if request.actions.is_empty() {
            String::new()
        } else {
            let mut actions = "<actions>".to_string();
            for action in &request.actions {
                let payload_str = serde_json::to_string(&action.payload)
                    .unwrap_or_else(|_| "".to_string());
                actions.push_str(&format!(
                    r#"
    <action content='{label}' activationType='protocol' arguments='{payload}'/>"#,
                    label = xml_escape(&action.label),
                    payload = xml_escape(&payload_str)
                ));
            }
            actions.push_str("</actions>");
            actions
        };

        // 构建声音
        let audio_xml = if matches!(request.priority, NotificationPriority::Urgent) {
            r#"<audio src='ms-winsoundevent:Notification.Looping.Alarm' loop='true'/>"#
        } else {
            r#"<audio src='ms-winsoundevent:Notification.Default'/>"#
        };

        let xml = template
            .replace("{title}", &xml_escape(&request.title))
            .replace("{body}", &xml_escape(&request.body))
            .replace("{actions}", &actions_xml)
            .replace("{audio}", audio_xml);

        Ok(xml)
    }
}

#[async_trait::async_trait]
impl NotificationFacade for WindowsNotification {
    async fn show(&self, request: &NotificationRequest) -> std::result::Result<(), Box<dyn std::error::Error>> {
        println!("[WindowsNotification] 🔔 Preparing to show notification: {}", request.title);

        // 构建Toast XML
        let xml_str = self.build_toast_xml(request)?;
        println!("[WindowsNotification] 📄 Toast XML generated (length: {})", xml_str.len());

        // 创建XML文档
        let xml_doc = XmlDocument::new()?;
        xml_doc.LoadXml(&HSTRING::from(xml_str))?;
        println!("[WindowsNotification] ✅ XML document loaded");

        // 创建Toast通知管理器
        let notifier = ToastNotificationManager::CreateToastNotifierWithId(&HSTRING::from(&self.app_id))
            .map_err(|e| Box::new(e) as Box<dyn std::error::Error>)?;
        println!("[WindowsNotification] ✅ ToastNotifier created for app_id: {}", self.app_id);

        // 创建ToastNotification
        let toast = ToastNotification::CreateToastNotification(&xml_doc)
            .map_err(|e| Box::new(e) as Box<dyn std::error::Error>)?;
        println!("[WindowsNotification] ✅ ToastNotification created");

        // 显示通知
        println!("[WindowsNotification] 📢 Calling Show() on toast...");
        notifier.Show(&toast)
            .map_err(|e| Box::new(e) as Box<dyn std::error::Error>)?;
        println!("[WindowsNotification] ✅ Toast shown successfully! Check Windows notification center.");

        Ok(())
    }

    async fn close(&self, id: &str) -> std::result::Result<(), Box<dyn std::error::Error>> {
        // 通过ToastNotificationHistory关闭指定通知
        let history = ToastNotificationManager::History()
            .map_err(|e| Box::new(e) as Box<dyn std::error::Error>)?;
        let tag = HSTRING::from(id);
        history.Remove(&tag)
            .map_err(|e| Box::new(e) as Box<dyn std::error::Error>)?;
        Ok(())
    }

    async fn close_all(&self) -> std::result::Result<(), Box<dyn std::error::Error>> {
        let history = ToastNotificationManager::History()
            .map_err(|e| Box::new(e) as Box<dyn std::error::Error>)?;
        history.Clear()
            .map_err(|e| Box::new(e) as Box<dyn std::error::Error>)?;
        Ok(())
    }
}

/// XML转义辅助函数
fn xml_escape(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&apos;")
}

#[cfg(test)]
mod tests {
    use super::*;

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
}

#[cfg(test)]
#[path = "../../test/windows_notification_tests.rs"]
mod windows_notification_tests;
