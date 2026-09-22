import MockAdapter from 'axios-mock-adapter'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createHttpClient } from '@/lib/http'

import { ApiClient } from './api-client'
import {
  createTask,
  deleteTask,
  getTask,
  listTasks,
  updateTaskDescription,
  updateTaskPosition,
  updateTaskStatus,
  updateTaskTitle,
} from './tasks'

const task = {
  id: 'task-1',
  projectId: 'project-1',
  title: 'Design the board',
  description: '',
  status: 'backlog',
  position: 1,
  createdAt: '2026-09-20T10:00:00Z',
  updatedAt: '2026-09-20T10:00:00Z',
}

describe('tasks api', () => {
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

  it('lists the tasks of a project', async () => {
    mock.onGet('/projects/project-1/tasks').reply(200, [task])

    await expect(listTasks('project-1', client)).resolves.toEqual([task])
  })

  it('creates a task with title and description only', async () => {
    mock.onPost('/projects/project-1/tasks').reply(201, task)

    await expect(
      createTask('project-1', { title: 'Design the board', description: 'Sketch it' }, client),
    ).resolves.toEqual(task)
    expect(mock.history.post[0]?.data).toBe(
      JSON.stringify({ title: 'Design the board', description: 'Sketch it' }),
    )
  })

  it('reads a task by id', async () => {
    mock.onGet('/tasks/task-1').reply(200, task)

    await expect(getTask('task-1', client)).resolves.toEqual(task)
  })

  it('updates the title', async () => {
    mock.onPatch('/tasks/task-1/title').reply(204)

    await updateTaskTitle('task-1', { title: 'New title' }, client)
    expect(mock.history.patch[0]?.data).toBe(JSON.stringify({ title: 'New title' }))
  })

  it('updates the description', async () => {
    mock.onPatch('/tasks/task-1/description').reply(204)

    await updateTaskDescription('task-1', { description: 'More detail' }, client)
    expect(mock.history.patch[0]?.data).toBe(JSON.stringify({ description: 'More detail' }))
  })

  it('updates the status', async () => {
    mock.onPatch('/tasks/task-1/status').reply(204)

    await updateTaskStatus('task-1', 'in_progress', client)
    expect(mock.history.patch[0]?.data).toBe(JSON.stringify({ status: 'in_progress' }))
  })

  it('updates the position', async () => {
    mock.onPatch('/tasks/task-1/position').reply(204)

    await updateTaskPosition('task-1', 3, client)
    expect(mock.history.patch[0]?.data).toBe(JSON.stringify({ position: 3 }))
  })

  it('deletes a task', async () => {
    mock.onDelete('/tasks/task-1').reply(204)

    await expect(deleteTask('task-1', client)).resolves.toBeUndefined()
  })
})
