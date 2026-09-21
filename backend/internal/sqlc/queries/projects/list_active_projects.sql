-- name: ListActiveProjects :many
SELECT * FROM projects WHERE deleted_at IS NULL
