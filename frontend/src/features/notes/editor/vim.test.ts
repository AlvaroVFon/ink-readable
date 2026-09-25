import { EditorView } from '@codemirror/view'
import { vim } from '@replit/codemirror-vim'
import { fireEvent } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { registerVimCommands, setVimLeaderHandlers } from './vim'

function mountEditor(): EditorView {
  const container = document.createElement('div')
  document.body.appendChild(container)
  return new EditorView({ doc: '', extensions: [vim()], parent: container })
}

describe('vim leader bindings', () => {
  let view: EditorView | null = null

  afterEach(() => {
    view?.dom.remove()
    view?.destroy()
    view = null
  })

  it('toggles the sidebar on <Space>e', () => {
    const toggleSidebar = vi.fn()
    setVimLeaderHandlers({ toggleSidebar, openFinder: vi.fn() })
    registerVimCommands()

    view = mountEditor()
    fireEvent.keyDown(view.contentDOM, { key: ' ' })
    fireEvent.keyDown(view.contentDOM, { key: 'e' })

    expect(toggleSidebar).toHaveBeenCalledTimes(1)
  })

  it('opens the finder on <Space><Space>', () => {
    const openFinder = vi.fn()
    setVimLeaderHandlers({ toggleSidebar: vi.fn(), openFinder })
    registerVimCommands()

    view = mountEditor()
    fireEvent.keyDown(view.contentDOM, { key: ' ' })
    fireEvent.keyDown(view.contentDOM, { key: ' ' })

    expect(openFinder).toHaveBeenCalledTimes(1)
  })
})
