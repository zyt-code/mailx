#![allow(dead_code)]

use serde::{Deserialize, Serialize};
use std::collections::BinaryHeap;
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::Mutex;
use chrono::{DateTime, Utc};

/// 通知类型枚举
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum NotificationType {
    /// 新邮件通知
    NewMail { mail_id: i64, folder: String },
    /// 发送成功
    SendSuccess { mail_id: i64 },
    /// 发送失败
    SendError { error: String },
    /// 同步进度
    SyncProgress { account_id: i64, progress: u8 },
    /// 同步错误
    SyncError { account_id: i64, error: String },
    /// 系统通知
    System(String),
}

impl PartialEq for NotificationType {
    fn eq(&self, other: &Self) -> bool {
        match (self, other) {
            (NotificationType::NewMail { .. }, NotificationType::NewMail { .. }) => true,
            (NotificationType::SendSuccess { .. }, NotificationType::SendSuccess { .. }) => true,
            (NotificationType::SendError { .. }, NotificationType::SendError { .. }) => true,
            (NotificationType::SyncProgress { .. }, NotificationType::SyncProgress { .. }) => true,
            (NotificationType::SyncError { .. }, NotificationType::SyncError { .. }) => true,
            (NotificationType::System(_), NotificationType::System(_)) => true,
            _ => false,
        }
    }
}

/// 通知请求
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NotificationRequest {
    /// 账户ID
    pub account_id: i64,
    /// 关联邮件ID（可选）
    pub mail_id: Option<i64>,
    /// 通知类型
    pub notification_type: NotificationType,
    /// 通知标题
    pub title: String,
    /// 通知正文
    pub body: String,
    /// 通知优先级
    pub priority: NotificationPriority,
    /// 交互按钮
    pub actions: Vec<NotificationAction>,
    /// 超时时间（秒）
    pub timeout: Option<u64>,
}

/// 通知按钮
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NotificationAction {
    /// 按钮ID
    pub id: String,
    /// 按钮标签
    pub label: String,
    /// 按钮载荷
    pub payload: serde_json::Value,
}

/// 通知优先级
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
pub enum NotificationPriority {
    /// 低优先级
    Low = 0,
    /// 普通优先级
    Normal = 1,
    /// 高优先级
    High = 2,
    /// 紧急
    Urgent = 3,
}

/// 带优先级和时间戳的通知包装器
#[derive(Debug, Clone)]
struct PrioritizedNotification {
    request: NotificationRequest,
    timestamp: i64,
}

impl PartialEq for PrioritizedNotification {
    fn eq(&self, other: &Self) -> bool {
        self.request.priority == other.request.priority
            && self.timestamp == other.timestamp
    }
}

impl Eq for PrioritizedNotification {}

impl PartialOrd for PrioritizedNotification {
    fn partial_cmp(&self, other: &Self) -> Option<std::cmp::Ordering> {
        Some(self.cmp(other))
    }
}

impl Ord for PrioritizedNotification {
    fn cmp(&self, other: &Self) -> std::cmp::Ordering {
        // 反向排序：高优先级先出
        other
            .request
            .priority
            .cmp(&self.request.priority)
            .then_with(|| self.timestamp.cmp(&other.timestamp))
    }
}

/// 平台通知抽象接口
#[async_trait::async_trait]
pub trait NotificationFacade: Send + Sync {
    /// 显示通知
    async fn show(&self, request: &NotificationRequest)
        -> Result<(), Box<dyn std::error::Error>>;
    /// 关闭指定通知
    async fn close(&self, id: &str) -> Result<(), Box<dyn std::error::Error>>;
    /// 关闭所有通知
    async fn close_all(&self) -> Result<(), Box<dyn std::error::Error>>;
}

/// Mock实现（用于测试和开发）
pub struct MockFacade {
    /// 记录所有通知（用于测试断言）
    pub notifications: Arc<Mutex<Vec<NotificationRequest>>>,
}

impl MockFacade {
    pub fn new() -> Self {
        Self {
            notifications: Arc::new(Mutex::new(Vec::new())),
        }
    }

    /// 获取所有通知记录
    pub async fn get_notifications(&self) -> Vec<NotificationRequest> {
        self.notifications.lock().await.clone()
    }

    /// 清空通知历史
    pub async fn clear(&self) {
        self.notifications.lock().await.clear()
    }

    /// 获取通知数量
    pub async fn count(&self) -> usize {
        self.notifications.lock().await.len()
    }
}

impl Default for MockFacade {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait::async_trait]
impl NotificationFacade for MockFacade {
    async fn show(&self, request: &NotificationRequest) -> Result<(), Box<dyn std::error::Error>> {
        println!(
            "[MOCK Notification] {} - {}",
            request.title, request.body
        );
        self.notifications.lock().await.push(request.clone());
        Ok(())
    }

    async fn close(&self, id: &str) -> Result<(), Box<dyn std::error::Error>> {
        println!("[MOCK Notification] Closed: {}", id);
        Ok(())
    }

    async fn close_all(&self) -> Result<(), Box<dyn std::error::Error>> {
        println!("[MOCK Notification] Closed all");
        self.clear().await;
        Ok(())
    }
}

/// 速率限制器
struct RateLimiter {
    /// 时间窗口
    window: Duration,
    /// 窗口内最大数量
    max_count: usize,
    /// 历史记录
    history: Arc<Mutex<Vec<DateTime<Utc>>>>,
}

