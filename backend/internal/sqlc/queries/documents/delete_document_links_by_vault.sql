-- name: DeleteDocumentLinksByVault :exec
DELETE FROM document_links
WHERE document_a_id IN (SELECT d.id FROM documents AS d WHERE d.vault_id = ?)
   OR document_b_id IN (SELECT d.id FROM documents AS d WHERE d.vault_id = ?)
