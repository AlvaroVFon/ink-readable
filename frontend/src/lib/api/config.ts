import { secretsSchema, type Secrets } from '@/lib/types'

import { apiClient, type ApiClient } from './api-client'

/**
 * Path of the backend proxy that resolves the vault secrets.
 *
 * The browser never talks to the vault directly: the API key stays on the
 * backend and this endpoint only returns the configuration the frontend is
 * allowed to read. The payload is assumed to match `config.GetSecrets`: a flat
 * `key -> value` map.
 */
export const CONFIG_PATH = '/config'

/**
 * Reads the resolved secrets from the backend `/config` proxy.
 *
 * It is a plain function instead of a class so it can be used outside React
 * (bootstrap code) and tested in isolation. React consumers should use the
 * `useSecrets` hook, which adds state and request deduplication on top.
 */
export function fetchSecrets(client: ApiClient = apiClient): Promise<Secrets> {
  return client.get(CONFIG_PATH, { schema: secretsSchema })
}
