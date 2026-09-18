import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import App from './App'

describe('App', () => {
  it('renders the workspace entry point', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: 'Ink Readable' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open workspace' })).toBeInTheDocument()
  })
})
