# Windows通知系统测试指南

## 📋 测试前准备

### 1. 环境检查
```bash
# 检查Node.js版本
node --version  # 应该 >= 18

# 检查Rust版本
rustc --version  # 应该 >= 1.70

# 检查Tauri CLI
npm run tauri --version
```

### 2. 安装依赖
```bash
# 安装前端依赖
npm install

# 安装后端依赖（自动）
cd src-tauri
cargo fetch
cd ..
```

---

## 🚀 测试步骤

### 步骤1: 运行单元测试

#### Rust后端测试
```bash
# 运行所有Rust测试
cd src-tauri
cargo test

# 运行通知相关测试
cargo test notification

# 运行Windows通知测试
cargo test windows_notification

# 预期结果：
# test result: ok. XX passed; 0 failed
```

#### TypeScript前端测试
```bash
# 运行所有前端测试
npm test

# 运行通知桥接测试
npx vitest run tests/notificationBridge.test.ts

# 预期结果：
# ✓ notificationBridge (6)
# Test Files  1 passed (1)
# Tests       6 passed (6)
```

---

### 步骤2: 类型检查

```bash
# TypeScript类型检查
npm run check

# 预期结果：
# COMPLETED XXXX FILES 0 ERRORS 0 WARNINGS
```

---

### 步骤3: 启动开发环境

```bash
# 启动Tauri开发模式（自动编译前后端）
npm run tauri dev

# 预期结果：
# - 前端Vite服务器启动
# - Tauri窗口自动打开
# - 后台编译成功，无错误
```

---

### 步骤4: 手动功能测试

#### 4.1 测试通知设置页面

1. **打开设置页面**
   - 点击应用菜单 → Settings
   - 或直接访问路由: `/settings/notifications`

2. **验证UI显示**
   - ✓ 看到"Notifications"标题
   - ✓ 看到"Enable Notifications"开关
   - ✓ 看到"New Mail"、"Send Status"、"Sync Errors"开关
   - ✓ 看到"Sound"开关
   - ✓ 看到"Quiet Hours"部分
   - ✓ 看到"Advanced"部分

3. **测试开关功能**
   - 切换"Enable Notifications"开关
   - 切换"New Mail"开关
   - 切换"Sound"开关
   - 启用"Quiet Hours"
   - 调整开始/结束时间

4. **验证数据持久化**
   - 修改设置后关闭应用
   - 重新打开应用
   - 检查设置是否保存

#### 4.2 测试通知功能

**方式A: 使用Tauri DevTools**

1. **打开DevTools**
   - 在应用中按 `Ctrl+Shift+I` (Windows) 或 `Cmd+Option+I` (Mac)

2. **在Console中执行**
   ```javascript
   // 测试显示通知
   await window.__TAURI_INVOKE__('show_notification', {
     request: {
       account_id: 1,
       mail_id: 123,
       notification_type: "NewMail",
       title: "测试通知",
       body: "这是一封新邮件",
       priority: 1,  // Normal
       actions: [],
       timeout: null
     }
   });

   // 测试获取偏好设置
   await window.__TAURI_INVOKE__('get_notification_preferences');

   // 测试设置偏好
   await window.__TAURI_INVOKE__('set_notification_preferences', {
     prefs: {
       enabled: true,
       new_mail: true,
       send_status: true,
       sync_errors: true,
       sound_enabled: true,
       quiet_hours: {
         enabled: false,
         start: "22:00",
         end: "08:00"
       },
       focus_assist_respect: true
     }
   });
   ```

**方式B: 测试真实通知场景**

1. **触发新邮件通知**
   - 添加一个邮件账户
   - 等待同步或手动同步
   - 检查Windows通知中心是否显示通知

2. **验证通知内容**
   - ✓ 通知标题显示发件人
   - ✓ 通知正文显示邮件主题
   - ✓ 通知显示应用图标

3. **测试速率限制**
   - 快速发送多封邮件（10+封）
   - 验证只显示部分通知（速率限制生效）

#### 4.3 测试Windows通知中心

1. **打开Windows通知中心**
   - 点击任务栏右下角的通知图标
   - 或按 `Win + A`

2. **验证通知历史**
   - ✓ 看到应用发送的通知
   - ✓ 通知按时间排序
   - ✓ 通知包含正确的标题和内容

3. **测试通知操作**
   - 点击通知（应该打开应用）
   - 关闭通知（点击X按钮）
   - 清除所有通知

---

### 步骤5: 测试边界情况

#### 5.1 测试全局开关
```javascript
// 禁用全局通知
await window.__TAURI_INVOKE__('set_notification_preferences', {
  prefs: { enabled: false, ... }
});

// 尝试发送通知（应该不显示）
await window.__TAURI_INVOKE__('show_notification', { ... });
```

#### 5.2 测试分类开关
```javascript
// 禁用新邮件通知
await window.__TAURI_INVOKE__('set_notification_preferences', {
  prefs: {
    enabled: true,
    new_mail: false,  // 关键
    ...
  }
});

// 发送新邮件通知（应该不显示）
```

