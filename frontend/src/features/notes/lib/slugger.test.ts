import { describe, expect, it } from 'vitest'

import { Slugger } from './slugger'

describe('Slugger', () => {
  it('lowercases, drops punctuation and joins words with dashes', () => {
    expect(new Slugger().slug('Data types (v2)!')).toBe('data-types-v2')
  })

  it('keeps accented letters', () => {
    expect(new Slugger().slug('Índice de tipos')).toBe('índice-de-tipos')
  })

  it('suffixes duplicates in order', () => {
    const slugger = new Slugger()
    expect([slugger.slug('User'), slugger.slug('User'), slugger.slug('User')]).toEqual([
      'user',
      'user-1',
      'user-2',
    ])
  })
})
