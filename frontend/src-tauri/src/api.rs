//! Backend sidecar lifecycle.
//!
//! On startup the Go API binary is spawned as a sidecar with
//! `--desktop --port 0 --data-dir <app_data_dir>/data`. It prints a canonical
//! line (`__INK_API_READY__ http://127.0.0.1:<port>`) once it is listening;
//! this module captures it, exposes the URL to the frontend through the
//! `get_api_url` command and kills the process when the app exits.

use std::path::PathBuf;
use std::sync::Mutex;
use std::time::Duration;

use tauri::{AppHandle, Emitter, Manager, State};
use tauri_plugin_shell::process::{CommandChild, CommandEvent};
use tauri_plugin_shell::ShellExt;

/// Token the Go backend prints on stdout once it is listening.
pub const READY_TOKEN: &str = "__INK_API_READY__";

/// Sidecar name as declared in `bundle.externalBin`. At runtime the CLI copies
/// the binary next to the app executable with this base name (no directory, no
/// target-triple suffix).
const SIDECAR: &str = "ink-readable-api";

/// How long `get_api_url` waits for the backend before giving up.
const READY_TIMEOUT: Duration = Duration::from_secs(10);

/// Shared state: the resolved API URL (once known) and the child handle used to
/// kill the backend on exit.
#[derive(Default)]
pub struct ApiState {
    url: Mutex<Option<String>>,
    child: Mutex<Option<CommandChild>>,
}

/// Spawns the backend sidecar and starts watching its output.
pub fn spawn(app: &AppHandle) -> Result<(), String> {
    let data_dir = data_dir(app)?;
    std::fs::create_dir_all(&data_dir).map_err(|e| format!("create data dir: {e}"))?;

    let command = app
        .shell()
        .sidecar(SIDECAR)
        .map_err(|e| format!("resolve sidecar: {e}"))?
        .args([
            "--desktop",
            "--port",
            "0",
            "--data-dir",
            data_dir.to_string_lossy().as_ref(),
        ]);

    let (mut rx, child) = command.spawn().map_err(|e| format!("spawn sidecar: {e}"))?;

    app.state::<ApiState>()
        .child
        .lock()
        .expect("api state poisoned")
        .replace(child);

    let handle = app.clone();
    tauri::async_runtime::spawn(async move {
        while let Some(event) = rx.recv().await {
            match event {
                CommandEvent::Stdout(bytes) => {
                    let line = String::from_utf8_lossy(&bytes);
                    if let Some(url) = parse_ready_line(&line) {
                        let state = handle.state::<ApiState>();
                        *state.url.lock().expect("api state poisoned") = Some(url.clone());
                        let _ = handle.emit("api://ready", url);
                    }
                }
                CommandEvent::Stderr(bytes) => {
                    let line = String::from_utf8_lossy(&bytes);
                    let line = line.trim_end();
                    if !line.is_empty() {
                        eprintln!("[backend] {line}");
                    }
                }
                CommandEvent::Terminated(payload) => {
                    let _ =
                        handle.emit("api://error", format!("backend exited: {:?}", payload.code));
                    break;
                }
                _ => {}
            }
        }
    });

    Ok(())
}

/// Kills the backend sidecar, if still running.
pub fn shutdown(app: &AppHandle) {
    if let Some(child) = app
        .state::<ApiState>()
        .child
        .lock()
        .expect("api state poisoned")
        .take()
    {
        let _ = child.kill();
    }
}

/// Resolves `<app_data_dir>/data`, the directory holding the SQLite file.
pub fn data_dir(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map(|dir| dir.join("data"))
        .map_err(|e| format!("resolve app data dir: {e}"))
}

/// Returns the backend base URL, waiting up to [`READY_TIMEOUT`] for it to come
/// up. The frontend calls this during bootstrap (see T6).
#[tauri::command]
pub async fn get_api_url(state: State<'_, ApiState>) -> Result<String, String> {
    let deadline = tokio::time::Instant::now() + READY_TIMEOUT;

    loop {
        if let Some(url) = state.url.lock().expect("api state poisoned").clone() {
            return Ok(url);
        }
        if tokio::time::Instant::now() >= deadline {
            return Err("backend not ready".to_string());
        }
        tokio::time::sleep(Duration::from_millis(100)).await;
    }
}

/// Extracts the base URL from a backend stdout line, only when it is the
/// canonical ready line. Any other line (logs, partial output) yields `None`.
pub fn parse_ready_line(line: &str) -> Option<String> {
    line.trim()
        .strip_prefix(READY_TOKEN)
        .map(|rest| rest.trim().to_string())
        .filter(|url| !url.is_empty())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_the_canonical_ready_line() {
        assert_eq!(
            parse_ready_line("__INK_API_READY__ http://127.0.0.1:43441"),
            Some("http://127.0.0.1:43441".to_string())
        );
        assert_eq!(
            parse_ready_line("__INK_API_READY__   http://127.0.0.1:8082  \n"),
            Some("http://127.0.0.1:8082".to_string())
        );
    }

    #[test]
    fn ignores_noisy_lines() {
        assert_eq!(
            parse_ready_line("2026/10/14 API listening on http://127.0.0.1:1"),
            None
        );
        assert_eq!(parse_ready_line(""), None);
        assert_eq!(parse_ready_line("__INK_API_READY__"), None);
        assert_eq!(parse_ready_line("__INK_API_READY__   "), None);
    }
}
