import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Project } from '@/lib/types'

import { usePlannerProjects } from './use-planner-projects'

const { listProjects, createProject, renameProject, deleteProject } = vi.hoisted(() => ({
  listProjects: vi.fn<() => Promise<Project[]>>(),
  createProject: vi.fn<(name: string) => Promise<Project>>(),
  renameProject: vi.fn<(id: string, name: string) => Promise<void>>(),
  deleteProject: vi.fn<(id: string) => Promise<void>>(),
}))

vi.mock('@/lib/api', () => ({ listProjects, createProject, renameProject, deleteProject }))

const website: Project = {
  id: 'p1',
  name: 'Website',
  deleted: false,
  createdAt: '',
  updatedAt: '',
}

describe('usePlannerProjects', () => {
  beforeEach(() => {
    listProjects.mockReset()
    createProject.mockReset()
    renameProject.mockReset()
    deleteProject.mockReset()
    listProjects.mockResolvedValue([website])
  })

  it('loads the projects', async () => {
    const { result } = renderHook(() => usePlannerProjects())

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.projects).toEqual([website])
    expect(result.current.error).toBeNull()
  })

  it('creates a project and refreshes the list', async () => {
    createProject.mockResolvedValue(website)
    const { result } = renderHook(() => usePlannerProjects())
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    let created: Project | undefined
    await act(async () => {
      created = await result.current.createProject('  Website  ')
    })

    expect(createProject).toHaveBeenCalledWith('Website')
    expect(created?.id).toBe('p1')
    expect(listProjects).toHaveBeenCalledTimes(2)
  })

  it('rejects an empty project name', async () => {
    const { result } = renderHook(() => usePlannerProjects())
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await expect(result.current.createProject('   ')).rejects.toThrow('Name cannot be empty')
    expect(createProject).not.toHaveBeenCalled()
  })

  it('renames a project', async () => {
    const { result } = renderHook(() => usePlannerProjects())
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      await result.current.renameProject('p1', 'Blog')
    })

    expect(renameProject).toHaveBeenCalledWith('p1', 'Blog')
  })

  it('deletes a project', async () => {
    const { result } = renderHook(() => usePlannerProjects())
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      await result.current.deleteProject('p1')
    })

    expect(deleteProject).toHaveBeenCalledWith('p1')
  })

  it('exposes the error when loading fails', async () => {
    listProjects.mockRejectedValue(new Error('boom'))
    const { result } = renderHook(() => usePlannerProjects())

    await waitFor(() => expect(result.current.error).not.toBeNull())
    expect(result.current.error?.message).toBe('boom')
  })
})
