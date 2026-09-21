import { z } from 'zod'

import { vaultSchema, type CreateVaultInput, type Vault } from '@/lib/types'

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
