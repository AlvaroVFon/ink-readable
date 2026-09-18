-- name: RenameDocument :exec
UPDATE documents
SET name = ?, path = ?, updated_at = ?
WHERE id = ?
