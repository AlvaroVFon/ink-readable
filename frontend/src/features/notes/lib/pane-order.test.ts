import { afterEach, describe, expect, it, vi } from 'vitest'

import { PREVIEW_FIRST_STORAGE_KEY, getStoredPreviewFirst, storePreviewFirst } from './pane-order'

describe('pane order storage', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    window.localStorage.clear()
  })

  it('defaults to the editor first', () => {
    expect(getStoredPreviewFirst()).toBe(false)
  })

  it('round-trips the stored order', () => {
    storePreviewFirst(true)
    expect(window.localStorage.getItem(PREVIEW_FIRST_STORAGE_KEY)).toBe('true')
    expect(getStoredPreviewFirst()).toBe(true)

    storePreviewFirst(false)
    expect(getStoredPreviewFirst()).toBe(false)
  })

  it('falls back to the default when storage is unavailable', () => {
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new Error('denied')
    })

    expect(() => {
      storePreviewFirst(true)
    }).not.toThrow()
    expect(getStoredPreviewFirst()).toBe(false)
  })
})
