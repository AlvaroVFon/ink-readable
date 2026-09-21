import { z } from 'zod'

import { vaultSchema, type CreateVaultInput, type RenameVaultInput, type Vault } from '@/lib/types'

import { apiClient, type ApiClient } from './api-client'

const vaultListSchema = z.array(vaultSchema)

/**
 * Lists the active vaults, the roots of the notes tree.
 */
export function listVaults(client: ApiClient = apiClient): Promise<Vault[]> {
  return client.get('/vaults', { schema: vaultListSchema })
}

/**
 * Creates a vault. Names are required by the backend.
 */
export function createVault(name: string, client: ApiClient = apiClient): Promise<Vault> {
  const input: CreateVaultInput = { name }
  return client.post('/vaults', input, { schema: vaultSchema })
}

/**
 * Renames a vault. The backend rewrites every descendant document path in the
 * same transaction, so the tree refresh is enough to reflect the change.
 */
export function renameVault(
  id: string,
  input: RenameVaultInput,
  client: ApiClient = apiClient,
): Promise<void> {
  return client.patch(`/vaults/${id}`, input)
}

/**
 * Permanently deletes a vault together with all its documents. There is no
 * trash for vaults, so this cannot be undone.
 */
export function deleteVault(id: string, client: ApiClient = apiClient): Promise<void> {
  return client.delete(`/vaults/${id}`)
}
