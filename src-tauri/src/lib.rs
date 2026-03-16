mod database;
mod commands;

use database::Database;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // Initialize database
            let db = Database::new(app.handle())
                .expect("Failed to initialize database");

            // Manage database as Tauri state
            app.manage(db);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_mails,
            commands::get_mail,
            commands::create_mail,
            commands::update_mail,
            commands::delete_mail,
            commands::mark_mail_read,
            commands::move_to_trash,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
