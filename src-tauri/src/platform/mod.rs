#[cfg(windows)]
pub mod windows_notification;

use crate::notification_manager::{NotificationFacade, MockFacade};
use std::sync::Arc;

/// 创建平台特定的通知实现
pub fn create_notification_facade(app_id: String) -> Arc<dyn NotificationFacade> {
    #[cfg(windows)]
    {
        match windows_notification::WindowsNotification::new(app_id) {
            Ok(notif) => {
                println!("Using Windows native notifications");
                return Arc::new(notif);
            }
            Err(e) => {
                eprintln!("Failed to create Windows notification: {}, using fallback", e);
                // 降级到fallback
            }
        }
    }
    
    #[cfg(not(windows))]
    {
        println!("Notifications not supported on this platform");
    }
    
    // Fallback: 使用Mock实现
    Arc::new(MockFacade::new())
}
