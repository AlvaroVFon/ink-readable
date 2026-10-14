//! Filesystem locations shared between the shell and the sidecar.

use std::path::PathBuf;

use tauri::{AppHandle, Manager};

/// Directory holding the SQLite database and the backend log. Created on
/// demand by the caller. The sidecar receives it as `--data-dir`.
pub fn data_dir(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map(data_dir_in)
        .map_err(|e| format!("resolve app data dir: {e}"))
}

/// Pure helper: the data subdirectory for a given app-data base. Kept separate
/// so the path convention is unit-testable without an `AppHandle`.
pub fn data_dir_in(base: PathBuf) -> PathBuf {
    base.join("data")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn appends_data_to_the_base() {
        let dir = data_dir_in(PathBuf::from("/base/app"));
        assert_eq!(dir, PathBuf::from("/base/app/data"));
        assert_eq!(
            dir.join("ink-readable.db"),
            PathBuf::from("/base/app/data/ink-readable.db")
        );
    }
}
