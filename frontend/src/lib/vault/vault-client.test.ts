import MockAdapter from 'axios-mock-adapter'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { ApiClient } from '@/lib/api'
import { createHttpClient } from '@/lib/http'

import { CONFIG_PATH, VaultClient } from './vault-client'

describe('VaultClient', () => {
  let client: VaultClient
  let mock: MockAdapter

  beforeEach(() => {
    const httpClient = createHttpClient()
    mock = new MockAdapter(httpClient)
    client = new VaultClient(new ApiClient(httpClient))
  })

  afterEach(() => {
    mock.restore()
  })

  it('reads the flat secret map from the backend proxy', async () => {
    mock.onGet(CONFIG_PATH).reply(200, {
      'app.baseURL': 'localhost',
      'app.port': '8080',
    })

    const secrets = await client.getSecrets()

    expect(secrets).toEqual({ 'app.baseURL': 'localhost', 'app.port': '8080' })
    expect(mock.history.get[0]?.url).toBe(CONFIG_PATH)
  })

  it('returns a single secret by key', async () => {
    mock.onGet(CONFIG_PATH).reply(200, { 'app.port': '8080' })

    await expect(client.getSecret('app.port')).resolves.toBe('8080')
  })

  it('returns undefined for an unknown key', async () => {
    mock.onGet(CONFIG_PATH).reply(200, { 'app.port': '8080' })

    await expect(client.getSecret('missing')).resolves.toBeUndefined()
  })

  it('rejects when the proxy payload does not match the schema', async () => {
    mock.onGet(CONFIG_PATH).reply(200, { 'app.port': 8080 })

    await expect(client.getSecrets()).rejects.toThrow()
  })

  it('propagates the normalized ApiError', async () => {
    mock.onGet(CONFIG_PATH).reply(500, { error: 'vault unavailable' })

    await expect(client.getSecrets()).rejects.toMatchObject({
      name: 'ApiError',
      status: 500,
      message: 'vault unavailable',
    })
  })
})
