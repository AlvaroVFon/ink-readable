-- name: DeleteVault :exec
UPDATE vaults SET deleted = 1, updated_at = ? WHERE id = ?
