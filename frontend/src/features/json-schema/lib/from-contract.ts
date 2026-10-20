import type { Declaration, Field, TypeExpr } from '@/features/interface-docs/lib/model'

import { parseDocumentedValue } from '@/features/interface-docs/lib/example'
import { splitNullable } from '@/features/interface-docs/lib/model'

import type { JsonSchema, SchemaOptions } from './schema'

import { annotate, anyOf, finalize, nullable, refTo } from './schema'

type ObjectDeclaration = Declaration & { kind: 'object' }

/** Formats JSON Schema defines; others (`int64`, `decimal`...) are not validation formats. */
const KNOWN_FORMATS = new Set(['date-time', 'date', 'uuid'])

/** Thrown when the requested root type is not declared. */
export class RootNotFoundError extends Error {}

/** `{ type, enum }` for values of one type, a bare `enum` for mixed ones. */
function enumSchema(values: (string | number | boolean)[]): JsonSchema {
  const types = new Set(values.map((value) => typeof value))
  return types.size === 1 ? { type: typeof values[0], enum: values } : { enum: values }
}

/**
 * Turns the declarations parsed from TypeScript or Go into JSON Schema. The
 * root declaration is the document itself; the declarations it reaches become
 * definitions. Doc comments map to `description`, `deprecated`, `default` and
 * `examples`.
 */
export function fromContract(
  declarations: Declaration[],
  rootName: string,
  options: SchemaOptions,
): JsonSchema {
  const byName = new Map(declarations.map((declaration) => [declaration.name, declaration]))
  const rootDeclaration =
    rootName === '' ? declarations[0] : declarations.find(({ name }) => name === rootName)
  if (rootDeclaration === undefined) {
    throw new RootNotFoundError(
      rootName === '' ? 'No declarations found' : `Type "${rootName}" is not declared`,
    )
  }

  /** Declarations the schema refers to, still to be emitted. */
  const pending: Declaration[] = []
  const reached = new Set<string>([rootDeclaration.name])

  const reach = (name: string): JsonSchema => {
    if (name === rootDeclaration.name) {
      return { $ref: '#' }
    }
    const declaration = byName.get(name)
    if (declaration === undefined) {
      // A type the source does not declare (`Partial<User>`, `pkg.Money`).
      return {}
    }
    if (!reached.has(name)) {
      reached.add(name)
      pending.push(declaration)
    }
    return refTo(name, options.draft)
  }

  /** Own and inherited fields; own fields override inherited ones. */
  const fieldsOf = (declaration: ObjectDeclaration, visiting: string[] = []): Field[] => {
    const merged = new Map<string, Field>()
    for (const baseName of declaration.extends) {
      const base = byName.get(baseName)
      if (base?.kind === 'object' && !visiting.includes(baseName)) {
        for (const field of fieldsOf(base, [...visiting, declaration.name])) {
          merged.set(field.name, field)
        }
      }
    }
    for (const field of declaration.fields) {
      merged.delete(field.name)
      merged.set(field.name, field)
    }
    return [...merged.values()]
  }

  const objectSchema = (fields: Field[], additional: TypeExpr | null = null): JsonSchema => {
    const required = fields.filter((field) => field.required).map((field) => field.name)
    let additionalProperties: JsonSchema | boolean | undefined
    if (additional !== null) {
      additionalProperties = typeSchema(additional)
    } else if (options.strict) {
      additionalProperties = false
    }
    return {
      type: 'object',
      properties: Object.fromEntries(fields.map((field) => [field.name, fieldSchema(field)])),
      ...(required.length > 0 ? { required } : {}),
      ...(additionalProperties === undefined ? {} : { additionalProperties }),
    }
  }

  const fieldSchema = (field: Field): JsonSchema => {
    const { type, nullable: typeNullable } = splitNullable(field.type)
    const schema = typeSchema(type)
    return annotate(
      field.nullable || typeNullable ? nullable(schema) : schema,
      {
        description: field.description === '' ? undefined : field.description,
        deprecated: field.deprecated !== null && options.draft === '2020-12' ? true : undefined,
        default: field.defaultValue === null ? undefined : parseDocumentedValue(field.defaultValue),
        examples: field.examples.length > 0 ? field.examples.map(parseDocumentedValue) : undefined,
      },
      options.draft,
    )
  }

  const typeSchema = (type: TypeExpr): JsonSchema => {
    switch (type.kind) {
      case 'primitive': {
        if (type.name === 'any') {
          return {}
        }
        const { format } = type
        return {
          type: type.name,
          ...(format !== undefined && KNOWN_FORMATS.has(format) ? { format } : {}),
          ...(format === 'base64' ? { contentEncoding: 'base64' } : {}),
        }
      }
      case 'literal':
        return { const: type.value }
      case 'null':
        return { type: 'null' }
      case 'array':
        return { type: 'array', items: typeSchema(type.items) }
      case 'map':
        return { type: 'object', additionalProperties: typeSchema(type.values) }
      case 'object':
        return objectSchema(type.fields)
      case 'ref':
        return type.name === 'undefined' ? {} : reach(type.name)
      case 'union':
        return unionSchema(type.members)
      case 'intersection':
        break
    }
    return { allOf: type.members.map(typeSchema) }
  }

  const unionSchema = (members: TypeExpr[]): JsonSchema => {
    const literals = members.filter((member) => member.kind === 'literal')
    // `'a' | 'b'` reads better as an enum than as several `const`s.
    if (literals.length < 2) {
      return anyOf(members.map(typeSchema))
    }
    const rest = members.filter((member) => member.kind !== 'literal')
    return anyOf([enumSchema(literals.map((literal) => literal.value)), ...rest.map(typeSchema)])
  }

  const declarationSchema = (declaration: Declaration): JsonSchema => {
    let schema: JsonSchema
    switch (declaration.kind) {
      case 'object':
        schema = objectSchema(fieldsOf(declaration), declaration.additionalProperties)
        break
      case 'enum':
        schema = enumSchema(declaration.values.map(({ value }) => value))
        break
      case 'alias':
        schema = typeSchema(declaration.type)
        break
    }
    return annotate(
      schema,
      {
        description: declaration.description === '' ? undefined : declaration.description,
        deprecated:
          declaration.deprecated !== null && options.draft === '2020-12' ? true : undefined,
      },
      options.draft,
    )
  }

  const root = declarationSchema(rootDeclaration)
  const definitions: Record<string, JsonSchema> = {}
  for (let next = pending.shift(); next !== undefined; next = pending.shift()) {
    definitions[next.name] = declarationSchema(next)
  }
  return finalize({ title: rootDeclaration.name, ...root }, definitions, options.draft)
}
