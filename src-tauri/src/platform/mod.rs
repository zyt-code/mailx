#[cfg(windows)]
pub mod windows_notification;

use crate::notification_manager::{NotificationFacade, MockFacade};
use std::sync::Arc;

/// 创建平台特定的通知实现
pub fn create_notification_facade(app_id: String) -> Arc<dyn NotificationFacade> {
    #[cfg(windows)]
    {
        println!("[Notification] Attempting to create Windows notification facade with app_id: {}", app_id);

        match windows_notification::WindowsNotification::new(app_id) {
            Ok(notif) => {
                println!("[Notification] ✅ Successfully created Windows native notification facade");
                return Arc::new(notif);
            }
            Err(e) => {
                eprintln!("[Notification] ❌ Failed to create Windows notification: {:?}", e);
                eprintln!("[Notification] Falling back to Mock facade");
                // 降级到fallback
            }
        }
    }

    #[cfg(not(windows))]
    {
        println!("[Notification] Platform not Windows, using Mock facade");
    }

    // Fallback: 使用Mock实现
    println!("[Notification] Using Mock facade (notifications will only print to console)");
    Arc::new(MockFacade::new())
}
