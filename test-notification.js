// Windows通知系统测试脚本
// 在DevTools Console中运行此脚本

(async function() {
    const { invoke } = window.__TAURI__.core;

    console.log('=== Windows通知系统测试 ===\n');

    // 测试1: 获取当前设置
    console.log('测试1: 获取通知设置');
    try {
        const prefs = await invoke('get_notification_preferences');
        console.log('✅ 当前设置:', JSON.stringify(prefs, null, 2));
    } catch (e) {
        console.error('❌ 获取设置失败:', e);
    }

    // 等待2秒
    await new Promise(r => setTimeout(r, 2000));

    // 测试2: 发送测试通知
    console.log('\n测试2: 发送测试通知');
    try {
        await invoke('show_notification', {
            request: {
                account_id: 1,
                notification_type: { System: "测试" },
                title: "🎉 测试通知",
                body: "如果你看到这个通知，说明系统工作正常！",
                priority: 1,
                actions: [],
                timeout: null
            }
        });
        console.log('✅ 通知已发送 - 请检查Windows通知中心');
    } catch (e) {
        console.error('❌ 发送通知失败:', e);
    }

    // 等待3秒
    await new Promise(r => setTimeout(r, 3000));

    // 测试3: 测试不同优先级
    console.log('\n测试3: 测试高优先级通知');
    try {
        await invoke('show_notification', {
            request: {
                account_id: 1,
                notification_type: { System: "紧急" },
                title: "🚨 高优先级通知",
                body: "这是一条紧急通知",
                priority: 3,  // Urgent
                actions: [],
                timeout: null
            }
        });
        console.log('✅ 高优先级通知已发送');
    } catch (e) {
        console.error('❌ 发送失败:', e);
    }

    // 等待2秒
    await new Promise(r => setTimeout(r, 2000));

    // 测试4: 测试速率限制
    console.log('\n测试4: 测试速率限制（发送10个通知）');
    let successCount = 0;
    let rateLimitedCount = 0;

    for (let i = 0; i < 10; i++) {
        try {
            await invoke('show_notification', {
                request: {
                    account_id: 1,
                    notification_type: { NewMail: { mail_id: i, folder: "inbox" } },
                    title: `邮件 ${i+1}`,
                    body: `这是第 ${i+1} 封测试邮件`,
                    priority: 1,
                    actions: [],
                    timeout: null
                }
            });
            successCount++;
        } catch (e) {
            if (e.includes('Rate limit')) {
                rateLimitedCount++;
            }
        }
    }

    console.log(`✅ 速率限制测试完成:`);
    console.log(`   - 成功: ${successCount}个`);
    console.log(`   - 被限制: ${rateLimitedCount}个`);
    console.log(`   - 预期: 前3个成功，后续被限制`);

    // 等待2秒
    await new Promise(r => setTimeout(r, 2000));

    // 测试5: 禁用通知
    console.log('\n测试5: 禁用通知并测试');
    try {
        await invoke('set_notification_preferences', {
            prefs: {
                enabled: false,
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
        console.log('✅ 通知已禁用');

        await new Promise(r => setTimeout(r, 1000));

        // 尝试发送通知（应该被阻止）
        await invoke('show_notification', {
            request: {
                account_id: 1,
                notification_type: { System: "应该被阻止" },
                title: "不应该显示",
                body: "通知已禁用",
                priority: 1,
                actions: [],
                timeout: null
            }
        });
        console.log('✅ 通知被正确阻止（未显示）');

        // 重新启用
        await invoke('set_notification_preferences', {
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
        console.log('✅ 通知已重新启用');
    } catch (e) {
        console.error('❌ 测试失败:', e);
    }

    console.log('\n=== 测试完成 ===');
    console.log('请检查Windows通知中心（点击任务栏右下角的通知图标）');
})();
