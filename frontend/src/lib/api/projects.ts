import { z } from 'zod'

import { projectSchema, type Project } from '@/lib/types'

import { apiClient, type ApiClient } from './api-client'

const projectListSchema = z.array(projectSchema)

/**
 * Lists the active projects. Soft-deleted projects are filtered out by the
 * backend, so no query parameter is needed.
 */
export function listProjects(client: ApiClient = apiClient): Promise<Project[]> {
  return client.get('/projects', { schema: projectListSchema })
}

/**
 * Creates a project. Names are required by the backend.
 */
export function createProject(name: string, client: ApiClient = apiClient): Promise<Project> {
  return client.post('/projects', { name }, { schema: projectSchema })
}

/**
 * Reads a single project by id.
 */
export function getProject(id: string, client: ApiClient = apiClient): Promise<Project> {
  return client.get(`/projects/${id}`, { schema: projectSchema })
}

/**
 * Renames a project.
 *
 * The endpoint answers `204 No Content` (it does not return the updated
 * project), so callers refresh the list to see the new name.
 */
export function renameProject(
  id: string,
  name: string,
  client: ApiClient = apiClient,
): Promise<void> {
  return client.patch(`/projects/${id}`, { name })
}

/**
 * Soft-deletes a project (the backend keeps it recoverable by setting
 * `deleted_at`).
 */
export function deleteProject(id: string, client: ApiClient = apiClient): Promise<void> {
  return client.delete(`/projects/${id}`)
}
