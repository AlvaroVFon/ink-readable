import { useCallback, useEffect, useState } from 'react'

import type { Project } from '@/lib/types'

import {
  createProject as createProjectRequest,
  deleteProject as deleteProjectRequest,
  listProjects,
  renameProject as renameProjectRequest,
} from '@/lib/api'

export type UsePlannerProjectsResult = {
  projects: Project[]
  isLoading: boolean
  error: Error | null
  refresh: () => Promise<void>
  createProject: (name: string) => Promise<Project>
  renameProject: (id: string, name: string) => Promise<void>
  deleteProject: (id: string) => Promise<void>
}

function toError(cause: unknown): Error {
  return cause instanceof Error ? cause : new Error('Unable to load the projects')
}

/**
 * Loads the active projects and exposes their mutations.
 *
 * Lives in a context so the planner sidebar (project list) and the board
 * (project name) share one source of truth.
 */
export function usePlannerProjects(): UsePlannerProjectsResult {
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const refresh = useCallback(async () => {
    try {
      setProjects(await listProjects())
      setError(null)
    } catch (cause) {
      setError(toError(cause))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- loading the projects on mount
    void refresh()
  }, [refresh])

  const createProject = useCallback(
    async (name: string) => {
      const trimmed = name.trim()
      if (trimmed === '') {
        throw new Error('Name cannot be empty')
      }
      const project = await createProjectRequest(trimmed)
      await refresh()
      return project
    },
    [refresh],
  )

  const renameProject = useCallback(
    async (id: string, name: string) => {
      const trimmed = name.trim()
      if (trimmed === '') {
        throw new Error('Name cannot be empty')
      }
      await renameProjectRequest(id, trimmed)
      await refresh()
    },
    [refresh],
  )

  const deleteProject = useCallback(
    async (id: string) => {
      await deleteProjectRequest(id)
      await refresh()
    },
    [refresh],
  )

  return { projects, isLoading, error, refresh, createProject, renameProject, deleteProject }
}
