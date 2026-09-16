-- name: CreateUser :one
INSERT INTO users (id, email, name)
VALUES (?, ?, ?)
RETURNING *;
