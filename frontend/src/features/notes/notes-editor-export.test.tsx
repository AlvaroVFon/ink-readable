import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { UseEditorConfigResult } from '@/hooks/use-editor-config'
import type { Document } from '@/lib/types'

import { ThemeProvider } from '@/components/theme/theme-provider'
import { SidebarProvider } from '@/components/ui/sidebar'

const { useEditorConfigContext, saveMarkdownFile, printWindow } = vi.hoisted(() => ({
  useEditorConfigContext: vi.fn(),
  saveMarkdownFile: vi.fn(),
  printWindow: vi.fn(),
}))

vi.mock('@/components/editor-config/editor-config-context', () => ({ useEditorConfigContext }))
vi.mock('@/lib/api', () => ({ updateDocumentContent: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/lib/tauri', () => ({ saveMarkdownFile, printWindow }))

import { NotesEditor } from './notes-editor'
import { NotesVimProvider } from './notes-vim-context'

const note: Document = {
  id: 'doc-1',
  name: 'Weekly: plan',
  vaultId: 'vault-1',
  path: '/Weekly',
  content: '# Hello world',
  deleted: false,
  createdAt: '',
  updatedAt: '',
}

function setup() {
  useEditorConfigContext.mockReturnValue({
    config: {
      id: 'default',
      darkTheme: true,
      vimMotion: false,
      formatOnSave: false,
      relativeLineNumbers: false,
    },
    isLoading: false,
    error: null,
    updateDarkTheme: vi.fn(),
    updateVimMotion: vi.fn(),
    updateFormatOnSave: vi.fn(),
    updateRelativeLineNumbers: vi.fn(),
    reload: vi.fn(),
  } satisfies UseEditorConfigResult)

  return render(
    <ThemeProvider>
      <NotesVimProvider>
        <SidebarProvider>
          <NotesEditor document={note} />
        </SidebarProvider>
      </NotesVimProvider>
    </ThemeProvider>,
  )
}

async function chooseExport(label: string) {
  fireEvent.click(screen.getByRole('button', { name: 'Export note' }))
  const item = await screen.findByRole('menuitem', { name: label })
  fireEvent.click(item)
}

describe('NotesEditor export', () => {
  beforeEach(() => {
    saveMarkdownFile.mockReset().mockResolvedValue(true)
    printWindow.mockReset().mockResolvedValue(undefined)
  })

  it('saves the live editor text as Markdown with a safe file name', async () => {
    setup()

    await chooseExport('Export as Markdown')

    await waitFor(() => {
      expect(saveMarkdownFile).toHaveBeenCalledWith('Weekly plan.md', '# Hello world')
    })
  })

  it('shows an error when the Markdown export fails', async () => {
    saveMarkdownFile.mockRejectedValue(new Error('disk full'))
    setup()

    await chooseExport('Export as Markdown')

    expect(await screen.findByText('Export failed')).toBeInTheDocument()
  })

  it('mounts a printable copy and opens the print dialog for PDF', async () => {
    setup()

    await chooseExport('Export as PDF')

    const printRoot = document.body.querySelector('.print-root')
    expect(printRoot).not.toBeNull()
    expect(printRoot?.textContent).toContain('Hello world')
    await waitFor(() => {
      expect(printWindow).toHaveBeenCalledOnce()
    })
    expect(document.title).toBe('Weekly plan')

    act(() => {
      window.dispatchEvent(new Event('afterprint'))
    })
    expect(document.title).not.toBe('Weekly plan')
  })
})
