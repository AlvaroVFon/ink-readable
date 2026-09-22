import { z } from 'zod'

import {
  taskSchema,
  type CreateTaskInput,
  type Task,
  type TaskStatus,
  type UpdateTaskDescriptionInput,
  type UpdateTaskPositionInput,
  type UpdateTaskStatusInput,
  type UpdateTaskTitleInput,
} from '@/lib/types'

import { apiClient, type ApiClient } from './api-client'

const taskListSchema = z.array(taskSchema)

/**
 * Lists the tasks of a project, ordered by position (ascending) on the
 * backend.
 */
export function listTasks(projectId: string, client: ApiClient = apiClient): Promise<Task[]> {
  return client.get(`/projects/${projectId}/tasks`, { schema: taskListSchema })
}

/**
 * Creates a task under a project.
 *
 * The backend does not accept a position on creation (new tasks default to
 * `1`), so callers that care about ordering assign a position afterwards.
 */
export function createTask(
  projectId: string,
  input: CreateTaskInput,
  client: ApiClient = apiClient,
): Promise<Task> {
  return client.post(`/projects/${projectId}/tasks`, input, { schema: taskSchema })
}

/**
 * Reads a single task by id.
 */
export function getTask(id: string, client: ApiClient = apiClient): Promise<Task> {
  return client.get(`/tasks/${id}`, { schema: taskSchema })
}

export function updateTaskTitle(
  id: string,
  input: UpdateTaskTitleInput,
  client: ApiClient = apiClient,
): Promise<void> {
  return client.patch(`/tasks/${id}/title`, input)
}

export function updateTaskDescription(
  id: string,
  input: UpdateTaskDescriptionInput,
  client: ApiClient = apiClient,
): Promise<void> {
  return client.patch(`/tasks/${id}/description`, input)
}

export function updateTaskStatus(
  id: string,
  status: TaskStatus,
  client: ApiClient = apiClient,
): Promise<void> {
  const input: UpdateTaskStatusInput = { status }
  return client.patch(`/tasks/${id}/status`, input)
}

/**
 * Moves a task within its column. The backend rejects `position <= 0` with a
 * `400`, so callers must send a positive integer.
 */
export function updateTaskPosition(
  id: string,
  position: number,
  client: ApiClient = apiClient,
): Promise<void> {
  const input: UpdateTaskPositionInput = { position }
  return client.patch(`/tasks/${id}/position`, input)
}

/**
 * Hard-deletes a task. There is no trash for tasks.
 */
export function deleteTask(id: string, client: ApiClient = apiClient): Promise<void> {
  return client.delete(`/tasks/${id}`)
}
