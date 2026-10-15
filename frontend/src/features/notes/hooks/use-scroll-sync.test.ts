import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { useScrollSync } from './use-scroll-sync'

function scrollable(scrollHeight: number, clientHeight: number): HTMLElement {
  const element = document.createElement('div')
  Object.defineProperty(element, 'scrollHeight', { value: scrollHeight, configurable: true })
  Object.defineProperty(element, 'clientHeight', { value: clientHeight, configurable: true })
  return element
}

function scrollTo(element: HTMLElement, top: number) {
  element.scrollTop = top
  element.dispatchEvent(new Event('scroll'))
}

function setup() {
  const editor = scrollable(2000, 500)
  const preview = scrollable(1000, 500)
  const previewRef = { current: preview }
  const hook = renderHook(({ enabled }) => useScrollSync(editor, previewRef, enabled), {
    initialProps: { enabled: true },
  })
  return { editor, preview, ...hook }
}

describe('useScrollSync', () => {
  it('drives the preview from the editor by default', () => {
    const { editor, preview } = setup()

    scrollTo(editor, 750)

    expect(preview.scrollTop).toBe(250)
  })

  it('ignores preview scrolls the user did not start', () => {
    const { editor, preview } = setup()
    editor.scrollTop = 900

    // e.g. the preview re-rendering and the browser clamping its scrollTop
    scrollTo(preview, 0)

    expect(editor.scrollTop).toBe(900)
  })

  it('lets the preview drive after the user scrolls it, and hands back on editor input', () => {
    const { editor, preview } = setup()

    preview.dispatchEvent(new Event('wheel'))
    scrollTo(preview, 250)
    expect(editor.scrollTop).toBe(750)

    scrollTo(editor, 1500)
    expect(preview.scrollTop).toBe(250)

    editor.dispatchEvent(new Event('keydown'))
    scrollTo(editor, 1500)
    expect(preview.scrollTop).toBe(500)
  })

  it('does nothing when disabled', () => {
    const { editor, preview, rerender } = setup()
    rerender({ enabled: false })

    scrollTo(editor, 750)

    expect(preview.scrollTop).toBe(0)
  })
})
