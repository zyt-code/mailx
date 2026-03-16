use crate::database::{Database, Mail};
use tauri::State;

/// Get all mails, optionally filtered by folder
#[tauri::command]
pub fn get_mails(
    folder: Option<String>,
    db: State<'_, Database>,
) -> Result<Vec<Mail>, String> {
    db.inner().get_mails(folder)
        .map_err(|e| format!("Failed to get mails: {}", e))
}

/// Get a single mail by ID
#[tauri::command]
pub fn get_mail(
    id: String,
    db: State<'_, Database>,
) -> Result<Mail, String> {
    db.inner().get_mail(&id)
        .map_err(|e| format!("Failed to get mail: {}", e))?
        .ok_or_else(|| format!("Mail with id '{}' not found", id))
}

/// Create a new mail
#[tauri::command]
pub fn create_mail(
    mail: Mail,
    db: State<'_, Database>,
) -> Result<String, String> {
    db.inner().insert_mail(&mail)
        .map_err(|e| format!("Failed to create mail: {}", e))?;
    Ok(mail.id)
}

/// Update an existing mail
#[tauri::command]
pub fn update_mail(
    mail: Mail,
    db: State<'_, Database>,
) -> Result<(), String> {
    db.inner().update_mail(&mail)
        .map_err(|e| format!("Failed to update mail: {}", e))
}

/// Delete a mail by ID
#[tauri::command]
pub fn delete_mail(
    id: String,
    db: State<'_, Database>,
) -> Result<(), String> {
    db.inner().delete_mail(&id)
        .map_err(|e| format!("Failed to delete mail: {}", e))
}

/// Mark a mail as read or unread
#[tauri::command]
pub fn mark_mail_read(
    id: String,
    read: bool,
    db: State<'_, Database>,
) -> Result<(), String> {
    db.inner().mark_mail_read(&id, read)
        .map_err(|e| format!("Failed to mark mail: {}", e))
}

/// Move a mail to trash (or permanent delete if already in trash)
#[tauri::command]
pub fn move_to_trash(
    id: String,
    current_folder: String,
    db: State<'_, Database>,
) -> Result<(), String> {
    db.inner().move_to_trash(&id, &current_folder)
        .map_err(|e| format!("Failed to move mail to trash: {}", e))
}
