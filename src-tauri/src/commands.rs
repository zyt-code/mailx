use crate::accounts::{Account, AccountManager, ImapConfig, SmtpConfig};
use crate::credentials::CredentialManager;
use crate::database::{Database, Mail};
use crate::html_sanitize;
use crate::imap_client::ImapClient;
use crate::smtp_client::SmtpClient;
use crate::sync_manager::{SyncManager, SyncStatus};
use serde_json::json;
use tauri::{AppHandle, Emitter, State};
use std::sync::{Arc, Mutex};

/// Sanitize html_body field on a Mail if present
fn sanitize_mail_html(mut mail: Mail) -> Mail {
    if let Some(ref html) = mail.html_body {
        mail.html_body = Some(html_sanitize::sanitize_html(html));
    }
    mail
}

/// Get all mails, optionally filtered by folder
#[tauri::command]
pub fn get_mails(
    folder: Option<String>,
    db: State<'_, Database>,
) -> Result<Vec<Mail>, String> {
    db.inner().get_mails(folder)
        .map(|mails| mails.into_iter().map(sanitize_mail_html).collect())
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
        .map(sanitize_mail_html)
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

/// Archive a mail
#[tauri::command]
pub fn archive_mail(
    id: String,
    db: State<'_, Database>,
) -> Result<(), String> {
    db.inner().archive_mail(&id)
        .map_err(|e| format!("Failed to archive mail: {}", e))
}

/// Unarchive a mail (move back to inbox)
#[tauri::command]
pub fn unarchive_mail(
    id: String,
    db: State<'_, Database>,
) -> Result<(), String> {
    db.inner().unarchive_mail(&id)
        .map_err(|e| format!("Failed to unarchive mail: {}", e))
}

/// Toggle star status for a mail
#[tauri::command]
pub fn toggle_star(
    id: String,
    starred: bool,
    db: State<'_, Database>,
) -> Result<(), String> {
    db.inner().toggle_star(&id, starred)
        .map_err(|e| format!("Failed to toggle star: {}", e))
}

// ============================================================================
// Account Management Commands
// ============================================================================

/// Get all accounts
#[tauri::command]
pub fn get_accounts(
    account_manager: State<'_, Arc<AccountManager>>,
) -> Result<Vec<Account>, String> {
    account_manager
        .get_all()
        .map_err(|e| format!("Failed to get accounts: {}", e))
}

/// Get a single account by ID
#[tauri::command]
pub fn get_account(
    id: String,
    account_manager: State<'_, Arc<AccountManager>>,
) -> Result<Account, String> {
    account_manager
        .get(&id)
        .map_err(|e| format!("Failed to get account: {}", e))
}

/// Create a new account
#[tauri::command]
pub fn create_account(
    account: Account,
    password: String,
    app_handle: AppHandle,
    account_manager: State<'_, Arc<AccountManager>>,
    credential_manager: State<'_, Arc<CredentialManager>>,
) -> Result<String, String> {
    // Validate password
    credential_manager
        .validate_password(&password)
        .map_err(|e| format!("Invalid password: {}", e))?;

    // Create the account
    account_manager
        .create(&account)
        .map_err(|e| format!("Failed to create account: {}", e))?;

    // Store the password securely
    credential_manager
        .store_password(&account.id, &password)
        .map_err(|e| format!("Failed to store password: {}", e))?;

    // Emit account created event
    let _ = app_handle.emit("account:created", json!({ "id": account.id }));

    Ok(account.id)
}

/// Update an existing account
#[tauri::command]
pub fn update_account(
    account: Account,
    new_password: Option<String>,
    app_handle: AppHandle,
    account_manager: State<'_, Arc<AccountManager>>,
    credential_manager: State<'_, Arc<CredentialManager>>,
) -> Result<(), String> {
    // Update the account
    account_manager
        .update(&account)
        .map_err(|e| format!("Failed to update account: {}", e))?;

    // Update password if provided
    if let Some(password) = new_password {
        credential_manager
            .validate_password(&password)
            .map_err(|e| format!("Invalid password: {}", e))?;

        credential_manager
            .update_password(&account.id, &password)
            .map_err(|e| format!("Failed to update password: {}", e))?;
    }

    // Emit account updated event
    let _ = app_handle.emit("account:updated", json!({ "id": account.id }));

    Ok(())
}

/// Delete an account
#[tauri::command]
pub fn delete_account(
    id: String,
    app_handle: AppHandle,
    account_manager: State<'_, Arc<AccountManager>>,
    credential_manager: State<'_, Arc<CredentialManager>>,
) -> Result<(), String> {
    // Delete the account
    account_manager
        .delete(&id)
        .map_err(|e| format!("Failed to delete account: {}", e))?;

    // Delete the stored password
    let _ = credential_manager.delete_password(&id);

    // Emit account deleted event
    let _ = app_handle.emit("account:deleted", json!({ "id": id }));

    Ok(())
}

/// Test connection for an account
#[tauri::command]
pub async fn test_account_connection(
    id: String,
    account_manager: State<'_, Arc<AccountManager>>,
    credential_manager: State<'_, Arc<CredentialManager>>,
) -> Result<(), String> {
    // Get the account
    let account = account_manager
        .get(&id)
        .map_err(|e| format!("Failed to get account: {}", e))?;

    // Get credentials
    let password = credential_manager
        .get_password(&id)
        .map_err(|e| format!("Failed to get password: {}", e))?;

    // Get IMAP config
    let imap_config = account_manager
        .get_imap_config(&id)
        .map_err(|e| format!("Failed to get IMAP config: {}", e))?;

    // Test IMAP connection
    let imap_client = ImapClient::new(imap_config, account.email.clone(), password.clone());
    imap_client
        .test_connection()
        .await
        .map_err(|e| format!("IMAP connection test failed: {}", e))?;

    // Get SMTP config
    let smtp_config = account_manager
        .get_smtp_config(&id)
        .map_err(|e| format!("Failed to get SMTP config: {}", e))?;

    // Test SMTP connection
    let smtp_client = SmtpClient::new(smtp_config, account.email, password);
    smtp_client
        .test_connection()
        .await
        .map_err(|e| format!("SMTP connection test failed: {}", e))?;

    Ok(())
}

// ============================================================================
// Sync Commands
// ============================================================================

/// Sync a specific account
#[tauri::command]
pub async fn sync_account(
    id: String,
    sync_manager: State<'_, Arc<SyncManager>>,
) -> Result<SyncStatus, String> {
    sync_manager
        .sync_account(&id)
        .await
        .map_err(|e| format!("Sync failed: {}", e))
}

/// Sync all active accounts
#[tauri::command]
pub async fn sync_all_accounts(
    sync_manager: State<'_, Arc<SyncManager>>,
) -> Result<Vec<SyncStatus>, String> {
    sync_manager
        .sync_all_accounts()
        .await
        .map_err(|e| format!("Sync failed: {}", e))
}

/// Get sync status for all accounts
#[tauri::command]
pub fn get_sync_status(
    account_manager: State<'_, Arc<AccountManager>>,
) -> Result<Vec<SyncStatus>, String> {
    let accounts = account_manager
        .get_all()
        .map_err(|e| format!("Failed to get accounts: {}", e))?;

    let statuses = accounts
        .into_iter()
        .map(|account| SyncStatus {
            account_id: account.id.clone(),
            account_email: account.email.clone(),
            status: crate::sync_manager::SyncState::Idle,
            last_sync: None,
            error_message: None,
            retry_count: 0,
        })
        .collect();

    Ok(statuses)
}

// ============================================================================
// Send Mail Command
// ============================================================================

/// Send an email via SMTP
#[tauri::command]
pub async fn send_mail(
    mail_id: String,
    account_id: String,
    app_handle: AppHandle,
    account_manager: State<'_, Arc<AccountManager>>,
    credential_manager: State<'_, Arc<CredentialManager>>,
    db: State<'_, Database>,
) -> Result<(), String> {
    // Get the mail
    let mail = db
        .inner()
        .get_mail(&mail_id)
        .map_err(|e| format!("Failed to get mail: {}", e))?
        .ok_or_else(|| format!("Mail with id '{}' not found", mail_id))?;

    // Get the account
    let account = account_manager
        .get(&account_id)
        .map_err(|e| format!("Failed to get account: {}", e))?;

    // Get credentials
    let password = credential_manager
        .get_password(&account_id)
        .map_err(|e| format!("Failed to get password: {}", e))?;

    // Get SMTP config
    let smtp_config = account_manager
        .get_smtp_config(&account_id)
        .map_err(|e| format!("Failed to get SMTP config: {}", e))?;

    // Send the email
    let smtp_client = SmtpClient::new(smtp_config, account.email, password);
    smtp_client
        .send_mail(&mail)
        .await
        .map_err(|e| format!("Failed to send email: {}", e))?;

    // Move mail to sent folder
    db.inner()
        .update_mail(&Mail {
            folder: "sent".to_string(),
            ..mail
        })
        .map_err(|e| format!("Failed to update mail: {}", e))?;

    // Emit mail sent event
    let _ = app_handle.emit("mail:sent", json!({ "id": mail_id, "account_id": account_id }));

    Ok(())
}
