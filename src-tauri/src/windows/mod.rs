pub mod crash_tracker;
pub mod diagnostics;
#[cfg(windows)]
pub mod minidump;

pub use crash_tracker::{CrashDumpInfo, CrashTracker};
pub use diagnostics::WindowsDiagnostics;
