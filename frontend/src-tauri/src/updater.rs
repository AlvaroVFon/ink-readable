//! In-app updates.
//!
//! The frontend drives the flow through `@tauri-apps/plugin-updater`:
//! `download()` → [`stop_backend`] → `install()` → [`restart_app`]. These
//! commands make sure the Go sidecar never outlives the old app version:
//!
//! - Windows: `install()` launches the installer and calls
//!   `std::process::exit`, which skips `RunEvent::ExitRequested`. Stopping the
//!   sidecar first lets the installer replace `ink-readable-api.exe`.
//! - macOS/Linux: the update is installed in place and [`restart_app`]
//!   relaunches the app on the new version.

use tauri::AppHandle;

use crate::api;

/// Stops the backend sidecar right before an update is installed.
#[tauri::command]
pub fn stop_backend(app: AppHandle) {
    api::shutdown(&app);
}

/// Stops the backend sidecar (if still running) and relaunches the app.
#[tauri::command]
pub fn restart_app(app: AppHandle) {
    api::shutdown(&app);
    app.restart();
}
