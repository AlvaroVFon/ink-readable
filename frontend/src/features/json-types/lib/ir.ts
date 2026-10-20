/**
 * Language-agnostic type model inferred from a JSON sample.
 *
 * Inference produces a `Schema`; every target language turns that same schema
 * into source code, so a new language never touches inference.
 */

export type PrimitiveName = 'string' | 'integer' | 'number' | 'boolean' | 'any'

export type TypeRef =
  | { kind: 'primitive'; name: PrimitiveName }
  | { kind: 'null' }
  | { kind: 'array'; items: TypeRef }
  /** Points at a `TypeDef` by name. */
  | { kind: 'object'; ref: string }
  /** Two or more members; nullable types are a union that includes `null`. */
  | { kind: 'union'; members: TypeRef[] }

export type Field = {
  /** Key exactly as it appears in the JSON. */
  jsonKey: string
  type: TypeRef
  /** Missing from at least one of the objects the field was inferred from. */
  optional: boolean
}

export type TypeDef = {
  /** PascalCase name, unique within the schema. */
  name: string
  fields: Field[]
}

export type Schema = {
  /** Name requested for the top-level type. */
  rootName: string
  root: TypeRef
  /** Object types, the root's first and parents before their children. */
  types: TypeDef[]
}

/**
 * Splits `T | null` into `T` and a nullable flag. Most languages express
 * nullability separately from the type (pointers, `Option`, `?`).
 */
export function splitNullable(type: TypeRef): { type: TypeRef; nullable: boolean } {
  if (type.kind !== 'union' || !type.members.some((member) => member.kind === 'null')) {
    return { type, nullable: false }
  }
  const rest = type.members.filter((member) => member.kind !== 'null')
  if (rest.length === 1) {
    return { type: rest[0], nullable: true }
  }
  return { type: { kind: 'union', members: rest }, nullable: true }
}
