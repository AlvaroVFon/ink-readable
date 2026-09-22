-- name: GetEditorConfig :one
SELECT id, dark_theme, vim_motion, format_on_save, relative_line_numbers, updated_at FROM editor_config WHERE id = ?
