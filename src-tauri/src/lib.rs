mod accounts;
mod commands;
mod credentials;
mod database;
mod html_sanitize;
mod imap_client;
mod smtp_client;
mod sync_manager;

use accounts::AccountManager;
use credentials::CredentialManager;
use database::Database;
use std::sync::Arc;
use sync_manager::SyncManager;
use tauri::{Manager, Emitter, menu::{Menu, MenuItem, PredefinedMenuItem, Submenu}};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // Initialize database
            let db = Database::new(app.handle())
                .expect("Failed to initialize database");

            // Separate database connection for sync manager (SQLite WAL supports concurrent readers)
            let sync_db = Database::new(app.handle())
                .expect("Failed to initialize sync database");

            // Get database connection for account manager
            let db_path = app.handle()
                .path()
                .app_data_dir()
                .expect("Failed to get app data dir")
                .join("mailx.db");

            let conn = rusqlite::Connection::open(db_path)
                .expect("Failed to open database connection");

            // Initialize account manager
            let account_manager = Arc::new(AccountManager::new(conn));

            // Initialize credential manager
            let credential_manager = Arc::new(CredentialManager::new());

            // Initialize sync manager
            let sync_manager = Arc::new(SyncManager::new(
                app.handle().clone(),
                account_manager.clone(),
                credential_manager.clone(),
                Arc::new(sync_db),
            ));

            // Start background sync
            let _ = sync_manager.start_background_sync();

            // Manage state
            app.manage(db);
            app.manage(account_manager);
            app.manage(credential_manager);
            app.manage(sync_manager);

            // Create application menu
            #[cfg(target_os = "macos")]
            {
                use tauri::menu::{Menu, MenuItem, PredefinedMenuItem, Submenu};

                // Create app menu (the menu with app name)
                let about_item = MenuItem::with_id(app, "about", "About Mailx", true, None::<&str>)?;
                let settings_item = MenuItem::with_id(app, "settings", "Settings...", true, Some("Cmd+,"))?;
                let empty_separator = MenuItem::new(app, "-", true, None::<&str>)?;

                // Create File menu
                let close_item = MenuItem::with_id(app, "close", "Close Window", true, Some("Cmd+W"))?;

                let app_menu = Submenu::with_items(
                    app,
                    "Mailx",
                    true,
                    &[&about_item, &settings_item, &empty_separator]
                )?;
                let file_menu = Submenu::with_items(
                    app,
                    "File",
                    true,
                    &[&close_item]
                )?;

                let menu = Menu::with_items(app, &[&app_menu, &file_menu])?;
                app.set_menu(menu)?;

                // Handle menu events
                app.on_menu_event(|app, event| {
                    match event.id.as_ref() {
                        "settings" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.emit("navigate", "/settings");
                                let _ = window.eval("window.location.href = '/settings'");
                            }
                        }
                        "about" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.emit("navigate", "/about");
                                let _ = window.eval("window.location.href = '/about'");
                            }
                        }
                        _ => {}
                    }
                });
            }

            #[cfg(not(target_os = "macos"))]
            {
                use tauri::menu::{Menu, MenuItem, PredefinedMenuItem, Submenu};

                let settings_item = MenuItem::with_id(app, "settings", "Settings...", true, Some("Ctrl+,"))?;
                let quit_item = PredefinedMenuItem::quit(app, Some("Ctrl+Q"))?;
                let accounts_item = MenuItem::with_id(app, "accounts", "Manage Accounts...", true, None::<&str>)?;

                let file_menu = Submenu::with_items(app, "File", true, &[&settings_item, &quit_item])?;
                let account_menu = Submenu::with_items(app, "Account", true, &[&accounts_item])?;

                let menu = Menu::with_items(app, &[&file_menu, &account_menu])?;
                app.set_menu(menu)?;

                // Handle menu events
                app.on_menu_event(|app, event| {
                    match event.id.as_ref() {
                        "settings" | "accounts" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.emit("navigate", "/settings");
                                let _ = window.eval("window.location.href = '/settings'");
                            }
                        }
                        _ => {}
                    }
                });
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Mail commands
            commands::get_mails,
            commands::get_mail,
            commands::create_mail,
            commands::update_mail,
            commands::delete_mail,
            commands::mark_mail_read,
            commands::move_to_trash,
            commands::archive_mail,
            commands::unarchive_mail,
            commands::toggle_star,
            // Account commands
            commands::get_accounts,
            commands::get_account,
            commands::create_account,
            commands::update_account,
            commands::delete_account,
            commands::test_account_connection,
            // Sync commands
            commands::sync_account,
            commands::sync_all_accounts,
            commands::get_sync_status,
            // Send mail command
            commands::send_mail,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
