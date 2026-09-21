-- name: GetEditorConfig :one
SELECT id, dark_theme, vim_motion, updated_at FROM editor_config WHERE id = ?
