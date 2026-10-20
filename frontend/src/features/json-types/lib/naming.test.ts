import { describe, expect, it } from 'vitest'

import { singularize, splitWords, toGoIdentifier, toPascalCase, uniqueName } from './naming'

describe('splitWords', () => {
  it('splits on separators and case changes', () => {
    expect(splitWords('first_name')).toEqual(['first', 'name'])
    expect(splitWords('first-name')).toEqual(['first', 'name'])
    expect(splitWords('firstName')).toEqual(['first', 'Name'])
    expect(splitWords('HTTPServer')).toEqual(['HTTP', 'Server'])
    expect(splitWords('  @type ')).toEqual(['type'])
  })
})

describe('toPascalCase', () => {
  it('joins capitalized words', () => {
    expect(toPascalCase('user_profile')).toBe('UserProfile')
    expect(toPascalCase('userID')).toBe('UserId')
    expect(toPascalCase('')).toBe('')
  })
})

describe('toGoIdentifier', () => {
  it('upper-cases Go initialisms', () => {
    expect(toGoIdentifier('user_id')).toBe('UserID')
    expect(toGoIdentifier('avatarUrl')).toBe('AvatarURL')
    expect(toGoIdentifier('html_url')).toBe('HTMLURL')
  })

  it('keeps identifiers valid', () => {
    expect(toGoIdentifier('2fa')).toBe('Field2fa')
    expect(toGoIdentifier('---')).toBe('Field')
  })
})

describe('singularize', () => {
  it('handles common plural endings', () => {
    expect(singularize('users')).toBe('user')
    expect(singularize('categories')).toBe('category')
    expect(singularize('boxes')).toBe('box')
    expect(singularize('address')).toBe('address')
    expect(singularize('status')).toBe('status')
    expect(singularize('data')).toBe('data')
  })
})

describe('uniqueName', () => {
  it('adds a numeric suffix on collision', () => {
    const used = new Set<string>()
    expect(uniqueName('Item', used)).toBe('Item')
    expect(uniqueName('Item', used)).toBe('Item2')
    expect(uniqueName('Item', used)).toBe('Item3')
  })
})
