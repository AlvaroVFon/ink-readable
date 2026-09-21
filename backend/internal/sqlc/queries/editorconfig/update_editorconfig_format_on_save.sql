-- name: UpdateEditorConfigFormatOnSave :exec
UPDATE editor_config SET format_on_save = ?, updated_at = ? WHERE id = ?
