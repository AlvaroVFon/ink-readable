import MockAdapter from 'axios-mock-adapter'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { z } from 'zod'

import { createHttpClient } from '@/lib/http'
import { vaultSchema } from '@/lib/types'

import { ApiClient } from './api-client'

const vault = {
  id: '2f0d2f2a-0000-4000-8000-000000000000',
  name: 'Notes',
  deleted: false,
  createdAt: '2026-09-20T10:00:00Z',
  updatedAt: '2026-09-20T10:00:00Z',
}

describe('ApiClient', () => {
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

  it('performs a GET and parses the response with the schema', async () => {
    mock.onGet('/vaults').reply(200, [vault])

    const vaults = await client.get('/vaults', { schema: z.array(vaultSchema) })

    expect(vaults).toEqual([vault])
  })

  it('performs a POST sending the body as JSON', async () => {
    mock.onPost('/vaults').reply(201, vault)

    const created = await client.post('/vaults', { name: 'Notes' }, { schema: vaultSchema })

    expect(created).toEqual(vault)
    expect(mock.history.post).toHaveLength(1)
    expect(mock.history.post[0]?.data).toBe(JSON.stringify({ name: 'Notes' }))
  })

  it('performs a PATCH', async () => {
    mock.onPatch('/documents/1/move').reply(204)

    const result = await client.patch('/documents/1/move', { path: '/new.md' })

    expect(result).toBeUndefined()
    expect(mock.history.patch).toHaveLength(1)
  })

  it('performs a DELETE', async () => {
    mock.onDelete('/vaults/1').reply(204)

    const result = await client.delete('/vaults/1')

    expect(result).toBeUndefined()
    expect(mock.history.delete).toHaveLength(1)
  })

  it('returns the raw body when no schema is provided', async () => {
    mock.onGet('/vaults').reply(200, [vault])

    const vaults = await client.get<(typeof vault)[]>('/vaults')

    expect(vaults).toEqual([vault])
  })

  it('rejects when the response does not match the schema', async () => {
    mock.onGet('/vaults').reply(200, [{ id: 'missing-fields' }])

    await expect(client.get('/vaults', { schema: z.array(vaultSchema) })).rejects.toThrow()
  })

  it('propagates the normalized ApiError', async () => {
    mock.onGet('/vaults').reply(404, { error: 'sql: no rows in result set' })

    await expect(client.get('/vaults')).rejects.toMatchObject({
      name: 'ApiError',
      status: 404,
      message: 'sql: no rows in result set',
    })
  })

  it('uses the shared singleton by default', async () => {
    mock.onGet('/health').reply(200, { status: 'ok' })

    const response = await client.get('/health')

    expect(response).toEqual({ status: 'ok' })
  })
})
