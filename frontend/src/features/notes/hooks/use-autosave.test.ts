import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useAutosave } from './use-autosave'

const { updateDocumentContent } = vi.hoisted(() => ({
  updateDocumentContent: vi.fn<(id: string, content: string) => Promise<void>>(),
}))

vi.mock('@/lib/api', () => ({ updateDocumentContent }))

type Props = {
  content: string
  documentId?: string
}

function renderAutosave(initialProps: Props) {
  return renderHook(
    ({ content, documentId = 'doc-1' }: Props) =>
      useAutosave({ documentId, content, delayMs: 500 }),
    { initialProps },
  )
}

describe('useAutosave', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    updateDocumentContent.mockReset()
    updateDocumentContent.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('saves after the debounce delay', async () => {
    const { result, rerender } = renderAutosave({ content: 'initial' })

    rerender({ content: 'changed' })
    expect(result.current.status).toBe('dirty')

    await act(async () => {
      vi.advanceTimersByTime(500)
    })

    expect(updateDocumentContent).toHaveBeenCalledWith('doc-1', 'changed')
    expect(result.current.status).toBe('saved')
  })

  it('coalesces rapid edits into a single save', async () => {
    const { rerender } = renderAutosave({ content: 'initial' })

    rerender({ content: 'a' })
    rerender({ content: 'b' })

    await act(async () => {
      vi.advanceTimersByTime(500)
    })

    expect(updateDocumentContent).toHaveBeenCalledTimes(1)
    expect(updateDocumentContent).toHaveBeenCalledWith('doc-1', 'b')
  })

  it('does nothing when the content has not changed', async () => {
    const { rerender } = renderAutosave({ content: 'same' })

    rerender({ content: 'same' })
    await act(async () => {
      vi.advanceTimersByTime(500)
    })

    expect(updateDocumentContent).not.toHaveBeenCalled()
  })

  it('reports an error when persistence fails', async () => {
    updateDocumentContent.mockRejectedValue(new Error('offline'))
    const { result, rerender } = renderAutosave({ content: 'initial' })

    rerender({ content: 'changed' })
    await act(async () => {
      vi.advanceTimersByTime(500)
    })

    expect(result.current.status).toBe('error')
  })

  it('flushes pending edits on unmount', async () => {
    const { rerender, unmount } = renderAutosave({ content: 'initial' })

    rerender({ content: 'changed' })
    await act(async () => {
      unmount()
    })

    expect(updateDocumentContent).toHaveBeenCalledWith('doc-1', 'changed')
  })
})
