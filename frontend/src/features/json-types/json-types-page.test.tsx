import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { ThemeProvider } from '@/components/theme/theme-provider'

import { JsonTypesPage } from './json-types-page'
import { JSON_TYPES_STORAGE_KEY } from './lib/preferences'

function renderPage() {
  return render(
    <ThemeProvider>
      <JsonTypesPage />
    </ThemeProvider>,
  )
}

function generatedCode(): string {
  return screen.getByRole('textbox', { name: 'Generated code' }).textContent ?? ''
}

describe('JsonTypesPage', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('generates TypeScript for the sample JSON', async () => {
    renderPage()

    await waitFor(() => {
      expect(generatedCode()).toContain('export interface Root {')
    })
    expect(generatedCode()).toContain('export interface Project {')
  })

  it('switches language and options', async () => {
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Go' }))
    await waitFor(() => {
      expect(generatedCode()).toContain('type Root struct {')
    })
    expect(generatedCode()).toContain('json:"pages,omitempty"')

    fireEvent.click(screen.getByRole('switch', { name: 'omitempty on optional fields' }))
    await waitFor(() => {
      expect(generatedCode()).toContain('json:"pages"`')
    })
  })

  it('renames the root type and remembers preferences', async () => {
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'type' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Root type' }), {
      target: { value: 'person' },
    })

    await waitFor(() => {
      expect(generatedCode()).toContain('export type Person = {')
    })
    expect(JSON.parse(window.localStorage.getItem(JSON_TYPES_STORAGE_KEY) ?? '{}')).toEqual({
      languageId: 'typescript',
      rootName: 'person',
      options: { typescript: { declaration: 'type' } },
    })
  })
})
