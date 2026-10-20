import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ThemeProvider } from '@/components/theme/theme-provider'

import { InterfaceDocsPage } from './interface-docs-page'
import { INTERFACE_DOCS_STORAGE_KEY } from './lib/preferences'

const { saveMarkdownFile, printWindow } = vi.hoisted(() => ({
  saveMarkdownFile: vi.fn(),
  printWindow: vi.fn(),
}))

vi.mock('mermaid', () => ({
  default: { initialize: vi.fn(), render: vi.fn() },
}))
vi.mock('@/lib/tauri', () => ({ saveMarkdownFile, printWindow }))

function renderPage() {
  return render(
    <ThemeProvider>
      <InterfaceDocsPage />
    </ThemeProvider>,
  )
}

function generatedMarkdown(): string {
  return screen.getByRole('textbox', { name: 'Generated Markdown' }).textContent ?? ''
}

describe('InterfaceDocsPage', () => {
  beforeEach(() => {
    window.localStorage.clear()
    saveMarkdownFile.mockReset().mockResolvedValue(true)
    printWindow.mockReset().mockResolvedValue(undefined)
  })

  it('previews the document for the TypeScript sample', async () => {
    renderPage()

    const preview = screen.getByRole('region', { name: 'Document preview' })
    await waitFor(() => {
      expect(preview.querySelector('h1')?.textContent).toBe('Interface agreement')
    })
    expect(preview.querySelector('h3')?.textContent).toBe('User')
    expect(preview.querySelectorAll('table').length).toBeGreaterThan(0)
  })

  it('switches source language, document language and options', async () => {
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Markdown' }))
    fireEvent.click(screen.getByRole('button', { name: 'Go' }))
    fireEvent.click(screen.getByRole('button', { name: 'Español' }))
    fireEvent.click(screen.getByRole('switch', { name: 'JSON examples' }))

    await waitFor(() => {
      expect(generatedMarkdown()).toContain('# Acuerdo de interfaz')
    })
    expect(generatedMarkdown()).toContain('UserStatus is the lifecycle of an account.')
    expect(generatedMarkdown()).not.toContain('```json')
  })

  it('uses the title and version and remembers preferences', async () => {
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Markdown' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Title' }), {
      target: { value: 'Partner API' },
    })
    fireEvent.change(screen.getByRole('textbox', { name: 'Version' }), {
      target: { value: '3.0' },
    })

    await waitFor(() => {
      expect(generatedMarkdown()).toContain('# Partner API')
    })
    expect(generatedMarkdown()).toContain('**Version:** 3.0')
    expect(JSON.parse(window.localStorage.getItem(INTERFACE_DOCS_STORAGE_KEY) ?? '{}')).toEqual({
      sourceId: 'typescript',
      title: 'Partner API',
      version: '3.0',
      locale: 'en',
      tableOfContents: true,
      examples: true,
      view: 'markdown',
    })
  })

  it('exports the document as Markdown named after its title', async () => {
    renderPage()
    fireEvent.change(screen.getByRole('textbox', { name: 'Title' }), {
      target: { value: 'Partner: API' },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Export document' }))
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Export as Markdown' }))

    await waitFor(() => {
      expect(saveMarkdownFile).toHaveBeenCalledWith(
        'Partner API.md',
        expect.stringMatching(/^# Partner: API\n/),
      )
    })
  })

  it('prints the rendered document for PDF export', async () => {
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Export document' }))
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Export as PDF' }))

    await waitFor(() => {
      expect(printWindow).toHaveBeenCalledTimes(1)
    })
    const printed = document.querySelector('.print-root')
    expect(printed?.querySelectorAll('h1')).toHaveLength(1)
    expect(printed?.querySelector('h1')?.textContent).toBe('Interface agreement')
  })
})
