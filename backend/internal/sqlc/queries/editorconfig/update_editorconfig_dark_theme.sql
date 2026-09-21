-- name: UpdateEditorConfigDarkTheme :exec
UPDATE editor_config SET dark_theme = ?, updated_at = ? WHERE id = ?
