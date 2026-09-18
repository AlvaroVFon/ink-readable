-- name: UpdateTrashItemPaths :exec
UPDATE trash_items
SET path = sqlc.arg(new_path) || substr(path, length(sqlc.arg(old_path)) + 1)
WHERE vault_id = sqlc.arg(vault_id)
  AND (path = sqlc.arg(old_path) OR path LIKE sqlc.arg(old_path) || '/%')
