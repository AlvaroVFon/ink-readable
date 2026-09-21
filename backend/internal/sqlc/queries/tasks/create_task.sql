-- name: CreateTask :exec
INSERT INTO tasks (id, project_id, title, description, status, position, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
