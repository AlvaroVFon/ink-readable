import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { CreateTaskInput, Task, TaskStatus } from '@/lib/types'

import {
  createTask as createTaskRequest,
  deleteTask as deleteTaskRequest,
  listTasks,
  updateTaskDescription,
  updateTaskPosition,
  updateTaskStatus,
  updateTaskTitle,
} from '@/lib/api'

import { groupByStatus, positionUpdates, reorderColumnIds } from '../lib/task-order'

export type CreatePlannerTaskInput = CreateTaskInput & { status?: TaskStatus }

export type UpdateTaskInput = {
  title?: string
  description?: string
  status?: TaskStatus
}

export type UseProjectTasksResult = {
  tasks: Task[]
  tasksByStatus: Record<TaskStatus, Task[]>
  isLoading: boolean
  error: Error | null
  revision: number
  refresh: () => Promise<void>
  createTask: (input: CreatePlannerTaskInput) => Promise<Task>
  updateTask: (id: string, input: UpdateTaskInput) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  moveTask: (id: string, status: TaskStatus, targetIndex: number) => Promise<void>
}

function toError(cause: unknown): Error {
  return cause instanceof Error ? cause : new Error('Unable to load the tasks')
}

/**
 * Loads the tasks of a project and exposes task mutations plus the kanban
 * grouping.
 *
 * Requests are tagged so a slow response for a previous project can never
 * overwrite the tasks of the project currently open (switch races).
 */
export function useProjectTasks(projectId: string | undefined): UseProjectTasksResult {
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(projectId !== undefined)
  const [error, setError] = useState<Error | null>(null)
  const [revision, setRevision] = useState(0)
  const requestIdRef = useRef(0)

  const load = useCallback(async (id: string | undefined, requestId: number) => {
    if (id === undefined) {
      return
    }
    try {
      const result = await listTasks(id)
      if (requestIdRef.current !== requestId) {
        return
      }
      setTasks(result)
      setError(null)
    } catch (cause) {
      if (requestIdRef.current !== requestId) {
        return
      }
      setTasks([])
      setError(toError(cause))
    } finally {
      if (requestIdRef.current === requestId) {
        setIsLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId
    if (projectId === undefined) {
      // oxlint-disable-next-line react/set-state-in-effect -- clearing state when there is no active project
      setTasks([])
      setError(null)
      setIsLoading(false)
      return
    }
    // oxlint-disable-next-line react/set-state-in-effect -- loading the tasks when the project changes
    setIsLoading(true)
    void load(projectId, requestId)
  }, [projectId, load])

  const refresh = useCallback(async () => {
    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId
    await load(projectId, requestId)
    setRevision((value) => value + 1)
  }, [projectId, load])

  const tasksByStatus = useMemo(() => groupByStatus(tasks), [tasks])

  const createTask = useCallback(
    async (input: CreatePlannerTaskInput) => {
      if (projectId === undefined) {
        throw new Error('No project selected')
      }
      const status = input.status ?? 'backlog'
      const created = await createTaskRequest(projectId, {
        title: input.title,
        description: input.description,
      })
      if (status !== created.status) {
        await updateTaskStatus(created.id, status)
      }
      const maxPosition = tasksByStatus[status].reduce(
        (max, task) => Math.max(max, task.position),
        0,
      )
      await updateTaskPosition(created.id, maxPosition + 1)
      await refresh()
      return created
    },
    [projectId, tasksByStatus, refresh],
  )

  const updateTask = useCallback(
    async (id: string, input: UpdateTaskInput) => {
      const current = tasks.find((task) => task.id === id)
      if (current === undefined) {
        return
      }
      if (input.title !== undefined && input.title !== current.title) {
        await updateTaskTitle(id, { title: input.title })
      }
      if (input.description !== undefined && input.description !== current.description) {
        await updateTaskDescription(id, { description: input.description })
      }
      if (input.status !== undefined && input.status !== current.status) {
        await updateTaskStatus(id, input.status)
      }
      await refresh()
    },
    [tasks, refresh],
  )

  const deleteTask = useCallback(
    async (id: string) => {
      await deleteTaskRequest(id)
      await refresh()
    },
    [refresh],
  )

  const moveTask = useCallback(
    async (id: string, status: TaskStatus, targetIndex: number) => {
      const moved = tasks.find((task) => task.id === id)
      if (moved === undefined) {
        return
      }
      const orderedIds = reorderColumnIds(tasksByStatus[status], id, targetIndex)
      const currentById = new Map(tasks.map((task) => [task.id, task]))
      const updates = positionUpdates(orderedIds, currentById)

      if (moved.status !== status) {
        await updateTaskStatus(id, status)
      }
      await Promise.all(updates.map((update) => updateTaskPosition(update.id, update.position)))
      await refresh()
    },
    [tasks, tasksByStatus, refresh],
  )

  return {
    tasks,
    tasksByStatus,
    isLoading,
    error,
    revision,
    refresh,
    createTask,
    updateTask,
    deleteTask,
    moveTask,
  }
}
