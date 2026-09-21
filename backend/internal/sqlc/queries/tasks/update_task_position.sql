-- name: UpdateTaskPosition :exec
UPDATE tasks SET position = ?, updated_at = ? WHERE id = ?
