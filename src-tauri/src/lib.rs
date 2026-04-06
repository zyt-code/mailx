mod accounts;
mod commands;
mod credentials_legacy;
pub mod credentials_platform;
mod database;
mod html_sanitize;
mod imap_client;
mod mail_provider;
mod notification_manager;
mod provider_defaults;
mod smtp_client;
mod sync_manager;

mod platform;

#[cfg(windows)]
mod windows;

use accounts::AccountManager;
use credentials_legacy::CredentialManager;
use database::Database;
use std::sync::Arc;

// Menu and navigation constants
#[cfg(target_os = "macos")]
const MENU_ID_ABOUT: &str = "about";
const WINDOW_ID_MAIN: &str = "main";
#[cfg(target_os = "macos")]
const NAV_ROUTE_ABOUT: &str = "/about";
use sync_manager::SyncManager;
use tauri::webview::Color;
use tauri::{Manager, Theme, WebviewWindow};

const LIGHT_WINDOW_BG: Color = Color(255, 255, 255, 255);
const DARK_WINDOW_BG: Color = Color(13, 17, 23, 255);

fn background_for_theme(theme: Theme) -> Color {
    match theme {
        Theme::Dark => DARK_WINDOW_BG,
        _ => LIGHT_WINDOW_BG,
    }
}

fn sync_window_background<R: tauri::Runtime>(window: &WebviewWindow<R>, theme: Theme) {
    if let Err(error) = window.set_background_color(Some(background_for_theme(theme))) {
        eprintln!("Failed to sync window background: {error}");
    }
}

fn bind_window_theme<R: tauri::Runtime>(window: &WebviewWindow<R>) {
    if let Ok(theme) = window.theme() {
        sync_window_background(window, theme);
    }

    let window_handle = window.clone();
    window.on_window_event(move |event| {
        if let tauri::WindowEvent::ThemeChanged(theme) = event {
            sync_window_background(&window_handle, *theme);
        }
    });
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .setup(|app| {
            if let Some(window) = app.get_webview_window(WINDOW_ID_MAIN) {
                bind_window_theme(&window);
            }

            // Initialize database
            let db = Database::new(app.handle()).expect("Failed to initialize database");

            // Separate database connection for sync manager (SQLite WAL supports concurrent readers)
            let sync_db = Database::new(app.handle()).expect("Failed to initialize sync database");

            // Get database connection for account manager
            let db_path = app
                .handle()
                .path()
                .app_data_dir()
                .expect("Failed to get app data dir")
                .join("mailx.db");

            let conn =
                rusqlite::Connection::open(db_path).expect("Failed to open database connection");

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

            // Initialize crash handler for Windows
            #[cfg(windows)]
            {
                if let Err(e) = crate::windows::minidump::init_crash_handler(app.handle()) {
                    eprintln!("Failed to initialize crash handler: {}", e);
                }
            }

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
                let about_item =
                    MenuItem::with_id(app, MENU_ID_ABOUT, "About Mailx", true, None::<&str>)?;

                // Create File menu
                let close_item =
                    MenuItem::with_id(app, "close", "Close Window", true, Some("Cmd+W"))?;

                // Create Edit menu with standard editing shortcuts
                let undo_item = PredefinedMenuItem::undo(app, None)?;
                let redo_item = PredefinedMenuItem::redo(app, None)?;
                let edit_separator1 = MenuItem::new(app, "-", true, None::<&str>)?;
                let cut_item = PredefinedMenuItem::cut(app, None)?;
                let copy_item = PredefinedMenuItem::copy(app, None)?;
                let paste_item = PredefinedMenuItem::paste(app, None)?;
                let select_all_item = PredefinedMenuItem::select_all(app, None)?;

                let app_menu = Submenu::with_items(app, "Mailx", true, &[&about_item])?;
                let file_menu = Submenu::with_items(app, "File", true, &[&close_item])?;
                let edit_menu = Submenu::with_items(
                    app,
                    "Edit",
                    true,
                    &[
                        &undo_item,
                        &redo_item,
                        &edit_separator1,
                        &cut_item,
                        &copy_item,
                        &paste_item,
                        &select_all_item,
                    ],
                )?;

                let menu = Menu::with_items(app, &[&app_menu, &file_menu, &edit_menu])?;
                app.set_menu(menu)?;

                // Handle menu events
                app.on_menu_event(|app, event| match event.id.as_ref() {
                    MENU_ID_ABOUT => {
                        if let Some(window) = app.get_webview_window(WINDOW_ID_MAIN) {
                            let _ = window.emit("navigate", NAV_ROUTE_ABOUT);
                        }
                    }
                    _ => {}
                });
            }

            #[cfg(not(target_os = "macos"))]
            {
                // Windows/Linux: No native menu bar
                use tauri::menu::Menu;

                let menu = Menu::new(app)?;
                app.set_menu(menu)?;
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Mail commands
            commands::get_mails,
            commands::get_mails_count,
            commands::get_mail,
            commands::ensure_mail_content,
            commands::create_mail,
            commands::add_mail_attachment,
            commands::get_mail_attachments,
            commands::remove_mail_attachment,
            commands::update_mail,
            commands::delete_mail,
            commands::mark_mail_read,
            commands::mark_as_read,
            commands::move_to_trash,
            commands::archive_mail,
            commands::unarchive_mail,
            commands::toggle_star,
            commands::get_unread_count,
            commands::clear_database,
            commands::get_database_size,
            commands::compact_database,
            // Account commands
            commands::get_accounts,
            commands::get_account,
            commands::create_account,
            commands::update_account,
            commands::delete_account,
            commands::test_account_connection,
            commands::test_connection_credentials,
            commands::provider_defaults_for_email,
            // Sync commands
            commands::sync_account,
            commands::sync_all_accounts,
            commands::get_sync_status,
            commands::test_imap_connection,
            // Send mail command
            commands::send_mail,
            // Notification commands
            commands::get_notification_history,
            commands::send_notification_with_history,
            // Windows diagnostics commands (platform-specific)
            #[cfg(windows)]
            commands::get_windows_diagnostics,
            #[cfg(windows)]
            commands::get_crash_dumps,
            #[cfg(windows)]
            commands::clear_crash_dumps,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
