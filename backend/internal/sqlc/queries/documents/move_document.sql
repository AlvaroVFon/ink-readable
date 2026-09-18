-- name: MoveDocument :exec
UPDATE documents SET path = ?, updated_at = ? WHERE id = ?
