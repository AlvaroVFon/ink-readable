import { afterEach, describe, expect, it } from 'vitest'

import {
  clampNoteZoom,
  getStoredNoteZoom,
  NOTE_ZOOM_DEFAULT,
  NOTE_ZOOM_MAX,
  NOTE_ZOOM_MIN,
  NOTE_ZOOM_STORAGE_KEY,
  noteZoomLabel,
  storeNoteZoom,
} from './note-zoom'

afterEach(() => {
  window.localStorage.clear()
})

describe('clampNoteZoom', () => {
  it('leaves values inside the range untouched', () => {
    expect(clampNoteZoom(1.3)).toBe(1.3)
  })

  it('clamps values below the minimum and above the maximum', () => {
    expect(clampNoteZoom(0.1)).toBe(NOTE_ZOOM_MIN)
    expect(clampNoteZoom(5)).toBe(NOTE_ZOOM_MAX)
  })

  it('rounds to whole percents', () => {
    expect(clampNoteZoom(1.2000000000000002)).toBe(1.2)
  })
})

describe('noteZoomLabel', () => {
  it('renders the zoom as a percentage', () => {
    expect(noteZoomLabel(1)).toBe('100%')
    expect(noteZoomLabel(1.25)).toBe('125%')
  })
})

describe('note zoom storage', () => {
  it('defaults to 100% without a stored value', () => {
    expect(getStoredNoteZoom()).toBe(NOTE_ZOOM_DEFAULT)
  })

  it('round-trips a stored value', () => {
    storeNoteZoom(1.4)

    expect(getStoredNoteZoom()).toBe(1.4)
  })

  it('falls back to the default for an invalid value', () => {
    window.localStorage.setItem(NOTE_ZOOM_STORAGE_KEY, 'huge')

    expect(getStoredNoteZoom()).toBe(NOTE_ZOOM_DEFAULT)
  })

  it('clamps an out-of-range stored value', () => {
    window.localStorage.setItem(NOTE_ZOOM_STORAGE_KEY, '9')

    expect(getStoredNoteZoom()).toBe(NOTE_ZOOM_MAX)
  })
})
