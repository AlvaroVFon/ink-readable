-- name: RestoreDocument :exec
UPDATE documents SET deleted = 0, updated_at = ? WHERE id = ?
