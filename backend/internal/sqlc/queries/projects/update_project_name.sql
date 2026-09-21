-- name: UpdateProjectName :exec
UPDATE projects SET name = ?, updated_at = ? WHERE id = ?
