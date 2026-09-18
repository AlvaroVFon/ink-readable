-- name: ListDocumentsByDeleted :many
SELECT id, name, vault_id, path, content, deleted, created_at, updated_at
FROM documents
WHERE vault_id = ? AND deleted = ?
ORDER BY path
