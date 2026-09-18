-- name: GetVault :one
SELECT id, name, deleted, created_at, updated_at
FROM vaults WHERE id = ?
