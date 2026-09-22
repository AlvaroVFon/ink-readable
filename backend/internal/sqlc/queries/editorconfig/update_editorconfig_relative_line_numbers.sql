-- name: UpdateEditorConfigRelativeLineNumbers :exec
UPDATE editor_config SET relative_line_numbers = ?, updated_at = ? WHERE id = ?