#### 5.3 测试勿扰模式
```javascript
// 启用勿扰时间段
await window.__TAURI_INVOKE__('set_notification_preferences', {
  prefs: {
    quiet_hours: {
      enabled: true,
      start: "00:00",  // 当前时间之前
      end: "23:59"     // 当前时间之后
    }
  }
});

// 发送通知（可能被阻止，取决于Focus Assist实现）
```

---

### 步骤6: 性能测试

#### 6.1 测试并发通知
```javascript
// 快速发送100个通知
for (let i = 0; i < 100; i++) {
  await window.__TAURI_INVOKE__('show_notification', {
    request: {
      account_id: i % 10,
      notification_type: "System",
      title: `通知 ${i}`,
      body: "测试",
      priority: i % 4,
      actions: [],
      timeout: null
    }
  });
}

// 验证：
// ✓ 应用不崩溃
// ✓ 只显示部分通知（速率限制）
// ✓ UI保持响应
```

#### 6.2 测试内存泄漏
```bash
# 启动应用
npm run tauri dev

# 打开Windows任务管理器
# 观察应用内存使用

# 发送1000个通知（使用循环）
# 观察内存是否持续增长

# 预期：内存保持稳定，无持续增长
```

---

## 🔧 调试技巧

### 查看Rust日志
```bash
# Windows日志位置
%APPDATA%\mailx\logs\

# 或在开发模式下查看终端输出
npm run tauri dev
# 所有println!会显示在终端
```

### 查看前端日志
```javascript
// 在DevTools Console中
console.log('Notification prefs:', $notificationStore);

// 或使用Tauri API
import { invoke } from '@tauri-apps/api/core';
const prefs = await invoke('get_notification_preferences');
console.log(prefs);
```

### 启用详细日志
```rust
// 在src-tauri/src/main.rs中
#[cfg(debug_assertions)]
{
    console_error_panic_hook::set();
}
```

---

## ✅ 测试清单

### 功能测试
- [ ] 通知设置页面正常显示
- [ ] 所有开关可以切换
- [ ] 设置保存并持久化
- [ ] 新邮件通知显示
- [ ] 通知标题和内容正确
- [ ] 速率限制生效
- [ ] 全局开关工作
- [ ] 分类开关工作
- [ ] 勿扰时间设置保存

### 边界测试
- [ ] 禁用所有通知后不显示
- [ ] 快速发送多个通知被限制
- [ ] 并发100个通知不崩溃
- [ ] 内存无泄漏
- [ ] 应用关闭重启后设置保留

### UI测试
- [ ] 深色模式正常
- [ ] 浅色模式正常
- [ ] 窗口缩放正常
- [ ] 10种语言UI显示正常

### 性能测试
- [ ] 通知延迟 < 2秒
- [ ] UI响应流畅
- [ ] CPU占用正常
- [ ] 内存占用正常

---

## 🐛 常见问题

### 问题1: 通知不显示
**可能原因**:
- Windows通知权限未开启
- 全局开关被禁用
- 速率限制生效

**解决方案**:
```bash
# 1. 检查Windows通知设置
# 设置 → 系统 → 通知和操作 → mailx → 允许通知

# 2. 检查应用内设置
# Settings → Notifications → Enable Notifications

# 3. 重置速率限制器
# 在DevTools中执行：
await window.__TAURI_INVOKE__('close_all_notifications');
```

### 问题2: 编译错误
```bash
# 清理并重新构建
rm -rf node_modules src-tauri/target
npm install
npm run tauri build
```

### 问题3: 测试失败
```bash
# 更新依赖
npm update
cd src-tauri
cargo update

# 重新运行测试
cargo clean
cargo test
```

---

## 📊 测试报告模板

```markdown
# 测试报告

**测试日期**: 2026-03-22
**测试环境**: Windows 11
**应用版本**: 0.1.0

## 功能测试结果
- 通知设置页面: ✅ 通过
- 通知显示: ✅ 通过
- 速率限制: ✅ 通过
- 全局开关: ✅ 通过
- 分类开关: ✅ 通过
- 勿扰模式: ⚠️ 部分通过（Focus Assist未实现）

## 性能测试结果
- 通知延迟: 1.2秒 ✅
- 内存占用: 45MB ✅
- CPU占用: 2% ✅

## 发现的问题
1. Focus Assist检测未实现
2. 通知按钮点击无响应

## 建议
1. 实现Focus Assist API调用
2. 添加通知按钮事件处理
```

---

## 🎯 快速测试命令

```bash
# 一键运行所有测试
npm run test && cd src-tauri && cargo test

# 一键启动开发环境
npm run tauri dev

# 一键类型检查
npm run check

# 一键构建生产版本
npm run tauri build
```

---

**最后更新**: 2026-03-22
**测试负责人**: [Your Name]
**文档版本**: 1.0
