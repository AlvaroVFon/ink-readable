import MockAdapter from 'axios-mock-adapter'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createHttpClient } from '@/lib/http'

import { ApiClient } from './api-client'
import { CONFIG_PATH, fetchSecrets } from './config'

describe('fetchSecrets', () => {
  let client: ApiClient
  let mock: MockAdapter

  beforeEach(() => {
    const httpClient = createHttpClient()
    mock = new MockAdapter(httpClient)
    client = new ApiClient(httpClient)
  })

  afterEach(() => {
    mock.restore()
  })

  it('reads the flat secret map from the backend proxy', async () => {
    mock.onGet(CONFIG_PATH).reply(200, {
      'app.baseURL': 'localhost',
      'app.port': '8080',
    })

    const secrets = await fetchSecrets(client)

    expect(secrets).toEqual({ 'app.baseURL': 'localhost', 'app.port': '8080' })
    expect(mock.history.get[0]?.url).toBe(CONFIG_PATH)
  })

  it('rejects when the proxy payload does not match the schema', async () => {
    mock.onGet(CONFIG_PATH).reply(200, { 'app.port': 8080 })

    await expect(fetchSecrets(client)).rejects.toThrow()
  })

  it('propagates the normalized ApiError', async () => {
    mock.onGet(CONFIG_PATH).reply(500, { error: 'vault unavailable' })

    await expect(fetchSecrets(client)).rejects.toMatchObject({
      name: 'ApiError',
      status: 500,
      message: 'vault unavailable',
    })
  })
})
