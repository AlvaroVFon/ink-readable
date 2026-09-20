/* oxlint-disable typescript/no-unsafe-type-assertion */

import type { Document, Vault } from './types'

const API_BASE = '/api/v1'

export type CreateDocumentInput = {
  name: string
  path: string
  content: string
}

async function readError(response: Response): Promise<string> {
  const fallback = `Request failed with status ${response.status}`
  try {
    const body: unknown = await response.json()
    if (typeof body === 'object' && body !== null && 'error' in body) {
      const message = body.error
      if (typeof message === 'string') {
        return message
      }
    }
  } catch {
    return fallback
  }
  return fallback
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json' },
  })

  if (!response.ok) {
    throw new Error(await readError(response))
  }

  const payload: unknown = await response.json()
  return payload as T
}

export function listVaults(): Promise<Vault[]> {
  return request<Vault[]>('/vaults')
}

export function listDocuments(vaultId: string): Promise<Document[]> {
  return request<Document[]>(`/vaults/${vaultId}/documents`)
}

export function createDocument(
  vaultId: string,
  input: CreateDocumentInput,
): Promise<Document> {
  return request<Document>(`/vaults/${vaultId}/documents`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}
