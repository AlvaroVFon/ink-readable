-- name: ListTasks :many
SELECT * FROM tasks WHERE project_id = ? ORDER BY position ASC
