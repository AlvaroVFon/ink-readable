import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Project } from '@/lib/types'

import { SidebarProvider } from '@/components/ui/sidebar'

import type { UsePlannerProjectsResult } from './hooks/use-planner-projects'

import { PlannerSidebar } from './planner-sidebar'

const { usePlannerProjectsContext } = vi.hoisted(() => ({
  usePlannerProjectsContext: vi.fn(),
}))

vi.mock('./planner-projects-context', () => ({ usePlannerProjectsContext }))

const website: Project = {
  id: 'p1',
  name: 'Website',
  deleted: false,
  createdAt: '',
  updatedAt: '',
}

type ProjectsOverrides = Partial<UsePlannerProjectsResult>

function mockProjects(overrides: ProjectsOverrides = {}) {
  usePlannerProjectsContext.mockReturnValue({
    projects: [website],
    isLoading: false,
    error: null,
    refresh: vi.fn(),
    createProject: vi.fn(),
    renameProject: vi.fn(),
    deleteProject: vi.fn(),
    ...overrides,
  })
}

function renderSidebar() {
  return render(
    <SidebarProvider>
      <MemoryRouter initialEntries={['/planner']}>
        <PlannerSidebar />
      </MemoryRouter>
    </SidebarProvider>,
  )
}

describe('PlannerSidebar', () => {
  beforeEach(() => {
    usePlannerProjectsContext.mockReset()
  })

  it('renders the project links', () => {
    mockProjects()

    renderSidebar()

    expect(screen.getByRole('link', { name: 'Website' })).toHaveAttribute('href', '/planner/p1')
  })

  it('shows a call to action when there are no projects', () => {
    mockProjects({ projects: [] })

    renderSidebar()

    expect(screen.getByText('No projects yet.')).toBeInTheDocument()
  })

  it('creates a project from the header button', async () => {
    const createProject = vi.fn().mockResolvedValue(website)
    mockProjects({ createProject })

    renderSidebar()

    fireEvent.click(screen.getByRole('button', { name: 'New project' }))
    fireEvent.change(screen.getByLabelText('Project name'), { target: { value: 'Website' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create project' }))

    await waitFor(() => expect(createProject).toHaveBeenCalledWith('Website'))
  })

  it('renames a project from its actions menu', async () => {
    const renameProject = vi.fn().mockResolvedValue(undefined)
    mockProjects({ renameProject })

    renderSidebar()

    fireEvent.click(screen.getByRole('button', { name: 'Actions for Website' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Rename' }))

    const input = screen.getByLabelText('Project name')
    expect(input).toHaveValue('Website')

    fireEvent.change(input, { target: { value: 'Blog' } })
    fireEvent.click(screen.getByRole('button', { name: 'Rename' }))

    await waitFor(() => expect(renameProject).toHaveBeenCalledWith('p1', 'Blog'))
  })

  it('deletes a project after confirmation', async () => {
    const deleteProject = vi.fn().mockResolvedValue(undefined)
    mockProjects({ deleteProject })

    renderSidebar()

    fireEvent.click(screen.getByRole('button', { name: 'Actions for Website' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete project' }))

    await waitFor(() => expect(deleteProject).toHaveBeenCalledWith('p1'))
  })
})
