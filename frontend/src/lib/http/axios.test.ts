import MockAdapter from 'axios-mock-adapter'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { API_BASE_URL, API_TIMEOUT_MS, ApiError, createHttpClient } from './axios'

async function captureError(request: Promise<unknown>): Promise<ApiError> {
  try {
    await request
  } catch (cause) {
    if (cause instanceof ApiError) {
      return cause
    }
    throw cause
  }
  throw new Error('expected the request to reject')
}

describe('createHttpClient', () => {
  let client: ReturnType<typeof createHttpClient>
  let mock: MockAdapter

  beforeEach(() => {
    client = createHttpClient()
    mock = new MockAdapter(client)
  })

  afterEach(() => {
    mock.restore()
  })

  it('applies the API defaults', () => {
    expect(client.defaults.baseURL).toBe(API_BASE_URL)
    expect(client.defaults.timeout).toBe(API_TIMEOUT_MS)
    expect(client.defaults.headers['Content-Type']).toBe('application/json')
  })

  it('resolves with the response body', async () => {
    mock.onGet('/vaults').reply(200, [{ id: '1' }])

    const response = await client.get('/vaults')

    expect(response.status).toBe(200)
    expect(response.data).toEqual([{ id: '1' }])
  })

  it('normalizes a backend error payload', async () => {
    mock.onPost('/vaults').reply(400, { error: 'invalid empty argument: "name"' })

    const error = await captureError(client.post('/vaults', {}))

    expect(error.status).toBe(400)
    expect(error.message).toBe('invalid empty argument: "name"')
  })

  it('maps a not found response', async () => {
    mock.onGet('/vaults/missing').reply(404, { error: 'sql: no rows in result set' })

    const error = await captureError(client.get('/vaults/missing'))

    expect(error.status).toBe(404)
  })

  it('falls back to the axios message when the body has no error field', async () => {
    mock.onGet('/vaults').reply(500, 'boom')

    const error = await captureError(client.get('/vaults'))

    expect(error.status).toBe(500)
    expect(error.message).not.toBe('')
  })

  it('maps network failures to status 0', async () => {
    mock.onGet('/vaults').networkError()

    const error = await captureError(client.get('/vaults'))

    expect(error.status).toBe(0)
    expect(error.message).toBe('Unable to reach the server')
  })

  it('maps timeouts to status 0', async () => {
    mock.onGet('/vaults').timeout()

    const error = await captureError(client.get('/vaults'))

    expect(error.status).toBe(0)
  })
})
