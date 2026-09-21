-- name: UpdateTaskTitle :exec
UPDATE tasks SET title = ?, updated_at = ? WHERE id = ?