impl RateLimiter {
    fn new(window: Duration, max_count: usize) -> Self {
        Self {
            window,
            max_count,
            history: Arc::new(Mutex::new(Vec::new())),
        }
    }

    /// 检查是否允许发送通知
    async fn check(&self, _notification_type: &NotificationType) -> bool {
        let mut history = self.history.lock().await;
        let now = Utc::now();

        // 清理过期记录
        history.retain(|&ts| {
            now.signed_duration_since(ts)
                < chrono::Duration::from_std(self.window).unwrap()
        });

        // 检查是否超限
        if history.len() >= self.max_count {
            return false;
        }

        history.push(now);
        true
    }

    /// 重置速率限制器
    async fn reset(&self) {
        self.history.lock().await.clear();
    }
}

/// 勿扰时间段
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QuietHours {
    /// 是否启用
    pub enabled: bool,
    /// 开始时间（HH:MM格式）
    pub start: String,
    /// 结束时间（HH:MM格式）
    pub end: String,
}

/// 通知偏好设置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NotificationPreferences {
    /// 全局开关
    pub enabled: bool,
    /// 新邮件通知
    pub new_mail: bool,
    /// 发送状态通知
    pub send_status: bool,
    /// 同步错误通知
    pub sync_errors: bool,
    /// 声音开关
    pub sound_enabled: bool,
    /// 勿扰时间段
    pub quiet_hours: QuietHours,
    /// 尊重Focus Assist
    pub focus_assist_respect: bool,
}

impl Default for NotificationPreferences {
    fn default() -> Self {
        Self {
            enabled: true,
            new_mail: true,
            send_status: true,
            sync_errors: true,
            sound_enabled: true,
            quiet_hours: QuietHours {
                enabled: false,
                start: "22:00".to_string(),
                end: "08:00".to_string(),
            },
            focus_assist_respect: true,
        }
    }
}

/// 通知管理器
pub struct NotificationManager {
    /// 平台通知实现
    facade: Arc<dyn NotificationFacade>,
    /// 优先级队列
    queue: Arc<Mutex<BinaryHeap<PrioritizedNotification>>>,
    /// 速率限制器
    rate_limiter: Arc<Mutex<RateLimiter>>,
    /// 偏好设置
    preferences: Arc<Mutex<NotificationPreferences>>,
}

impl NotificationManager {
    /// 创建新的通知管理器
    pub fn new(facade: Arc<dyn NotificationFacade>) -> Self {
        Self {
            facade,
            queue: Arc::new(Mutex::new(BinaryHeap::new())),
            rate_limiter: Arc::new(Mutex::new(RateLimiter::new(
                Duration::from_secs(5),
                3,
            ))),
            preferences: Arc::new(Mutex::new(NotificationPreferences::default())),
        }
    }

    /// 显示通知
    pub async fn show(&self, request: NotificationRequest) -> Result<(), String> {
        // 1. 检查全局开关
        let prefs = self.preferences.lock().await;
        if !prefs.enabled {
            return Ok(());
        }

        // 2. 检查分类开关
        match &request.notification_type {
            NotificationType::NewMail { .. } if !prefs.new_mail => return Ok(()),
            NotificationType::SendSuccess { .. } | NotificationType::SendError { .. }
                if !prefs.send_status => return Ok(()),
            NotificationType::SyncError { .. } if !prefs.sync_errors => return Ok(()),
            _ => {}
        };
        drop(prefs);

        // 3. 检查Focus Assist
        if self.is_focus_assist_active().await {
            return Ok(());
        }

        // 4. 速率限制检查
        {
            let limiter = self.rate_limiter.lock().await;
            if !limiter.check(&request.notification_type).await {
                return Err("Rate limit exceeded".to_string());
            }
        }

        // 5. 添加到优先级队列
        {
            let mut queue = self.queue.lock().await;
            queue.push(PrioritizedNotification {
                request,
                timestamp: Utc::now().timestamp_millis(),
            });
        }

        // 6. 处理队列
        self.process_queue().await
    }

    /// 处理通知队列
    async fn process_queue(&self) -> Result<(), String> {
        while let Some(prioritized) = self.queue.lock().await.pop() {
            let facade = Arc::clone(&self.facade);
            tokio::spawn(async move {
                if let Err(e) = facade.show(&prioritized.request).await {
                    eprintln!("[NotificationManager] Failed to show: {}", e);
                }
            });
        }
        Ok(())
    }

    /// 检查Focus Assist是否激活
    pub async fn is_focus_assist_active(&self) -> bool {
        // TODO: P8-2将实现Windows API检测
        false
    }

    /// 设置通知偏好
    pub async fn set_preferences(&self, prefs: NotificationPreferences) {
        *self.preferences.lock().await = prefs;
    }

    /// 获取通知偏好
    pub async fn get_preferences(&self) -> NotificationPreferences {
        self.preferences.lock().await.clone()
    }

    /// 关闭所有通知
    pub async fn close_all(&self) -> Result<(), String> {
        self.facade.close_all().await.map_err(|e| e.to_string())
    }

    /// 重置速率限制器（用于测试）
    pub async fn reset_rate_limiter(&self) {
        self.rate_limiter.lock().await.reset().await;
    }
}

// 确保线程安全
unsafe impl Send for NotificationManager {}
unsafe impl Sync for NotificationManager {}

#[cfg(test)]
#[path = "../test/notification_manager_tests.rs"]
mod notification_manager_tests;
