-- name: DeleteDocumentLinksByDocument :exec
DELETE FROM document_links
WHERE document_a_id = ? OR document_b_id = ?
