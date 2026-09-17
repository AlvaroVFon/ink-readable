-- name: CreateTrashItem :exec
INSERT INTO trash_items (
  id, 
  vault_id, 
  resource_id, 
  resource_type, 
  path, 
  parent_id, 
  deleted_at
)
VALUES (?, ?, ?, ?, ?, ?, ?)
