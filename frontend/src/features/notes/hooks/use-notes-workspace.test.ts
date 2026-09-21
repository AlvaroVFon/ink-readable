import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Document, Vault } from '@/lib/types'

import { useNotesWorkspace } from './use-notes-workspace'

const { listVaults, listDocuments, createDocument, createVault } = vi.hoisted(() => ({
  listVaults: vi.fn<() => Promise<Vault[]>>(),
  listDocuments: vi.fn<(vaultId: string) => Promise<Document[]>>(),
  createDocument: vi.fn<(vaultId: string, input: unknown) => Promise<Document>>(),
  createVault: vi.fn<(name: string) => Promise<Vault>>(),
}))

vi.mock('@/lib/api', () => ({ listVaults, listDocuments, createDocument, createVault }))

const reading: Vault = { id: 'v1', name: 'Reading', deleted: false, createdAt: '', updatedAt: '' }

function document(id: string, name: string, vaultId: string, path: string): Document {
  return { id, name, vaultId, path, content: '', deleted: false, createdAt: '', updatedAt: '' }
}

describe('useNotesWorkspace', () => {
  beforeEach(() => {
    listVaults.mockReset()
    listDocuments.mockReset()
    createDocument.mockReset()
    createVault.mockReset()
    listVaults.mockResolvedValue([reading])
    listDocuments.mockResolvedValue([document('d1', 'Untitled', 'v1', '/Reading/Untitled.md')])
  })

  it('loads the tree and indexes documents by id', async () => {
    const { result } = renderHook(() => useNotesWorkspace())

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.tree).toHaveLength(1)
    expect(result.current.tree[0]?.name).toBe('Reading')
    expect(result.current.documentsById.get('d1')?.path).toBe('/Reading/Untitled.md')
    expect(result.current.error).toBeNull()
  })

  it('creates an Untitled note with a disambiguated path', async () => {
    createDocument.mockResolvedValue(document('d2', 'Untitled', 'v1', '/Reading/Untitled 2.md'))
    const { result } = renderHook(() => useNotesWorkspace())
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      await result.current.createNote({ vaultId: 'v1', basePath: '/Reading' })
    })

    expect(createDocument).toHaveBeenCalledWith('v1', {
      name: '',
      path: '/Reading/Untitled 2.md',
      content: '',
    })
    expect(listDocuments).toHaveBeenCalledTimes(2)
  })

  it('creates a folder as a placeholder note inside it', async () => {
    createDocument.mockResolvedValue(document('d3', 'Untitled', 'v1', '/Reading/Ideas/Untitled.md'))
    const { result } = renderHook(() => useNotesWorkspace())
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      await result.current.createFolder({ vaultId: 'v1', basePath: '/Reading', name: 'Ideas' })
    })

    expect(createDocument).toHaveBeenCalledWith('v1', {
      name: '',
      path: '/Reading/Ideas/Untitled.md',
      content: '',
    })
  })

  it('creates a vault with an initial empty note', async () => {
    createVault.mockResolvedValue({
      id: 'v2',
      name: 'Work',
      deleted: false,
      createdAt: '',
      updatedAt: '',
    })
    createDocument.mockResolvedValue(document('d4', 'Untitled', 'v2', '/Work/Untitled.md'))
    const { result } = renderHook(() => useNotesWorkspace())
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    let created: Document | undefined
    await act(async () => {
      created = await result.current.createVault('Work')
    })

    expect(createVault).toHaveBeenCalledWith('Work')
    expect(createDocument).toHaveBeenCalledWith('v2', {
      name: '',
      path: '/Work/Untitled.md',
      content: '',
    })
    expect(created?.id).toBe('d4')
  })

  it('exposes the error when loading fails', async () => {
    listVaults.mockRejectedValue(new Error('boom'))
    const { result } = renderHook(() => useNotesWorkspace())

    await waitFor(() => expect(result.current.error).not.toBeNull())
    expect(result.current.error?.message).toBe('boom')
  })
})
