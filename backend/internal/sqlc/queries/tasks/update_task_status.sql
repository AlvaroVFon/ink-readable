-- name: UpdateTaskStatus :exec
UPDATE tasks SET status = ?, updated_at = ? WHERE id = ?
