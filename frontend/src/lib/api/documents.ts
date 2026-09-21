import { z } from 'zod'

import { documentSchema, type CreateDocumentInput, type Document } from '@/lib/types'

import { apiClient, type ApiClient } from './api-client'

const documentListSchema = z.array(documentSchema)

/**
 * Lists the active documents of a vault.
 *
 * The payload includes each document's full content, which the notes tree does
 * not need; a lighter "document summaries" endpoint is a future backend
 * optimization.
 */
export function listDocuments(vaultId: string, client: ApiClient = apiClient): Promise<Document[]> {
  return client.get(`/vaults/${vaultId}/documents`, { schema: documentListSchema })
}

/**
 * Creates a document under a vault.
 *
 * `name` and `content` may be empty: the backend falls back to an "Untitled"
 * name, which is what "new note" relies on.
 */
export function createDocument(
  vaultId: string,
  input: CreateDocumentInput,
  client: ApiClient = apiClient,
): Promise<Document> {
  return client.post(`/vaults/${vaultId}/documents`, input, { schema: documentSchema })
}

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
