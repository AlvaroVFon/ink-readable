-- name: CreateDocument :exec
INSERT INTO documents (
  id, name, vault_id ,path, content, created_at, updated_at
) VALUES ( ?, ?, ? , ?, ?, ?, ?)
