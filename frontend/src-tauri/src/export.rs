//! Note export: saving the raw Markdown to disk and printing the webview (the
//! macOS print panel offers "Save as PDF").

use tauri::{AppHandle, WebviewWindow};
use tauri_plugin_dialog::DialogExt;

/// Asks the user where to save `contents` as a Markdown file and writes it.
///
/// Returns `false` when the user cancels the save panel. The whole flow runs in
/// Rust so the frontend needs neither fs nor dialog permissions.
#[tauri::command]
pub async fn export_markdown(
    app: AppHandle,
    file_name: String,
    contents: String,
) -> Result<bool, String> {
    let path = tauri::async_runtime::spawn_blocking(move || {
        app.dialog()
            .file()
            .set_file_name(&file_name)
            .add_filter("Markdown", &["md"])
            .blocking_save_file()
    })
    .await
    .map_err(|e| format!("save dialog: {e}"))?;

    let Some(path) = path else {
        return Ok(false);
    };
    let path = path.into_path().map_err(|e| format!("save path: {e}"))?;

    std::fs::write(&path, contents).map_err(|e| format!("write {}: {e}", path.display()))?;
    Ok(true)
}

/// Opens the native print panel for the calling window. WKWebView ignores a
/// plain `window.print()` from JavaScript, so the frontend goes through here.
#[tauri::command]
pub fn print_webview(window: WebviewWindow) -> Result<(), String> {
    window.print().map_err(|e| format!("print: {e}"))
}
