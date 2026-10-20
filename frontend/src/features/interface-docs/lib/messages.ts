/** Wording of the generated document, per output language. */
export type DocMessages = {
  defaultTitle: string
  version: string
  date: string
  contents: string
  conventions: string
  conventionRequired: string
  conventionNullable: string
  conventionDates: string
  types: string
  noDeclarations: string
  field: string
  type: string
  required: string
  nullable: string
  description: string
  value: string
  name: string
  yes: string
  no: string
  example: string
  defaultValue: string
  deprecated: string
  allowedValues: string
  anyOtherKey: string
  includesFieldsOf: (bases: string[]) => string
  aliasOf: (type: string) => string
  arrayOf: (items: string) => string
  mapOf: (values: string) => string
  genericOf: (name: string, args: string) => string
  object: string
  or: string
  and: string
}

export const DOC_LOCALES = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
] as const

export type DocLocale = (typeof DOC_LOCALES)[number]['value']

/** Joins a list as prose: `a`, `a and b`, `a, b and c`. */
function listOf(items: string[], and: string): string {
  return items.length <= 1
    ? items.join('')
    : `${items.slice(0, -1).join(', ')} ${and} ${items.at(-1)}`
}

const en: DocMessages = {
  defaultTitle: 'Interface agreement',
  version: 'Version',
  date: 'Date',
  contents: 'Contents',
  conventions: 'Conventions',
  conventionRequired: '**Required**: the key must always be present in the payload.',
  conventionNullable: '**Nullable**: the value may be `null`.',
  conventionDates: 'Dates and times are strings in ISO 8601 / RFC 3339 format.',
  types: 'Data types',
  noDeclarations: 'No declarations found.',
  field: 'Field',
  type: 'Type',
  required: 'Required',
  nullable: 'Nullable',
  description: 'Description',
  value: 'Value',
  name: 'Name',
  yes: 'Yes',
  no: 'No',
  example: 'Example',
  defaultValue: 'Default',
  deprecated: 'Deprecated',
  allowedValues: 'Allowed values:',
  anyOtherKey: 'any other key',
  includesFieldsOf: (bases) => `Includes every field of ${listOf(bases, 'and')}.`,
  aliasOf: (type) => `Type: ${type}.`,
  arrayOf: (items) => `array of ${items}`,
  mapOf: (values) => `map of ${values}`,
  genericOf: (name, args) => `${name} of ${args}`,
  object: 'object',
  or: 'or',
  and: 'and',
}

const es: DocMessages = {
  defaultTitle: 'Acuerdo de interfaz',
  version: 'Versión',
  date: 'Fecha',
  contents: 'Índice',
  conventions: 'Convenciones',
  conventionRequired: '**Obligatorio**: la clave debe estar siempre presente en el payload.',
  conventionNullable: '**Nulable**: el valor puede ser `null`.',
  conventionDates: 'Las fechas y horas son cadenas en formato ISO 8601 / RFC 3339.',
  types: 'Tipos de datos',
  noDeclarations: 'No se encontraron declaraciones.',
  field: 'Campo',
  type: 'Tipo',
  required: 'Obligatorio',
  nullable: 'Nulable',
  description: 'Descripción',
  value: 'Valor',
  name: 'Nombre',
  yes: 'Sí',
  no: 'No',
  example: 'Ejemplo',
  defaultValue: 'Por defecto',
  deprecated: 'Obsoleto',
  allowedValues: 'Valores permitidos:',
  anyOtherKey: 'cualquier otra clave',
  includesFieldsOf: (bases) => `Incluye todos los campos de ${listOf(bases, 'y')}.`,
  aliasOf: (type) => `Tipo: ${type}.`,
  arrayOf: (items) => `lista de ${items}`,
  mapOf: (values) => `mapa de ${values}`,
  genericOf: (name, args) => `${name} de ${args}`,
  object: 'objeto',
  or: 'o',
  and: 'y',
}

const MESSAGES = new Map<string, DocMessages>([
  ['en', en],
  ['es', es],
] satisfies [DocLocale, DocMessages][])

/** Messages for `locale`, falling back to English. */
export function getMessages(locale: string): DocMessages {
  return MESSAGES.get(locale) ?? en
}
