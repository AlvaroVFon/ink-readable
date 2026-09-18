-- name: DeleteDocument :exec
UPDATE documents SET deleted = 1, updated_at = ? WHERE id = ?
