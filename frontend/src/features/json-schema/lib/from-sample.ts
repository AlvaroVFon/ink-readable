import type { Schema, TypeDef, TypeRef } from '@/features/json-types/lib/ir'

import type { JsonSchema, SchemaOptions } from './schema'

import { anyOf, finalize, refTo } from './schema'

/**
 * Turns the schema inferred from a JSON sample (`json-types/lib/infer.ts`)
 * into JSON Schema. Every inferred object type becomes a definition, except
 * the root, which is the document itself.
 */
export function fromSample(inferred: Schema, options: SchemaOptions): JsonSchema {
  const byName = new Map(inferred.types.map((def) => [def.name, def]))
  const rootDef = inferred.root.kind === 'object' ? byName.get(inferred.root.ref) : undefined

  const typeSchema = (type: TypeRef): JsonSchema => {
    switch (type.kind) {
      case 'primitive':
        return type.name === 'any' ? {} : { type: type.name }
      case 'null':
        return { type: 'null' }
      case 'array':
        return { type: 'array', items: typeSchema(type.items) }
      case 'object':
        return type.ref === rootDef?.name ? { $ref: '#' } : refTo(type.ref, options.draft)
      case 'union':
        break
    }
    return anyOf(type.members.map(typeSchema))
  }

  const objectSchema = (def: TypeDef): JsonSchema => {
    const required = def.fields.filter((field) => !field.optional).map((field) => field.jsonKey)
    return {
      type: 'object',
      properties: Object.fromEntries(
        def.fields.map((field) => [field.jsonKey, typeSchema(field.type)]),
      ),
      ...(required.length > 0 ? { required } : {}),
      ...(options.strict ? { additionalProperties: false } : {}),
    }
  }

  const definitions: Record<string, JsonSchema> = {}
  for (const def of inferred.types) {
    if (def !== rootDef) {
      definitions[def.name] = objectSchema(def)
    }
  }

  const root = rootDef === undefined ? typeSchema(inferred.root) : objectSchema(rootDef)
  return finalize({ title: inferred.rootName, ...root }, definitions, options.draft)
}
