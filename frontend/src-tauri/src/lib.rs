//! Tauri entry point.
//!
//! At this stage (T4) the shell only opens a window that loads the built SPA.
//! The Go backend sidecar lifecycle is wired in T5.

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running the Ink & Readable application");
}
