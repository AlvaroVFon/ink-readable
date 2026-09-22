import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Task } from '@/lib/types'

import { useProjectTasks } from './use-project-tasks'

const {
  listTasks,
  createTask,
  updateTaskTitle,
  updateTaskDescription,
  updateTaskStatus,
  updateTaskPosition,
  deleteTask,
} = vi.hoisted(() => ({
  listTasks: vi.fn<(projectId: string) => Promise<Task[]>>(),
  createTask: vi.fn<(projectId: string, input: unknown) => Promise<Task>>(),
  updateTaskTitle: vi.fn<(id: string, input: unknown) => Promise<void>>(),
  updateTaskDescription: vi.fn<(id: string, input: unknown) => Promise<void>>(),
  updateTaskStatus: vi.fn<(id: string, status: string) => Promise<void>>(),
  updateTaskPosition: vi.fn<(id: string, position: number) => Promise<void>>(),
  deleteTask: vi.fn<(id: string) => Promise<void>>(),
}))

vi.mock('@/lib/api', () => ({
  listTasks,
  createTask,
  updateTaskTitle,
  updateTaskDescription,
  updateTaskStatus,
  updateTaskPosition,
  deleteTask,
}))

function task(
  id: string,
  status: Task['status'],
  position: number,
  overrides: Partial<Task> = {},
): Task {
  return {
    id,
    projectId: 'p1',
    title: id,
    description: '',
    status,
    position,
    createdAt: '2026-09-20T10:00:00Z',
    updatedAt: '2026-09-20T10:00:00Z',
    ...overrides,
  }
}

describe('useProjectTasks', () => {
  beforeEach(() => {
    listTasks.mockReset()
    createTask.mockReset()
    updateTaskTitle.mockReset()
    updateTaskDescription.mockReset()
    updateTaskStatus.mockReset()
    updateTaskPosition.mockReset()
    deleteTask.mockReset()
    listTasks.mockResolvedValue([task('a', 'backlog', 1), task('b', 'todo', 1)])
  })

  it('loads and groups the tasks', async () => {
    const { result } = renderHook(() => useProjectTasks('p1'))

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.tasks).toHaveLength(2)
    expect(result.current.tasksByStatus.backlog.map((item) => item.id)).toEqual(['a'])
    expect(result.current.tasksByStatus.todo.map((item) => item.id)).toEqual(['b'])
  })

  it('does not load when there is no project', async () => {
    const { result } = renderHook(() => useProjectTasks(undefined))

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(listTasks).not.toHaveBeenCalled()
    expect(result.current.tasks).toEqual([])
  })

  it('creates a task and appends it to its column', async () => {
    listTasks.mockResolvedValue([task('a', 'backlog', 1), task('b', 'backlog', 2)])
    createTask.mockResolvedValue(task('new', 'backlog', 1))
    const { result } = renderHook(() => useProjectTasks('p1'))
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      await result.current.createTask({ title: 'New', description: '' })
    })

    expect(createTask).toHaveBeenCalledWith('p1', { title: 'New', description: '' })
    expect(updateTaskPosition).toHaveBeenCalledWith('new', 3)
  })

  it('creates a task directly in another column', async () => {
    createTask.mockResolvedValue(task('new', 'backlog', 1))
    const { result } = renderHook(() => useProjectTasks('p1'))
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      await result.current.createTask({ title: 'New', description: '', status: 'todo' })
    })

    expect(updateTaskStatus).toHaveBeenCalledWith('new', 'todo')
    expect(updateTaskPosition).toHaveBeenCalledWith('new', 2)
  })

  it('updates only the fields that changed', async () => {
    listTasks.mockResolvedValue([task('a', 'backlog', 1, { title: 'A', description: 'D' })])
    const { result } = renderHook(() => useProjectTasks('p1'))
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      await result.current.updateTask('a', { title: 'B' })
    })

    expect(updateTaskTitle).toHaveBeenCalledWith('a', { title: 'B' })
    expect(updateTaskDescription).not.toHaveBeenCalled()
    expect(updateTaskStatus).not.toHaveBeenCalled()
  })

  it('reorders positions within a column', async () => {
    listTasks.mockResolvedValue([
      task('a', 'backlog', 1),
      task('b', 'backlog', 2),
      task('c', 'backlog', 3),
    ])
    const { result } = renderHook(() => useProjectTasks('p1'))
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      await result.current.moveTask('c', 'backlog', 0)
    })

    expect(updateTaskStatus).not.toHaveBeenCalled()
    expect(updateTaskPosition).toHaveBeenCalledWith('c', 1)
    expect(updateTaskPosition).toHaveBeenCalledWith('a', 2)
    expect(updateTaskPosition).toHaveBeenCalledWith('b', 3)
  })

  it('changes status and reindexes when moving across columns', async () => {
    listTasks.mockResolvedValue([
      task('a', 'backlog', 1),
      task('b', 'backlog', 2),
      task('c', 'todo', 1),
    ])
    const { result } = renderHook(() => useProjectTasks('p1'))
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      await result.current.moveTask('a', 'todo', 0)
    })

    expect(updateTaskStatus).toHaveBeenCalledWith('a', 'todo')
    expect(updateTaskPosition).toHaveBeenCalledWith('c', 2)
  })

  it('deletes a task', async () => {
    const { result } = renderHook(() => useProjectTasks('p1'))
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      await result.current.deleteTask('a')
    })

    expect(deleteTask).toHaveBeenCalledWith('a')
  })

  it('exposes the error when loading fails', async () => {
    listTasks.mockRejectedValue(new Error('boom'))
    const { result } = renderHook(() => useProjectTasks('p1'))

    await waitFor(() => expect(result.current.error).not.toBeNull())
    expect(result.current.error?.message).toBe('boom')
  })
})
