mod accounts;
mod commands;
mod credentials;
mod database;
mod imap_client;
mod smtp_client;
mod sync_manager;

use accounts::AccountManager;
use credentials::CredentialManager;
use database::Database;
use imap_client::ImapClient;
use smtp_client::SmtpClient;
use std::sync::Arc;
use sync_manager::SyncManager;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_credential::init())
        .setup(|app| {
            // Initialize database
            let db = Database::new(app.handle())
                .expect("Failed to initialize database");

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
            let credential_manager = Arc::new(CredentialManager::new(app.handle().clone()));

            // Initialize sync manager
            let sync_manager = Arc::new(SyncManager::new(
                app.handle().clone(),
                account_manager.clone(),
                credential_manager.clone(),
                Arc::new(db),
            ));

            // Start background sync
            let _ = sync_manager.start_background_sync();

            // Manage state
            app.manage(db);
            app.manage(account_manager);
            app.manage(credential_manager);
            app.manage(sync_manager);

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
