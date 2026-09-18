-- name: UpdateDocumentPaths :exec
UPDATE documents
SET path = sqlc.arg(new_path) || substr(path, length(sqlc.arg(old_path)) + 1), updated_at = sqlc.arg(updated_at)
WHERE vault_id = sqlc.arg(vault_id)
  AND (path = sqlc.arg(old_path) OR path LIKE sqlc.arg(old_path) || '/%')
