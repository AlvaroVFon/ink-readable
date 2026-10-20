import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ThemeProvider } from '@/components/theme/theme-provider'

import { InterfaceDocsPage } from './interface-docs-page'
import { INTERFACE_DOCS_STORAGE_KEY } from './lib/preferences'

const { saveMarkdownFile, printWindow, openExternal } = vi.hoisted(() => ({
  saveMarkdownFile: vi.fn(),
  printWindow: vi.fn(),
  openExternal: vi.fn(),
}))

vi.mock('mermaid', () => ({
  default: { initialize: vi.fn(), render: vi.fn() },
}))
vi.mock('@/lib/tauri', () => ({ saveMarkdownFile, printWindow, openExternal }))

function renderPage() {
  return render(
    <ThemeProvider>
      <InterfaceDocsPage />
    </ThemeProvider>,
  )
}

function openSettings() {
  fireEvent.click(screen.getByRole('button', { name: 'Document settings' }))
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
    openSettings()
    fireEvent.click(await screen.findByText('Español'))
    fireEvent.click(screen.getByRole('switch', { name: 'JSON examples', hidden: true }))

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
      typography: {
        bodyFont: 'geist',
        headingFont: 'geist',
        baseSize: 15.2,
        codeSize: 100,
        lineHeight: 1.75,
        headingScale: 1,
      },
      headerImageHeight: 140,
      headerImageFit: 'cover',
    })
  })

  it('lets the document date be edited', async () => {
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Markdown' }))
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-01-31' } })

    await waitFor(() => {
      expect(generatedMarkdown()).toContain('**Date:** 2026-01-31')
    })
  })

  it('gives headings ids so the contents links resolve', async () => {
    renderPage()

    const preview = screen.getByRole('region', { name: 'Document preview' })
    await waitFor(() => {
      expect(preview.querySelector('h3')?.id).toBe('user')
    })
    const link = preview.querySelector('a[href="#user"]')
    expect(link).not.toBeNull()
    expect(preview.querySelector('#user')).toBe(preview.querySelector('h3'))
  })

  it('applies the typography settings to the preview', async () => {
    renderPage()

    openSettings()
    fireEvent.change(await screen.findByLabelText('Body font'), { target: { value: 'serif' } })
    fireEvent.change(screen.getByLabelText('Text size'), { target: { value: '18' } })

    const preview = screen.getByRole('region', { name: 'Document preview' })
    await waitFor(() => {
      expect(preview.style.getPropertyValue('--doc-font-size')).toBe('18px')
    })
    expect(preview.style.getPropertyValue('--doc-font-body')).toContain('Georgia')
  })

  it('shows the chosen header image in the preview and removes it', async () => {
    renderPage()

    openSettings()
    const input = await screen.findByLabelText('Header image file')
    fireEvent.change(input, {
      target: { files: [new File(['x'], 'cover.png', { type: 'image/png' })] },
    })

    const preview = screen.getByRole('region', { name: 'Document preview' })
    await waitFor(() => {
      expect(preview.querySelector('img.doc-header-image')).not.toBeNull()
    })

    fireEvent.click(screen.getByText('Remove'))
    await waitFor(() => {
      expect(preview.querySelector('img.doc-header-image')).toBeNull()
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
    // The printed pages are built from the measured source, which stays hidden.
    const printed = document.querySelector('.print-root .print-pages')
    expect(printed?.querySelectorAll('h1')).toHaveLength(1)
    expect(printed?.querySelector('h1')?.textContent).toBe('Interface agreement')
  })
})
