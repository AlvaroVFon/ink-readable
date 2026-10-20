import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { ThemeProvider } from '@/components/theme/theme-provider'

import { JsonSchemaPage } from './json-schema-page'
import { JSON_SCHEMA_STORAGE_KEY } from './lib/preferences'

function generatedSchema(): string {
  return screen.getByRole('textbox', { name: 'Generated schema' }).textContent ?? ''
}

describe('JsonSchemaPage', () => {
  beforeEach(() => {
    window.localStorage.clear()
    render(
      <ThemeProvider>
        <JsonSchemaPage />
      </ThemeProvider>,
    )
  })

  it('generates a schema for the sample JSON', async () => {
    await waitFor(() => {
      expect(generatedSchema()).toContain(
        '"$schema": "https://json-schema.org/draft/2020-12/schema"',
      )
    })
    expect(generatedSchema()).toContain('"$ref": "#/$defs/Address"')
  })

  it('switches to declarations and to draft 07', async () => {
    fireEvent.click(screen.getByRole('button', { name: 'TypeScript' }))
    await waitFor(() => {
      expect(generatedSchema()).toContain('"title"')
    })

    fireEvent.click(screen.getByRole('button', { name: 'Draft 07' }))
    await waitFor(() => {
      expect(generatedSchema()).toContain('draft-07')
    })
    expect(JSON.parse(window.localStorage.getItem(JSON_SCHEMA_STORAGE_KEY) ?? '{}')).toMatchObject({
      sourceId: 'typescript',
      draft: '07',
    })
  })

  it('forbids additional properties on demand', async () => {
    fireEvent.click(screen.getByRole('switch', { name: 'Forbid additional properties' }))

    await waitFor(() => {
      expect(generatedSchema()).toContain('"additionalProperties": false')
    })
  })
})
