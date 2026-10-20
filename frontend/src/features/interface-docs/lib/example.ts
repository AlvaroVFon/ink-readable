import type { Declaration, Field, TypeExpr } from './model'

const FORMAT_EXAMPLES: Record<string, unknown> = {
  'date-time': '2026-01-31T09:30:00Z',
  date: '2026-01-31',
  uuid: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  base64: 'SGVsbG8=',
  decimal: '12.50',
}

/**
 * Reads a documented `@example`/`@default`: JSON when it parses, otherwise the
 * raw text as a string (`@example Ada` and `@example "Ada"` both work).
 */
export function parseDocumentedValue(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

/**
 * Builds a sample payload for a declaration, preferring the values documented
 * in the source. Recursive types stop at the first repetition.
 */
export class ExampleBuilder {
  private readonly declarations: Map<string, Declaration>
  /** Resolves a declaration's own and inherited fields. */
  private readonly fieldsOf: (declaration: Declaration & { kind: 'object' }) => Field[]
  private index = 0

  constructor(
    declarations: Map<string, Declaration>,
    fieldsOf: (declaration: Declaration & { kind: 'object' }) => Field[],
  ) {
    this.declarations = declarations
    this.fieldsOf = fieldsOf
  }

  /** Number of documented `@example` payloads the declaration supports (at least 1). */
  countFor(declaration: Declaration & { kind: 'object' }): number {
    return this.countFields(this.fieldsOf(declaration), [declaration.name])
  }

  /** Largest `@example` count among the fields, including nested and referenced objects. */
  private countFields(fields: Field[], visiting: string[]): number {
    return Math.max(
      1,
      ...fields.map((field) =>
        Math.max(field.examples.length, this.countType(field.type, visiting)),
      ),
    )
  }

  private countType(type: TypeExpr, visiting: string[]): number {
    switch (type.kind) {
      case 'array':
        return this.countType(type.items, visiting)
      case 'map':
        return this.countType(type.values, visiting)
      case 'object':
        return this.countFields(type.fields, visiting)
      case 'union':
      case 'intersection':
        return Math.max(1, ...type.members.map((member) => this.countType(member, visiting)))
      case 'ref': {
        const declaration = this.declarations.get(type.name)
        if (declaration?.kind === 'object' && !visiting.includes(type.name)) {
          return this.countFields(this.fieldsOf(declaration), [...visiting, type.name])
        }
        return declaration?.kind === 'alias' && !visiting.includes(type.name)
          ? this.countType(declaration.type, [...visiting, type.name])
          : 1
      }
      default:
        return 1
    }
  }

  /** The `index`th sample: each field uses its `index`th `@example`, else its first. */
  forDeclaration(declaration: Declaration, index = 0): unknown {
    this.index = index
    return this.forRef(declaration.name, [])
  }

  private forRef(name: string, visiting: string[]): unknown {
    const declaration = this.declarations.get(name)
    if (declaration === undefined || visiting.includes(name)) {
      return {}
    }
    const nested = [...visiting, name]
    switch (declaration.kind) {
      case 'enum':
        return declaration.values[0]?.value ?? null
      case 'alias':
        return this.forType(declaration.type, nested)
      case 'object':
        break
    }
    const value = this.forFields(this.fieldsOf(declaration), nested)
    if (declaration.additionalProperties !== null && Object.keys(value).length === 0) {
      return { key: this.forType(declaration.additionalProperties, nested) }
    }
    return value
  }

  private forFields(fields: Field[], visiting: string[]): Record<string, unknown> {
    const value: Record<string, unknown> = {}
    for (const field of fields) {
      const documented = field.examples[this.index] ?? field.example ?? field.defaultValue
      value[field.name] =
        documented === null ? this.forType(field.type, visiting) : parseDocumentedValue(documented)
    }
    return value
  }

  private forType(type: TypeExpr, visiting: string[]): unknown {
    switch (type.kind) {
      case 'primitive':
        if (type.format !== undefined && type.format in FORMAT_EXAMPLES) {
          return FORMAT_EXAMPLES[type.format]
        }
        return { string: 'string', integer: 0, number: 0, boolean: true, any: {} }[type.name]
      case 'literal':
        return type.value
      case 'null':
        return null
      case 'array':
        return type.items.kind === 'ref' && visiting.includes(type.items.name)
          ? []
          : [this.forType(type.items, visiting)]
      case 'map':
        return { key: this.forType(type.values, visiting) }
      case 'object':
        return this.forFields(type.fields, visiting)
      case 'ref':
        return this.forRef(type.name, visiting)
      case 'union': {
        const member = type.members.find((candidate) => candidate.kind !== 'null')
        return member === undefined ? null : this.forType(member, visiting)
      }
      case 'intersection':
        break
    }
    return Object.assign(
      {},
      ...type.members.map((member) => this.forType(member, visiting)).filter(isPlainObject),
    )
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
