-- name: UpdateDocumentContent :exec
UPDATE documents SET content = ?, updated_at = ? WHERE id = ?
