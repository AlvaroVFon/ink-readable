import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Project, Task, TaskStatus } from '@/lib/types'

import type { UseProjectTasksResult } from './hooks/use-project-tasks'

import { PlannerBoard } from './planner-board'

const { usePlannerProjectsContext, useProjectTasks } = vi.hoisted(() => ({
  usePlannerProjectsContext: vi.fn(),
  useProjectTasks: vi.fn(),
}))

vi.mock('./planner-projects-context', () => ({ usePlannerProjectsContext }))
vi.mock('./hooks/use-project-tasks', () => ({ useProjectTasks }))

const website: Project = {
  id: 'p1',
  name: 'Website',
  deleted: false,
  createdAt: '',
  updatedAt: '',
}

function task(id: string, title: string, status: TaskStatus, position: number): Task {
  return {
    id,
    projectId: 'p1',
    title,
    description: '',
    status,
    position,
    createdAt: '2026-09-20T10:00:00Z',
    updatedAt: '2026-09-20T10:00:00Z',
  }
}

const backlogTask = task('t1', 'Design the board', 'backlog', 1)
const todoTask = task('t2', 'Write docs', 'todo', 1)

type TasksOverrides = Partial<UseProjectTasksResult>

function mockTasks(overrides: TasksOverrides = {}) {
  useProjectTasks.mockReturnValue({
    tasks: [backlogTask, todoTask],
    tasksByStatus: {
      backlog: [backlogTask],
      todo: [todoTask],
      in_progress: [],
      done: [],
    },
    isLoading: false,
    error: null,
    revision: 0,
    refresh: vi.fn(),
    createTask: vi.fn(),
    updateTask: vi.fn(),
    deleteTask: vi.fn(),
    moveTask: vi.fn(),
    ...overrides,
  })
}

function renderBoard() {
  return render(
    <MemoryRouter initialEntries={['/planner/p1']}>
      <Routes>
        <Route
          element={<PlannerBoard />}
          path='/planner/:projectId'
        />
      </Routes>
    </MemoryRouter>,
  )
}

describe('PlannerBoard', () => {
  beforeEach(() => {
    usePlannerProjectsContext.mockReset()
    useProjectTasks.mockReset()
    usePlannerProjectsContext.mockReturnValue({
      projects: [website],
      isLoading: false,
      error: null,
      refresh: vi.fn(),
      createProject: vi.fn(),
      renameProject: vi.fn(),
      deleteProject: vi.fn(),
    })
  })

  it('renders the project name, columns and tasks', () => {
    mockTasks()

    renderBoard()

    expect(screen.getByRole('heading', { name: 'Website' })).toBeInTheDocument()
    expect(screen.getByText('Design the board')).toBeInTheDocument()
    expect(screen.getByText('Write docs')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'New task in Backlog' })).toBeInTheDocument()
  })

  it('creates a task from the new task button', async () => {
    const createTask = vi.fn().mockResolvedValue(backlogTask)
    mockTasks({ createTask })

    renderBoard()

    fireEvent.click(screen.getByRole('button', { name: 'New task' }))
    fireEvent.change(screen.getByPlaceholderText('Task title'), {
      target: { value: 'Ship it' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create task' }))

    await waitFor(() =>
      expect(createTask).toHaveBeenCalledWith({
        title: 'Ship it',
        description: '',
        status: 'backlog',
      }),
    )
  })

  it('edits a task by clicking its card', async () => {
    const updateTask = vi.fn().mockResolvedValue(undefined)
    mockTasks({ updateTask })

    renderBoard()

    fireEvent.click(screen.getByText('Design the board'))
    fireEvent.change(screen.getByPlaceholderText('Task title'), {
      target: { value: 'Design the kanban' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() =>
      expect(updateTask).toHaveBeenCalledWith('t1', {
        title: 'Design the kanban',
        description: '',
        status: 'backlog',
      }),
    )
  })

  it('deletes a task from its card menu without opening the edit dialog', async () => {
    const deleteTask = vi.fn().mockResolvedValue(undefined)
    mockTasks({ deleteTask })

    renderBoard()

    fireEvent.click(screen.getByRole('button', { name: 'Actions for Design the board' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' }))

    await waitFor(() => expect(deleteTask).toHaveBeenCalledWith('t1'))
    expect(screen.queryByText('Edit task')).toBeNull()
  })

  it('moves a task across columns with drag and drop', async () => {
    const moveTask = vi.fn().mockResolvedValue(undefined)
    mockTasks({ moveTask })

    renderBoard()

    const card = screen.getByText('Design the board').closest('[draggable]')
    const todoColumn = screen.getByRole('button', { name: 'New task in Todo' }).closest('section')
    if (card === null || todoColumn === null) {
      throw new Error('expected the card and the todo column')
    }

    fireEvent.dragStart(card)
    fireEvent.dragOver(todoColumn)
    fireEvent.drop(todoColumn)

    await waitFor(() => expect(moveTask).toHaveBeenCalledWith('t1', 'todo', 1))
  })
})
