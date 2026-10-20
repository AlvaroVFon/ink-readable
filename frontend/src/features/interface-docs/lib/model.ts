/**
 * Language-agnostic description of an interface contract, parsed from source
 * declarations (TypeScript interfaces, Go structs, ...).
 *
 * Every source language parses into a `Contract`; the markdown renderer only
 * reads this model, so a new source language never touches rendering.
 */

/** Wire-level primitive types, as a third party sees them in the payload. */
export type PrimitiveName = 'string' | 'integer' | 'number' | 'boolean' | 'any'

export type TypeExpr =
  /** `format` refines the primitive (`date-time`, `int64`, `byte`, ...). */
  | { kind: 'primitive'; name: PrimitiveName; format?: string }
  | { kind: 'literal'; value: string | number | boolean }
  | { kind: 'null' }
  | { kind: 'array'; items: TypeExpr }
  /** Object with arbitrary keys (`Record<string, T>`, `map[string]T`). */
  | { kind: 'map'; values: TypeExpr }
  /** An anonymous object declared inline. */
  | { kind: 'object'; fields: Field[] }
  /**
   * Points at another declaration, or at a type the source does not declare
   * (`Partial<User>`, `pkg.Money`). `args` are its generic arguments.
   */
  | { kind: 'ref'; name: string; args: TypeExpr[] }
  | { kind: 'union'; members: TypeExpr[] }
  /** A value that satisfies every member at once (`A & B`). */
  | { kind: 'intersection'; members: TypeExpr[] }

export type Field = {
  /** Name on the wire (the JSON key), not the source identifier. */
  name: string
  type: TypeExpr
  /** The key must always be present. */
  required: boolean
  /** The value may be `null`. */
  nullable: boolean
  description: string
  deprecated: string | null
  /** Literal example taken from the source docs, rendered verbatim. */
  example: string | null
  /** Every documented `@example`, in order; the nth builds the nth sample payload. */
  examples: string[]
  defaultValue: string | null
}

export type EnumValue = {
  value: string | number
  /** Identifier of the member in the source, when it has one. */
  name: string | null
  description: string
}

type DeclarationBase = {
  name: string
  description: string
  deprecated: string | null
}

export type Declaration =
  | (DeclarationBase & {
      kind: 'object'
      /** Declarations whose fields this one inherits (`extends`, Go embedding). */
      extends: string[]
      fields: Field[]
      /** Type of the values under keys not listed in `fields` (index signatures). */
      additionalProperties: TypeExpr | null
    })
  | (DeclarationBase & { kind: 'enum'; values: EnumValue[] })
  | (DeclarationBase & { kind: 'alias'; type: TypeExpr })

export type Contract = {
  /** In source order. */
  declarations: Declaration[]
}

/** Splits `T | null` into `T` and a nullable flag. */
export function splitNullable(type: TypeExpr): { type: TypeExpr; nullable: boolean } {
  if (type.kind !== 'union' || !type.members.some((member) => member.kind === 'null')) {
    return { type, nullable: false }
  }
  const rest = type.members.filter((member) => member.kind !== 'null')
  if (rest.length === 0) {
    return { type: { kind: 'null' }, nullable: true }
  }
  return { type: rest.length === 1 ? rest[0] : { kind: 'union', members: rest }, nullable: true }
}

/** Documentation attached to a declaration or field, extracted from comments. */
export type DocComment = {
  description: string
  deprecated: string | null
  example: string | null
  examples: string[]
  defaultValue: string | null
}

export const EMPTY_DOC: DocComment = {
  description: '',
  deprecated: null,
  example: null,
  examples: [],
  defaultValue: null,
}

/** Tags read from doc comments; any other `@word` stays in the description. */
const DOC_TAGS = ['deprecated', 'example', 'default', 'defaultValue']

const DOC_TAG = new RegExp(`(?:^|\\s)@(${DOC_TAGS.join('|')})\\b`, 'g')

/**
 * Reads JSDoc-style tags (`@deprecated`, `@example`, `@default`) out of plain
 * comment text; the rest is the description. Tags may start a line or follow
 * the description on the same line. Both source languages accept the same
 * tags so authors document contracts the same way.
 */
export function parseDocText(text: string): DocComment {
  const matches = [...text.matchAll(DOC_TAG)]
  const description = text.slice(0, matches[0]?.index ?? text.length).trim()
  const tags: Record<string, string> = {}
  const examples: string[] = []
  matches.forEach((match, index) => {
    const end = matches[index + 1]?.index ?? text.length
    const value = text.slice(match.index + match[0].length, end).trim()
    tags[match[1].toLowerCase()] = value
    if (match[1].toLowerCase() === 'example') {
      examples.push(value)
    }
  })
  return {
    description,
    deprecated: tags.deprecated ?? null,
    example: examples[0] ?? null,
    examples,
    defaultValue: tags.default ?? tags.defaultvalue ?? null,
  }
}
