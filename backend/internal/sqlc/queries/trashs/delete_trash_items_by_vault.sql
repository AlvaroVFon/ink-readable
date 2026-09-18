-- name: DeleteTrashItemsByVault :exec
DELETE FROM trash_items WHERE vault_id = ?
