-- name: DeleteDocumentsByVault :exec
DELETE FROM documents WHERE vault_id = ?
