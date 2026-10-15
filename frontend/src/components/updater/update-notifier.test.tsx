import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { toast, Toaster } from 'sonner'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { checkForUpdate, type AvailableUpdate } from '@/lib/tauri'

import { UpdateNotifier } from './update-notifier'

vi.mock('@/lib/tauri', () => ({ checkForUpdate: vi.fn() }))

const checkMock = vi.mocked(checkForUpdate)

function renderNotifier() {
  return render(
    <>
      <Toaster />
      <UpdateNotifier />
    </>,
  )
}

describe('UpdateNotifier', () => {
  afterEach(async () => {
    checkMock.mockReset()
    vi.restoreAllMocks()
    // Sonner keeps its toasts in module state; clear them between tests.
    act(() => {
      toast.dismiss()
    })
    await waitFor(() => expect(document.querySelector('[data-sonner-toast]')).toBeNull())
  })

  it('offers to install an available update', async () => {
    const install = vi.fn<AvailableUpdate['install']>(async (onProgress) => {
      onProgress?.(50, 100)
    })
    checkMock.mockResolvedValue({ version: '0.2.0', install })
    renderNotifier()

    expect(await screen.findByText('Version 0.2.0 is available')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Update now' }))

    expect(install).toHaveBeenCalledOnce()
    expect(await screen.findByText('Restarting…')).toBeInTheDocument()
  })

  it('shows the error when the install fails', async () => {
    checkMock.mockResolvedValue({
      version: '0.2.0',
      install: vi.fn().mockRejectedValue(new Error('signature mismatch')),
    })
    renderNotifier()

    fireEvent.click(await screen.findByRole('button', { name: 'Update now' }))

    expect(await screen.findByText('Update failed')).toBeInTheDocument()
    expect(screen.getByText('signature mismatch')).toBeInTheDocument()
  })

  it('stays silent when the check fails', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    checkMock.mockRejectedValue(new Error('offline'))
    renderNotifier()

    await waitFor(() => expect(warn).toHaveBeenCalled())
    await act(async () => {})
    expect(screen.queryByRole('button', { name: 'Update now' })).not.toBeInTheDocument()
  })
})
