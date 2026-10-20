/** A JSON Schema document or subschema. */
export type JsonSchema = Record<string, unknown>

export type Draft = '2020-12' | '07'

/** Where a draft keeps shared definitions and how it names itself. */
export const DRAFTS: Record<Draft, { uri: string; defsKey: string }> = {
  '2020-12': { uri: 'https://json-schema.org/draft/2020-12/schema', defsKey: '$defs' },
  '07': { uri: 'http://json-schema.org/draft-07/schema#', defsKey: 'definitions' },
}

export type SchemaOptions = {
  draft: Draft
  /** Forbid keys the schema does not list. */
  strict: boolean
}

/** The `type` of a schema that has nothing else on it, or `null`. */
function simpleType(schema: JsonSchema): string[] | null {
  const keys = Object.keys(schema)
  if (keys.length !== 1 || keys[0] !== 'type') {
    return null
  }
  const { type } = schema
  if (typeof type === 'string') {
    return [type]
  }
  return Array.isArray(type) ? type.filter((member) => typeof member === 'string') : null
}

/** One schema that accepts a value valid against any member. */
export function anyOf(members: JsonSchema[]): JsonSchema {
  const unique = members.filter(
    (member, index) =>
      members.findIndex((other) => JSON.stringify(other) === JSON.stringify(member)) === index,
  )
  if (unique.length === 1) {
    return unique[0]
  }
  const types = unique.map(simpleType)
  if (types.every((type) => type !== null)) {
    return { type: [...new Set(types.flat())] }
  }
  return { anyOf: unique }
}

/** Also accepts `null`. */
export function nullable(schema: JsonSchema): JsonSchema {
  const types = simpleType(schema)
  if (types !== null) {
    return types.includes('null') ? schema : { type: [...types, 'null'] }
  }
  const { enum: values, type, ...rest } = schema
  if (Array.isArray(values) && Object.keys(rest).length === 0 && typeof type === 'string') {
    return { type: [type, 'null'], enum: [...Array.from<unknown>(values), null] }
  }
  return { anyOf: [schema, { type: 'null' }] }
}

/**
 * Adds annotations (`description`, `default`...) to a schema. Draft 07
 * ignores keywords next to `$ref`, so those references get wrapped.
 */
export function annotate(schema: JsonSchema, annotations: JsonSchema, draft: Draft): JsonSchema {
  const defined = Object.fromEntries(
    Object.entries(annotations).filter(([, value]) => value !== undefined),
  )
  if (Object.keys(defined).length === 0) {
    return schema
  }
  if (draft === '07' && '$ref' in schema) {
    return { allOf: [schema], ...defined }
  }
  return { ...schema, ...defined }
}

/** Assembles the top-level document with `$schema` first and definitions last. */
export function finalize(
  root: JsonSchema,
  definitions: Record<string, JsonSchema>,
  draft: Draft,
): JsonSchema {
  const { uri, defsKey } = DRAFTS[draft]
  return {
    $schema: uri,
    ...root,
    ...(Object.keys(definitions).length > 0 ? { [defsKey]: definitions } : {}),
  }
}

export function refTo(name: string, draft: Draft): JsonSchema {
  return { $ref: `#/${DRAFTS[draft].defsKey}/${name}` }
}
