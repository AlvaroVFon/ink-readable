-- name: GetVaultName :one
SELECT name FROM vaults WHERE id = ?
