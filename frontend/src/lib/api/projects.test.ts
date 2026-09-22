import MockAdapter from 'axios-mock-adapter'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createHttpClient } from '@/lib/http'

import { ApiClient } from './api-client'
import { createProject, deleteProject, getProject, listProjects, renameProject } from './projects'

const project = {
  id: '2f0d2f2a-0000-4000-8000-000000000000',
  name: 'Website',
  deleted: false,
  createdAt: '2026-09-20T10:00:00Z',
  updatedAt: '2026-09-20T10:00:00Z',
}

describe('projects api', () => {
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

  it('lists projects', async () => {
    mock.onGet('/projects').reply(200, [project])

    await expect(listProjects(client)).resolves.toEqual([project])
    expect(mock.history.get[0]?.url).toBe('/projects')
  })

  it('rejects a payload that does not match the schema', async () => {
    mock.onGet('/projects').reply(200, [{ id: 'missing-fields' }])

    await expect(listProjects(client)).rejects.toThrow()
  })

  it('creates a project', async () => {
    mock.onPost('/projects').reply(201, project)

    await expect(createProject('Website', client)).resolves.toEqual(project)
    expect(mock.history.post[0]?.data).toBe(JSON.stringify({ name: 'Website' }))
  })

  it('reads a project by id', async () => {
    mock.onGet(`/projects/${project.id}`).reply(200, project)

    await expect(getProject(project.id, client)).resolves.toEqual(project)
  })

  it('renames a project through the bare PATCH endpoint', async () => {
    mock.onPatch(`/projects/${project.id}`).reply(204)

    await expect(renameProject(project.id, 'Blog', client)).resolves.toBeUndefined()
    expect(mock.history.patch[0]?.url).toBe(`/projects/${project.id}`)
    expect(mock.history.patch[0]?.data).toBe(JSON.stringify({ name: 'Blog' }))
  })

  it('deletes a project', async () => {
    mock.onDelete(`/projects/${project.id}`).reply(204)

    await expect(deleteProject(project.id, client)).resolves.toBeUndefined()
    expect(mock.history.delete[0]?.url).toBe(`/projects/${project.id}`)
  })
})
