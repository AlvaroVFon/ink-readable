import type { Field, PrimitiveName, Schema, TypeDef, TypeRef } from './ir'

import { singularize, toPascalCase, uniqueName } from './naming'

/**
 * Everything observed at one position of the JSON. Array elements and the
 * values of a key across several objects merge into a single shape, which is
 * how optional fields and unions are discovered.
 */
type Shape = {
  sawNull: boolean
  primitives: Set<Exclude<PrimitiveName, 'any'>>
  /** Merged shape of every element of every array seen here. */
  items: Shape | null
  object: ObjectShape | null
}

type ObjectShape = {
  /** Number of objects merged into this shape. */
  count: number
  fields: Map<string, { shape: Shape; count: number }>
}

function emptyShape(): Shape {
  return { sawNull: false, primitives: new Set(), items: null, object: null }
}

function addValue(shape: Shape, value: unknown): void {
  if (value === null) {
    shape.sawNull = true
  } else if (Array.isArray(value)) {
    shape.items ??= emptyShape()
    for (const item of value) {
      addValue(shape.items, item)
    }
  } else if (typeof value === 'object') {
    shape.object ??= { count: 0, fields: new Map() }
    shape.object.count++
    for (const [key, fieldValue] of Object.entries(value)) {
      let field = shape.object.fields.get(key)
      if (field === undefined) {
        field = { shape: emptyShape(), count: 0 }
        shape.object.fields.set(key, field)
      }
      field.count++
      addValue(field.shape, fieldValue)
    }
  } else if (typeof value === 'string') {
    shape.primitives.add('string')
  } else if (typeof value === 'boolean') {
    shape.primitives.add('boolean')
  } else if (typeof value === 'number') {
    shape.primitives.add(Number.isInteger(value) ? 'integer' : 'number')
  }
}

type Builder = {
  types: TypeDef[]
  usedNames: Set<string>
  /** Structural signature → type name, so identical objects share one type. */
  bySignature: Map<string, string>
}

function signature(fields: Field[]): string {
  return JSON.stringify(
    fields
      .map((field) => [field.jsonKey, field.optional, field.type] as const)
      .toSorted(([a], [b]) => a.localeCompare(b)),
  )
}

function buildObject(object: ObjectShape, nameHint: string, builder: Builder): TypeRef {
  const name = uniqueName(toPascalCase(nameHint) || 'Object', builder.usedNames)
  // Reserve the slot before recursing so parents come before their children.
  const def: TypeDef = { name, fields: [] }
  builder.types.push(def)

  for (const [key, field] of object.fields) {
    def.fields.push({
      jsonKey: key,
      type: buildType(field.shape, key, builder),
      optional: field.count < object.count,
    })
  }

  const sig = signature(def.fields)
  const existing = builder.bySignature.get(sig)
  if (existing !== undefined) {
    builder.types.splice(builder.types.indexOf(def), 1)
    builder.usedNames.delete(name)
    return { kind: 'object', ref: existing }
  }
  builder.bySignature.set(sig, name)
  return { kind: 'object', ref: name }
}

function buildType(shape: Shape, nameHint: string, builder: Builder): TypeRef {
  const members: TypeRef[] = []

  // An integer field that is sometimes fractional is just a number.
  const primitives = new Set(shape.primitives)
  if (primitives.has('integer') && primitives.has('number')) {
    primitives.delete('integer')
  }
  for (const name of ['string', 'integer', 'number', 'boolean'] as const) {
    if (primitives.has(name)) {
      members.push({ kind: 'primitive', name })
    }
  }
  if (shape.object !== null) {
    members.push(buildObject(shape.object, nameHint, builder))
  }
  if (shape.items !== null) {
    members.push({ kind: 'array', items: buildType(shape.items, singularize(nameHint), builder) })
  }

  if (members.length === 0) {
    return shape.sawNull ? { kind: 'null' } : { kind: 'primitive', name: 'any' }
  }
  if (shape.sawNull) {
    members.push({ kind: 'null' })
  }
  return members.length === 1 ? members[0] : { kind: 'union', members }
}

/**
 * Infers a schema from a parsed JSON value. `rootName` names the top-level
 * type; nested object types are named after the key that holds them.
 */
export function inferSchema(value: unknown, rootName: string): Schema {
  const root = toPascalCase(rootName) || 'Root'
  const shape = emptyShape()
  addValue(shape, value)

  const builder: Builder = { types: [], usedNames: new Set([root]), bySignature: new Map() }
  let rootType: TypeRef
  if (shape.object !== null && shape.items === null) {
    builder.usedNames.delete(root)
    rootType = buildType(shape, root, builder)
  } else {
    // The root name is reserved for the alias (`type Root = RootElement[]`).
    rootType = buildType(shape, `${root}Element`, builder)
  }

  return { rootName: root, root: rootType, types: builder.types }
}
