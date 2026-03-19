// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::panic;

fn main() {
    // Set up a panic hook to provide better error messages
    // and help prevent double-panic crashes
    panic::set_hook(Box::new(|panic_info| {
        eprintln!("=== PANIC ===");
        if let Some(location) = panic_info.location() {
            eprintln!(
                "Location: {}:{}:{}",
                location.file(),
                location.line(),
                location.column()
            );
        }
        // Get the panic payload as a string
        let payload = panic_info.payload();
        if let Some(s) = payload.downcast_ref::<&str>() {
            eprintln!("Message: {}", s);
        } else if let Some(s) = payload.downcast_ref::<String>() {
            eprintln!("Message: {}", s);
        } else {
            eprintln!("Panic occurred");
        }
        eprintln!("=============");
    }));

    mailx_lib::run()
}
