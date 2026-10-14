//! Tauri entry point.
//!
//! Registers the shell plugin, spawns the Go backend sidecar (see [`api`]) and
//! kills it when the app exits.

mod api;

use tauri::Emitter;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(api::ApiState::default())
        .invoke_handler(tauri::generate_handler![api::get_api_url])
        .setup(|app| {
            if let Err(err) = api::spawn(app.handle()) {
                eprintln!("failed to start the backend sidecar: {err}");
                let _ = app.emit("api://error", err);
            }
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building the Ink & Readable application")
        .run(|app, event| {
            if let tauri::RunEvent::ExitRequested { .. } = event {
                api::shutdown(app);
            }
        });
}
