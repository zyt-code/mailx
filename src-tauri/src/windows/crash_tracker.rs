use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::io;
use thiserror::Error;

/// Error types for crash tracking operations
#[derive(Error, Debug)]
pub enum CrashTrackerError {
    #[error("IO error: {0}")]
    Io(#[from] io::Error),
    #[error("Failed to parse crash metadata: {0}")]
    ParseError(String),
    #[error("Crash directory not found")]
    DirectoryNotFound,
}

/// Information about a crash dump file
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CrashDumpInfo {
    pub filename: String,
    pub timestamp: DateTime<Utc>,
    pub app_version: String,
    pub reason: String,
    pub file_size_bytes: u64,
    pub stack_trace: Option<String>,
}

/// Manages crash dump files and metadata
pub struct CrashTracker {
    crash_dir: PathBuf,
}

impl CrashTracker {
    /// Create a new CrashTracker with the specified crash directory
    pub fn new(crash_dir: PathBuf) -> Self {
        Self { crash_dir }
    }

    /// Create crash directory if it doesn't exist
    pub fn ensure_crash_dir(&self) -> Result<(), CrashTrackerError> {
        if !self.crash_dir.exists() {
            fs::create_dir_all(&self.crash_dir)?;
        }
        Ok(())
    }

    /// Get all crash dumps in the crash directory
    pub fn get_crash_dumps(&self) -> Result<Vec<CrashDumpInfo>, CrashTrackerError> {
        if !self.crash_dir.exists() {
            return Ok(Vec::new());
        }

        let mut crashes = Vec::new();

        for entry in fs::read_dir(&self.crash_dir)? {
            let entry = entry?;
            let path = entry.path();

            // Look for .json metadata files
            if path.extension().and_then(|s| s.to_str()) == Some("json") {
                if let Ok(crash_info) = self.parse_crash_metadata(&path) {
                    // Check if corresponding .dmp file exists
                    let dmp_path = path.with_extension("dmp");
                    if dmp_path.exists() {
                        let file_size = fs::metadata(&dmp_path)
                            .map(|m| m.len())
                            .unwrap_or(0);
                        let mut info = crash_info;
                        info.file_size_bytes = file_size;
                        crashes.push(info);
                    }
                }
            }
        }

        // Sort by timestamp, newest first
        crashes.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));
        Ok(crashes)
    }

    /// Parse crash metadata from JSON file
    fn parse_crash_metadata(&self, path: &Path) -> Result<CrashDumpInfo, CrashTrackerError> {
        let content = fs::read_to_string(path)
            .map_err(|e| CrashTrackerError::ParseError(format!("Failed to read file: {}", e)))?;

        let mut info: CrashDumpInfo = serde_json::from_str(&content)
            .map_err(|e| CrashTrackerError::ParseError(format!("Failed to parse JSON: {}", e)))?;

        // Set filename from path
        info.filename = path.file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("unknown")
            .to_string();

        Ok(info)
    }

    /// Delete all crash dumps and metadata
    pub fn clear_crash_dumps(&self) -> Result<usize, CrashTrackerError> {
        if !self.crash_dir.exists() {
            return Ok(0);
        }

        let mut count = 0;
        for entry in fs::read_dir(&self.crash_dir)? {
            let entry = entry?;
            let path = entry.path();

            // Delete both .dmp and .json files
            if let Some(ext) = path.extension() {
                if ext == "dmp" || ext == "json" {
                    fs::remove_file(&path)?;
                    count += 1;
                }
            }
        }

        Ok(count)
    }

    /// Write crash metadata to JSON file
    pub fn write_crash_metadata(
        &self,
        filename: &str,
        app_version: &str,
        reason: &str,
        stack_trace: Option<String>,
    ) -> Result<(), CrashTrackerError> {
        self.ensure_crash_dir()?;

        let metadata = CrashDumpInfo {
            filename: filename.to_string(),
            timestamp: Utc::now(),
            app_version: app_version.to_string(),
            reason: reason.to_string(),
            file_size_bytes: 0, // Will be updated when reading
            stack_trace,
        };

        let json_path = self.crash_dir.join(format!("{}.json", filename));
        let json_content = serde_json::to_string_pretty(&metadata)
            .map_err(|e| CrashTrackerError::ParseError(format!("Failed to serialize JSON: {}", e)))?;

        fs::write(&json_path, json_content)?;
        Ok(())
    }

    /// Get crash directory path
    pub fn crash_dir(&self) -> &Path {
        &self.crash_dir
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    fn create_test_tracker() -> (CrashTracker, TempDir) {
        let temp_dir = TempDir::new().unwrap();
        let tracker = CrashTracker::new(temp_dir.path().to_path_buf());
        (tracker, temp_dir)
    }

    #[test]
    fn test_ensure_crash_dir() {
        let (tracker, _temp) = create_test_tracker();
        tracker.ensure_crash_dir().unwrap();
        assert!(tracker.crash_dir().exists());
    }

    #[test]
    fn test_write_and_read_crash_metadata() {
        let (tracker, _temp) = create_test_tracker();

        tracker.write_crash_metadata(
            "test_crash",
            "0.1.0",
            "Panic: test error",
            Some("stack trace here".to_string()),
        ).unwrap();

        let crashes = tracker.get_crash_dumps().unwrap();
        assert_eq!(crashes.len(), 0); // No .dmp file yet

        // Create dummy .dmp file
        let dmp_path = tracker.crash_dir().join("test_crash.dmp");
        fs::write(&dmp_path, b"dummy minidump").unwrap();

        let crashes = tracker.get_crash_dumps().unwrap();
        assert_eq!(crashes.len(), 1);
        assert_eq!(crashes[0].filename, "test_crash");
        assert_eq!(crashes[0].app_version, "0.1.0");
        assert_eq!(crashes[0].reason, "Panic: test error");
        assert_eq!(crashes[0].file_size_bytes, 14); // "dummy minidump" = 14 bytes
    }

    #[test]
    fn test_clear_crash_dumps() {
        let (tracker, _temp) = create_test_tracker();

        // Create test files
        tracker.write_crash_metadata("crash1", "0.1.0", "error", None).unwrap();
        tracker.write_crash_metadata("crash2", "0.1.0", "error", None).unwrap();

        let dmp1 = tracker.crash_dir().join("crash1.dmp");
        let dmp2 = tracker.crash_dir().join("crash2.dmp");
        fs::write(&dmp1, b"dmp1").unwrap();
        fs::write(&dmp2, b"dmp2").unwrap();

        // Clear
        let count = tracker.clear_crash_dumps().unwrap();
        assert_eq!(count, 4); // 2 .dmp + 2 .json

        // Verify directory is empty
        assert_eq!(tracker.get_crash_dumps().unwrap().len(), 0);
    }

    #[test]
    fn test_get_crash_dumps_sorting() {
        let (tracker, _temp) = create_test_tracker();

        // Create crashes with different timestamps
        tracker.write_crash_metadata("crash_old", "0.1.0", "error1", None).unwrap();
        std::thread::sleep(std::time::Duration::from_millis(10));
        tracker.write_crash_metadata("crash_new", "0.1.0", "error2", None).unwrap();

        // Create .dmp files
        fs::write(tracker.crash_dir().join("crash_old.dmp"), b"dmp1").unwrap();
        fs::write(tracker.crash_dir().join("crash_new.dmp"), b"dmp2").unwrap();

        let crashes = tracker.get_crash_dumps().unwrap();
        assert_eq!(crashes.len(), 2);
        assert_eq!(crashes[0].filename, "crash_new"); // Newest first
        assert_eq!(crashes[1].filename, "crash_old");
    }
}
