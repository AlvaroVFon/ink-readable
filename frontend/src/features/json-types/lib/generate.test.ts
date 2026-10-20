import { describe, expect, it } from 'vitest'

import { generateTypes } from './generate'
import { getLanguage, resolveOptions } from './languages'

describe('generateTypes', () => {
  const typescript = getLanguage('typescript')
  const options = resolveOptions(typescript, undefined)

  it('returns empty output for blank input', () => {
    expect(generateTypes('  \n', typescript, 'Root', options)).toEqual({ ok: true, code: '' })
  })

  it('reports invalid JSON', () => {
    const result = generateTypes('{ "a": ', typescript, 'Root', options)

    expect(result.ok).toBe(false)
    expect(result.ok ? '' : result.error).toMatch(/^Invalid JSON: /)
  })

  it('emits code for valid JSON', () => {
    expect(generateTypes('{"a": 1}', typescript, 'Root', options)).toEqual({
      ok: true,
      code: 'export interface Root {\n  a: number\n}\n',
    })
  })
})

describe('resolveOptions', () => {
  it('fills defaults and drops values of the wrong shape', () => {
    const go = getLanguage('go')

    expect(resolveOptions(go, { omitempty: false, pointersForOptional: 'yes' })).toEqual({
      omitempty: false,
      pointersForOptional: true,
    })
    expect(resolveOptions(getLanguage('typescript'), { declaration: 'class' })).toEqual({
      declaration: 'interface',
    })
  })

  it('falls back to the first language for unknown ids', () => {
    expect(getLanguage('cobol').id).toBe('typescript')
  })
})
