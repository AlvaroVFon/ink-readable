import { EditorView, lineNumberMarkers } from '@codemirror/view'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { UseEditorConfigResult } from '@/hooks/use-editor-config'
import type { Document } from '@/lib/types'

const { useEditorConfigContext } = vi.hoisted(() => ({ useEditorConfigContext: vi.fn() }))

vi.mock('@/components/editor-config/editor-config-context', () => ({ useEditorConfigContext }))

vi.mock('@/lib/api', () => ({
  updateDocumentContent: vi.fn().mockResolvedValue(undefined),
}))

import { NotesEditor } from './notes-editor'

const document: Document = {
  id: 'doc-1',
  name: 'Note',
  vaultId: 'vault-1',
  path: '/Note',
  content: '# Hello world',
  deleted: false,
  createdAt: '',
  updatedAt: '',
}

function setup(relativeLineNumbers = false, vimMotion = false) {
  useEditorConfigContext.mockReturnValue({
    config: {
      id: 'default',
      darkTheme: true,
      vimMotion,
      formatOnSave: true,
      relativeLineNumbers,
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

function contentElement(container: HTMLElement): HTMLElement {
  const content = container.querySelector<HTMLElement>('.cm-content')
  if (content === null) {
    throw new Error('editor content not mounted')
  }
  return content
}

describe('NotesEditor view modes', () => {
  beforeEach(() => {
    useEditorConfigContext.mockReset()
  })

  it('keeps the CodeMirror editor mounted when switching to preview and back', () => {
    const { container } = setup()
    expect(container.querySelector('.cm-editor')).not.toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Preview only' }))
    expect(container.querySelector('.cm-editor')).not.toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Editor only' }))
    expect(container.querySelector('.cm-editor')).not.toBeNull()
  })

  it('renders the preview after switching from editor to preview', () => {
    setup()

    fireEvent.click(screen.getByRole('button', { name: 'Editor only' }))
    fireEvent.click(screen.getByRole('button', { name: 'Preview only' }))

    expect(screen.getByRole('heading', { name: 'Hello world' })).toBeInTheDocument()
  })

  it('enables relative line numbers when the preference is on', () => {
    const { container } = setup(true)

    const ranges = editorView(container).state.facet(lineNumberMarkers)

    expect(ranges.some((range) => range.size > 0)).toBe(true)
  })

  it('leaves the default line numbers when the preference is off', () => {
    const { container } = setup(false)

    const ranges = editorView(container).state.facet(lineNumberMarkers)

    expect(ranges.every((range) => range.size === 0)).toBe(true)
  })
})

describe('NotesEditor Tab behaviour', () => {
  beforeEach(() => {
    useEditorConfigContext.mockReset()
  })

  it('indents instead of moving focus out of the editor', () => {
    const { container } = setup()
    const view = editorView(container)

    fireEvent.keyDown(contentElement(container), { key: 'Tab' })

    expect(view.state.doc.toString()).toBe('  # Hello world')
  })

  it('dedents on Shift-Tab', () => {
    const { container } = setup()
    const view = editorView(container)

    fireEvent.keyDown(contentElement(container), { key: 'Tab', shiftKey: true })

    expect(view.state.doc.toString()).toBe('# Hello world')
  })

  it('swallows Tab in vim normal mode without indenting', () => {
    const { container } = setup(false, true)
    const view = editorView(container)

    fireEvent.keyDown(contentElement(container), { key: 'Tab' })

    expect(view.state.doc.toString()).toBe('# Hello world')
  })

  it('indents with Tab in vim insert mode', () => {
    const { container } = setup(false, true)
    const view = editorView(container)

    fireEvent.keyDown(contentElement(container), { key: 'i' })
    fireEvent.keyDown(contentElement(container), { key: 'Tab' })

    expect(view.state.doc.toString()).toBe('  # Hello world')
  })
})

describe('NotesEditor vim status bar', () => {
  beforeEach(() => {
    useEditorConfigContext.mockReset()
  })

  it('renders the mode status bar when vim motion is enabled', () => {
    const { container } = setup(false, true)

    const panel = container.querySelector('.cm-vim-panel')

    expect(panel).not.toBeNull()
    expect(panel?.textContent).toContain('NORMAL')
  })

  it('omits the status bar when vim motion is disabled', () => {
    const { container } = setup(false, false)

    expect(container.querySelector('.cm-vim-panel')).toBeNull()
  })
})
