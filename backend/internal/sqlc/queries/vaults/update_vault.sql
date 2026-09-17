-- name: UpdateVaultName :exec
UPDATE vaults SET name = ?, updated_at = ? WHERE id = ?
