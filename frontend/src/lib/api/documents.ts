import { documentSchema, type Document } from '@/lib/types'

import { apiClient, type ApiClient } from './api-client'

/**
 * Reads a single document by id.
 *
 * The response is validated against `documentSchema` so the editor works with
 * a trusted shape (content included) before it renders anything.
 */
export function getDocument(id: string, client: ApiClient = apiClient): Promise<Document> {
  return client.get(`/documents/${id}`, { schema: documentSchema })
}

/**
 * Persists the markdown body of a document.
 *
 * The endpoint answers `204 No Content`, so there is nothing to validate and
 * the caller only needs to react to the resolved/rejected promise.
 */
export function updateDocumentContent(
  id: string,
  content: string,
  client: ApiClient = apiClient,
): Promise<void> {
  return client.patch(`/documents/${id}/content`, { content })
}
