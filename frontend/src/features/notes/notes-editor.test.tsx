import { EditorView, lineNumberMarkers } from '@codemirror/view'
import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { UseEditorConfigResult } from '@/hooks/use-editor-config'
import type { Document } from '@/lib/types'

import { ThemeProvider } from '@/components/theme/theme-provider'
import { SidebarProvider } from '@/components/ui/sidebar'
import { MODE_STORAGE_KEY } from '@/lib/theme'

const { useEditorConfigContext } = vi.hoisted(() => ({ useEditorConfigContext: vi.fn() }))

vi.mock('@/components/editor-config/editor-config-context', () => ({ useEditorConfigContext }))

vi.mock('@/lib/api', () => ({
  updateDocumentContent: vi.fn().mockResolvedValue(undefined),
}))

import { NotesEditor } from './notes-editor'
import { NotesVimProvider } from './notes-vim-context'

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

function setup(relativeLineNumbers = false, vimMotion = false, darkTheme = true) {
  useEditorConfigContext.mockReturnValue({
    config: {
      id: 'default',
      darkTheme,
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

  window.localStorage.setItem(MODE_STORAGE_KEY, darkTheme ? 'dark' : 'light')

  return render(
    <ThemeProvider>
      <NotesVimProvider>
        <SidebarProvider>
          <NotesEditor document={document} />
        </SidebarProvider>
      </NotesVimProvider>
    </ThemeProvider>,
  )
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

function panes(container: HTMLElement) {
  const editorPane = container.querySelector('.cm-editor')?.closest('.overflow-hidden')
  const previewPane = screen.getByRole('heading', { name: 'Hello world' }).closest('.overflow-auto')
  if (!editorPane || !previewPane) {
    throw new Error('panes not mounted')
  }
  return { editorPane, previewPane }
}

describe('NotesEditor pane order', () => {
  beforeEach(() => {
    useEditorConfigContext.mockReset()
  })

  afterEach(() => {
    window.localStorage.clear()
  })

  it('shows the editor on the left by default', () => {
    const { container } = setup()
    const { editorPane, previewPane } = panes(container)

    expect(screen.getByRole('button', { name: 'Swap panes' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    expect(editorPane).not.toHaveClass('order-last')
    expect(previewPane).not.toHaveClass('order-first')
  })

  it('swaps the panes and remembers the order', () => {
    const { container, unmount } = setup()

    fireEvent.click(screen.getByRole('button', { name: 'Swap panes' }))

    const { editorPane, previewPane } = panes(container)
    expect(editorPane).toHaveClass('order-last')
    expect(previewPane).toHaveClass('order-first')
    expect(window.localStorage.getItem('ink-readable-preview-first')).toBe('true')

    unmount()
    setup()
    expect(screen.getByRole('button', { name: 'Swap panes' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('keeps the editor mounted when swapping', () => {
    const { container } = setup()
    const editor = container.querySelector('.cm-editor')

    fireEvent.click(screen.getByRole('button', { name: 'Swap panes' }))

    expect(container.querySelector('.cm-editor')).toBe(editor)
  })

  it('only offers the swap in split view', () => {
    setup()

    fireEvent.click(screen.getByRole('button', { name: 'Editor only' }))

    expect(screen.queryByRole('button', { name: 'Swap panes' })).not.toBeInTheDocument()
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

describe('NotesEditor dark theme', () => {
  beforeEach(() => {
    useEditorConfigContext.mockReset()
  })

  it('reports the editor as dark when the app theme is dark', () => {
    const { container } = setup(false, false, true)

    expect(editorView(container).state.facet(EditorView.darkTheme)).toBe(true)
  })

  it('reports the editor as light when the app theme is light', () => {
    const { container } = setup(false, false, false)

    expect(editorView(container).state.facet(EditorView.darkTheme)).toBe(false)
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
