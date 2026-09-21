import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Document } from '@/lib/types'

import { useDocument } from './use-document'

const { getDocument } = vi.hoisted(() => ({
  getDocument: vi.fn<(id: string) => Promise<Document>>(),
}))

vi.mock('@/lib/api', () => ({ getDocument }))

const document: Document = {
  id: 'doc-1',
  name: 'Untitled',
  vaultId: 'vault-1',
  path: '/untitled.md',
  content: '# Hello',
  deleted: false,
  createdAt: '2026-09-20T10:00:00Z',
  updatedAt: '2026-09-20T10:00:00Z',
}

describe('useDocument', () => {
  beforeEach(() => {
    getDocument.mockReset()
  })

  it('loads a document by id', async () => {
    getDocument.mockResolvedValue(document)

    const { result } = renderHook(() => useDocument('doc-1'))

    await waitFor(() => expect(result.current.document).toEqual(document))
    expect(getDocument).toHaveBeenCalledWith('doc-1')
    expect(result.current.isLoading).toBe(false)
  })

  it('does not fetch when there is no id', () => {
    const { result } = renderHook(() => useDocument(undefined))

    expect(getDocument).not.toHaveBeenCalled()
    expect(result.current.document).toBeNull()
    expect(result.current.isLoading).toBe(false)
  })

  it('exposes the error when the request fails', async () => {
    getDocument.mockRejectedValue(new Error('not found'))

    const { result } = renderHook(() => useDocument('missing'))

    await waitFor(() => expect(result.current.error).not.toBeNull())
    expect(result.current.error?.message).toBe('not found')
  })

  it('ignores a stale response when the id changes', async () => {
    const resolvers = new Map<string, (value: Document) => void>()
    getDocument.mockImplementation(
      (id: string) =>
        new Promise<Document>((resolve) => {
          resolvers.set(id, resolve)
        }),
    )

    const { result, rerender } = renderHook(({ id }: { id: string }) => useDocument(id), {
      initialProps: { id: 'first' },
    })

    rerender({ id: 'second' })

    const second = { ...document, id: 'second', content: '# Second' }
    const first = { ...document, id: 'first', content: '# First' }
    resolvers.get('second')?.(second)
    resolvers.get('first')?.(first)

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.document).toEqual(second)
  })

  it('refetches on demand', async () => {
    getDocument.mockResolvedValue(document)
    const { result } = renderHook(() => useDocument('doc-1'))

    await waitFor(() => expect(result.current.document).not.toBeNull())

    act(() => {
      result.current.reload()
    })

    await waitFor(() => expect(getDocument).toHaveBeenCalledTimes(2))
  })
})
