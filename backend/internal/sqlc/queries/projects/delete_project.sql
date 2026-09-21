-- name: DeleteProject :exec
UPDATE projects SET updated_at = ?, deleted_at = ? WHERE id = ?
