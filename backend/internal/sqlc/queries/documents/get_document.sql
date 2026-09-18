-- name: GetDocument :one
SELECT id, name, vault_id, path, content, deleted, created_at, updated_at
FROM documents WHERE id = ?
