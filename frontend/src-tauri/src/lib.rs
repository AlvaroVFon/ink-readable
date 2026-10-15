//! Tauri entry point.
//!
//! Registers the shell/opener/dialog/updater plugins, spawns the Go backend
//! sidecar (see [`api`]) and kills it when the app exits.

mod api;
mod export;
mod paths;
mod updater;

use tauri::Emitter;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(api::ApiState::default())
        .invoke_handler(tauri::generate_handler![
            api::get_api_url,
            api::open_data_dir,
            export::export_markdown,
            export::print_webview,
            updater::stop_backend,
            updater::restart_app
        ])
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
