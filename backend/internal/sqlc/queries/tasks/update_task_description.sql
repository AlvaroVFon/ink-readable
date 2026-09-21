-- name: UpdateTaskDescription :exec
UPDATE tasks SET description = ?, updated_at = ? WHERE id = ?
