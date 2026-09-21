import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'

import { ThemeProvider } from '@/components/theme/theme-provider'

import App from './App'

function renderApp(initialEntries: string[] = ['/']) {
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={initialEntries}>
        <App />
      </MemoryRouter>
    </ThemeProvider>,
  )
}

describe('App', () => {
  it('opens the notes editor at the root route', () => {
    renderApp()

    expect(screen.getByRole('heading', { name: 'Notes' })).toBeInTheDocument()
  })

  it('opens the planner board at /planner', () => {
    renderApp(['/planner'])

    expect(screen.getByRole('heading', { name: 'Planner' })).toBeInTheDocument()
  })

  it('renders not found for unknown routes', () => {
    renderApp(['/unknown'])

    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
  })

  it('navigates between sections from the header', () => {
    renderApp()

    fireEvent.click(screen.getByRole('link', { name: 'Planner' }))

    expect(screen.getByRole('heading', { name: 'Planner' })).toBeInTheDocument()
  })
})
