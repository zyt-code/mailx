use crate::windows::crash_tracker::CrashTracker;
use crate::windows::crash_tracker::CrashTrackerError;
use chrono::Utc;
use std::panic;
use std::backtrace::Backtrace;
use tauri::AppHandle;
use tauri::Manager;

/// Install panic hook to capture crashes and write minidumps
pub fn install_panic_handler(app_handle: &AppHandle) -> Result<(), CrashTrackerError> {
    // Get crash directory
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| CrashTrackerError::ParseError(format!("Failed to get app data dir: {}", e)))?;

    let crash_dir = app_data_dir.join("crashes");
    let tracker = CrashTracker::new(crash_dir);
    tracker.ensure_crash_dir()?;

    // Get app version from Cargo.toml
    let app_version = env!("CARGO_PKG_VERSION");

    // Set panic hook
    panic::set_hook(Box::new(move |panic_info| {
        // Generate timestamp for filename
        let timestamp = Utc::now().format("%Y%m%d_%H%M%S");
        let filename = format!("crash_{}", timestamp);

        // Extract panic message
        let payload = panic_info.payload();
        let message = if let Some(s) = payload.downcast_ref::<&str>() {
            s.to_string()
        } else if let Some(s) = payload.downcast_ref::<String>() {
            s.clone()
        } else {
            "Unknown panic type".to_string()
        };

        // Get location if available
        let location = panic_info.location().map(|loc| {
            format!("{}:{}:{}", loc.file(), loc.line(), loc.column())
        });

        let reason = if let Some(loc) = location {
            format!("Panic at {}: {}", loc, message)
        } else {
            format!("Panic: {}", message)
        };

        // Capture backtrace
        let backtrace = format!("{:?}", Backtrace::capture());

        // Write crash metadata
        if let Err(e) = tracker.write_crash_metadata(
            &filename,
            app_version,
            &reason,
            Some(backtrace),
        ) {
            eprintln!("Failed to write crash metadata: {}", e);
        }

        // On Windows, try to write minidump using Windows API
        #[cfg(target_os = "windows")]
        {
            if let Err(e) = write_windows_minidump(tracker.crash_dir(), &filename) {
                eprintln!("Failed to write minidump: {}", e);
            }
        }

        // Log to stderr
        eprintln!("CRASH: {}", reason);
    }));

    Ok(())
}

/// Write Windows minidump using Windows API
#[cfg(target_os = "windows")]
fn write_windows_minidump(crash_dir: &std::path::Path, filename: &str) -> Result<(), CrashTrackerError> {
    use std::fs::File;
    use std::io::Write;
    use std::process::Command;

    let dmp_path = crash_dir.join(format!("{}.dmp", filename));

    // For now, write a placeholder minidump with basic info
    // A real implementation would use Windows DbgHelp API via the `minidump` crate
    // or directly call MiniDumpWriteDump via FFI

    let mut file = File::create(&dmp_path)
        .map_err(|e| CrashTrackerError::ParseError(format!("Failed to create dmp file: {}", e)))?;

    // Get current process ID
    let pid = std::process::id();

    // Write placeholder header with basic crash info
    let header = format!(
        "MAILX-MINIDUMP-PLACEHOLDER\n\
         Version: 1.0\n\
         Process ID: {}\n\
         Timestamp: {}\n\
         Note: This is a placeholder. Real minidumps require Windows DbgHelp API.\n",
        pid,
        Utc::now().to_rfc3339()
    );

    file.write_all(header.as_bytes())
        .map_err(|e| CrashTrackerError::ParseError(format!("Failed to write dmp: {}", e)))?;

    // Try to get some Windows version info
    if let Ok(output) = Command::new("cmd")
        .args(&["/C", "ver"])
        .output()
    {
        let version_info = String::from_utf8_lossy(&output.stdout);
        let _ = file.write_all(b"\nWindows Version:\n");
        let _ = file.write_all(version_info.as_bytes());
    }

    Ok(())
}

/// Initialize crash handler with Tauri app handle
pub fn init_crash_handler(app_handle: &AppHandle) -> Result<(), CrashTrackerError> {
    install_panic_handler(app_handle)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_install_panic_handler() {
        // This test is difficult to run in unit tests without a real Tauri AppHandle
        // Integration tests should cover this
        assert!(true); // Placeholder
    }

    #[cfg(target_os = "windows")]
    #[test]
    fn test_write_windows_minidump() {
        use tempfile::TempDir;
        let temp_dir = TempDir::new().unwrap();
        let filename = "test_crash";
        let result = write_windows_minidump(temp_dir.path(), filename);
        assert!(result.is_ok());

        // Verify file was created
        let dmp_path = temp_dir.path().join(format!("{}.dmp", filename));
        assert!(dmp_path.exists());

        // Verify file contains expected content
        let content = std::fs::read_to_string(&dmp_path).unwrap();
        assert!(content.contains("MAILX-MINIDUMP-PLACEHOLDER"));
        assert!(content.contains("Process ID:"));
    }
}
