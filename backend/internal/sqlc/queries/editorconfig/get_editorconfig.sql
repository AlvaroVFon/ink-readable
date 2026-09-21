-- name: GetEditorConfig :one
SELECT id, dark_theme, vim_motion, format_on_save, updated_at FROM editor_config WHERE id = ?
