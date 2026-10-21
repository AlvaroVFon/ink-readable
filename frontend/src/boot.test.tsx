import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { Boot } from './boot'

describe('Boot', () => {
  afterEach(() => {
    window.location.hash = ''
  })

  it('renders the app at the root route in the browser', () => {
    render(<Boot />)

    expect(screen.getByRole('heading', { name: 'No note open' })).toBeInTheDocument()
  })

  it('routes to the hash target (HashRouter)', () => {
    window.location.hash = '#/planner'

    render(<Boot />)

    expect(screen.getByRole('heading', { name: 'No project selected' })).toBeInTheDocument()
  })
})
