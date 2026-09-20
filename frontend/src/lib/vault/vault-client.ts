import { apiClient, type ApiClient } from '@/lib/api'
import { secretsSchema, type Secrets } from '@/lib/types'

/**
 * Path of the backend proxy that resolves the vault secrets.
 *
 * The browser never talks to the vault directly: the API key stays on the
 * backend and this endpoint only returns the configuration the frontend is
 * allowed to read. Contract assumed to match `config.GetSecrets`: a flat
 * `key -> value` map.
 */
export const CONFIG_PATH = '/config'

/**
 * Frontend counterpart of the backend `VaultClient`.
 *
 * It exposes the same shape (a `key -> value` map plus a `getSecret` helper)
 * but reads from the backend `/config` proxy instead of the vault service.
 */
export class VaultClient {
  private readonly client: ApiClient

  constructor(client: ApiClient = apiClient) {
    this.client = client
  }

  async getSecrets(): Promise<Secrets> {
    return this.client.get(CONFIG_PATH, { schema: secretsSchema })
  }

  async getSecret(key: string): Promise<string | undefined> {
    const secrets = await this.getSecrets()
    return secrets[key]
  }
}

export const vaultClient = new VaultClient()
