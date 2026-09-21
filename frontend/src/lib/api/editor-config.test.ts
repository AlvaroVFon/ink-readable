import MockAdapter from 'axios-mock-adapter'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createHttpClient } from '@/lib/http'

import { ApiClient } from './api-client'
import {
  EDITOR_CONFIG_PATH,
  fetchEditorConfig,
  updateEditorConfigDarkTheme,
  updateEditorConfigFormatOnSave,
  updateEditorConfigVimMotion,
} from './editor-config'

describe('editor config api', () => {
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

  it('reads the editor config', async () => {
    mock
      .onGet(EDITOR_CONFIG_PATH)
      .reply(200, { id: 'default', darkTheme: true, vimMotion: false, formatOnSave: true })

    const config = await fetchEditorConfig(client)

    expect(config).toEqual({
      id: 'default',
      darkTheme: true,
      vimMotion: false,
      formatOnSave: true,
    })
    expect(mock.history.get[0]?.url).toBe(EDITOR_CONFIG_PATH)
  })

  it('rejects when the payload does not match the schema', async () => {
    mock
      .onGet(EDITOR_CONFIG_PATH)
      .reply(200, { id: 'default', darkTheme: 'yes', vimMotion: false, formatOnSave: true })

    await expect(fetchEditorConfig(client)).rejects.toThrow()
  })

  it('patches the dark theme preference', async () => {
    mock.onPatch(`${EDITOR_CONFIG_PATH}/dark-theme`).reply(204)

    await expect(updateEditorConfigDarkTheme(false, client)).resolves.toBeUndefined()
    expect(mock.history.patch[0]?.url).toBe(`${EDITOR_CONFIG_PATH}/dark-theme`)
    expect(mock.history.patch[0]?.data).toBe(JSON.stringify({ darkTheme: false }))
  })

  it('patches the vim motion preference', async () => {
    mock.onPatch(`${EDITOR_CONFIG_PATH}/vim-motion`).reply(204)

    await expect(updateEditorConfigVimMotion(true, client)).resolves.toBeUndefined()
    expect(mock.history.patch[0]?.url).toBe(`${EDITOR_CONFIG_PATH}/vim-motion`)
    expect(mock.history.patch[0]?.data).toBe(JSON.stringify({ vimMotion: true }))
  })

  it('patches the format on save preference', async () => {
    mock.onPatch(`${EDITOR_CONFIG_PATH}/format-on-save`).reply(204)

    await expect(updateEditorConfigFormatOnSave(false, client)).resolves.toBeUndefined()
    expect(mock.history.patch[0]?.url).toBe(`${EDITOR_CONFIG_PATH}/format-on-save`)
    expect(mock.history.patch[0]?.data).toBe(JSON.stringify({ formatOnSave: false }))
  })
})
