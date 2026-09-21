-- name: CreateProject :exec
INSERT INTO projects (id, name, created_at, updated_at, deleted_at) VALUES (?, ? , ? ,?, ?)
