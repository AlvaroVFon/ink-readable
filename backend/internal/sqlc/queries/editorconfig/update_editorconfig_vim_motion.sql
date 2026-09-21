-- name: UpdateEditorConfigVimMotion :exec
UPDATE editor_config SET vim_motion = ?, updated_at = ? WHERE id = ?
