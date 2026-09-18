-- name: ListVaultsByDeleted :many
SELECT id, name, deleted, created_at, updated_at
FROM vaults
WHERE deleted = ?
ORDER BY name
