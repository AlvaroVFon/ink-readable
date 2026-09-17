-- name: CreateVault :exec
INSERT INTO vaults (id , name, deleted, created_at, updated_at) VALUES (?, ?, ?, ?, ?);
