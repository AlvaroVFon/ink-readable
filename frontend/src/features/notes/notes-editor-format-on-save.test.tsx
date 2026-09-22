import { EditorView } from '@codemirror/view'
import { act, fireEvent, render, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { UseEditorConfigResult } from '@/hooks/use-editor-config'
import type { Document } from '@/lib/types'

const { useEditorConfigContext } = vi.hoisted(() => ({ useEditorConfigContext: vi.fn() }))
const { formatMarkdown } = vi.hoisted(() => ({
  formatMarkdown: vi.fn<(content: string) => Promise<string>>(),
}))
const { updateDocumentContent } = vi.hoisted(() => ({
  updateDocumentContent: vi.fn<(id: string, content: string) => Promise<void>>(),
}))

vi.mock('@/components/editor-config/editor-config-context', () => ({ useEditorConfigContext }))
vi.mock('./lib/format-markdown', () => ({ formatMarkdown }))
vi.mock('@/lib/api', () => ({ updateDocumentContent }))

import { NotesEditor } from './notes-editor'

const document: Document = {
  id: 'doc-1',
  name: 'Note',
  vaultId: 'vault-1',
  path: '/Note',
  content: '#  Title\n',
  deleted: false,
  createdAt: '',
  updatedAt: '',
}

function setup(formatOnSave: boolean) {
  useEditorConfigContext.mockReturnValue({
    config: {
      id: 'default',
      darkTheme: true,
      vimMotion: false,
      formatOnSave,
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

  return render(<NotesEditor document={document} />)
}

function editorView(container: HTMLElement): EditorView {
  const editor = container.querySelector<HTMLElement>('.cm-editor')
  const view = editor === null ? null : EditorView.findFromDOM(editor)
  if (view === null) {
    throw new Error('editor not mounted')
  }
  return view
}

function typeIntoEditor(container: HTMLElement, value: string) {
  const view = editorView(container)
  view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: value } })
}

function pressSave(container: HTMLElement) {
  fireEvent.keyDown(editorView(container).contentDOM, { key: 's', ctrlKey: true })
}

describe('NotesEditor format on save', () => {
  beforeEach(() => {
    useEditorConfigContext.mockReset()
    formatMarkdown.mockReset()
    updateDocumentContent.mockReset()
    updateDocumentContent.mockResolvedValue(undefined)
  })

  it('formats the document on explicit save when enabled', async () => {
    formatMarkdown.mockResolvedValue('# Title\n')
    const { container } = setup(true)
    typeIntoEditor(container, '#  Changed\n')

    await act(async () => {
      pressSave(container)
    })

    await waitFor(() => expect(updateDocumentContent).toHaveBeenCalledWith('doc-1', '# Title\n'))
    expect(formatMarkdown).toHaveBeenCalledWith('#  Changed\n')
    await waitFor(() => expect(editorView(container).state.doc.toString()).toBe('# Title\n'))
  })

  it('saves the raw content when format on save is disabled', async () => {
    const { container } = setup(false)
    typeIntoEditor(container, '#  Changed\n')

    await act(async () => {
      pressSave(container)
    })

    await waitFor(() => expect(updateDocumentContent).toHaveBeenCalledWith('doc-1', '#  Changed\n'))
    expect(formatMarkdown).not.toHaveBeenCalled()
  })

  it('falls back to the raw content when formatting fails', async () => {
    formatMarkdown.mockRejectedValue(new Error('invalid markdown'))
    const { container } = setup(true)
    typeIntoEditor(container, '#  Changed\n')

    await act(async () => {
      pressSave(container)
    })

    await waitFor(() => expect(updateDocumentContent).toHaveBeenCalledWith('doc-1', '#  Changed\n'))
  })
})
