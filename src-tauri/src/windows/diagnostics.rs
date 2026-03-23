use serde::{Deserialize, Serialize};
use std::fmt;
use sysinfo::System;

/// Windows system diagnostics information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowsDiagnostics {
    pub os_version: String,
    pub os_build: String,
    pub architecture: String,
    pub total_memory_mb: u64,
    pub available_memory_mb: u64,
    pub app_version: String,
    pub tauri_version: String,
    pub crash_dumps_count: usize,
}

impl fmt::Display for WindowsDiagnostics {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            f,
            "Mailx v{} on Windows {} (Build: {}, Arch: {})\nMemory: {} MB / {} MB available\nCrash dumps: {}",
            self.app_version,
            self.os_version,
            self.os_build,
            self.architecture,
            self.available_memory_mb,
            self.total_memory_mb,
            self.crash_dumps_count
        )
    }
}

/// Get Windows version from system
fn get_windows_version() -> String {
    #[cfg(windows)]
    {
        use std::process::Command;
        if let Ok(output) = Command::new("cmd").args(&["/C", "ver"]).output() {
            String::from_utf8_lossy(&output.stdout).trim().to_string()
        } else {
            "Unknown".to_string()
        }
    }
    #[cfg(not(windows))]
    {
        "Unknown".to_string()
    }
}

/// Get Windows build number from system
fn get_windows_build() -> String {
    #[cfg(windows)]
    {
        use std::process::Command;
        if let Ok(output) = Command::new("wmic")
            .args(&["os", "get", "BuildNumber"])
            .output()
        {
            let result = String::from_utf8_lossy(&output.stdout);
            result
                .lines()
                .nth(1)
                .map(|s| s.trim().to_string())
                .unwrap_or_else(|| "Unknown".to_string())
        } else {
            "Unknown".to_string()
        }
    }
    #[cfg(not(windows))]
    {
        "Unknown".to_string()
    }
}

/// Get system architecture
fn get_architecture() -> String {
    std::env::var("PROCESSOR_ARCHITECTURE").unwrap_or_else(|_| {
        if cfg!(target_arch = "x86_64") {
            "x86_64".to_string()
        } else if cfg!(target_arch = "x86") {
            "x86".to_string()
        } else if cfg!(target_arch = "aarch64") {
            "ARM64".to_string()
        } else {
            "Unknown".to_string()
        }
    })
}

/// Collect Windows system diagnostics
pub fn collect_diagnostics(app_version: &str, crash_dumps_count: usize) -> WindowsDiagnostics {
    let mut sys = System::new_all();
    sys.refresh_all();

    let os_version = std::env::var("OS_VERSION").unwrap_or_else(|_| get_windows_version());

    let os_build = std::env::var("OS_BUILD").unwrap_or_else(|_| get_windows_build());

    let architecture = get_architecture();

    let total_memory_mb = sys.total_memory() / 1024;
    let available_memory_mb = sys.available_memory() / 1024;

    WindowsDiagnostics {
        os_version: os_version.trim().to_string(),
        os_build: os_build.trim().to_string(),
        architecture,
        total_memory_mb,
        available_memory_mb,
        app_version: app_version.to_string(),
        tauri_version: tauri::VERSION.to_string(),
        crash_dumps_count,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_collect_diagnostics() {
        let diagnostics = collect_diagnostics("0.1.0", 0);
        assert!(!diagnostics.os_version.is_empty());
        assert!(!diagnostics.architecture.is_empty());
        assert!(diagnostics.total_memory_mb > 0);
        assert_eq!(diagnostics.app_version, "0.1.0");
        assert_eq!(diagnostics.crash_dumps_count, 0);
    }

    #[test]
    fn test_diagnostics_display() {
        let diagnostics = WindowsDiagnostics {
            os_version: "Windows 11".to_string(),
            os_build: "22621".to_string(),
            architecture: "x86_64".to_string(),
            total_memory_mb: 16384,
            available_memory_mb: 8192,
            app_version: "0.1.0".to_string(),
            tauri_version: "2.0.0".to_string(),
            crash_dumps_count: 0,
        };
        let display = format!("{}", diagnostics);
        assert!(display.contains("Mailx v0.1.0"));
        assert!(display.contains("Windows 11"));
        assert!(display.contains("8192 MB"));
    }

    #[test]
    fn test_get_architecture() {
        let arch = get_architecture();
        assert!(!arch.is_empty());
    }

    #[test]
    fn test_get_windows_version() {
        let version = get_windows_version();
        // Should not be empty on Windows
        if cfg!(windows) {
            assert!(!version.is_empty());
        }
    }

    #[test]
    fn test_get_windows_build() {
        let build = get_windows_build();
        // Should not be empty on Windows
        if cfg!(windows) {
            assert!(!build.is_empty());
        }
    }
}
