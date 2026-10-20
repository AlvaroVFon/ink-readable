import type { DocMessages } from './messages'
import type { Contract, Declaration, Field, TypeExpr } from './model'

import { ExampleBuilder } from './example'
import { getMessages } from './messages'

export type DocOptions = {
  title: string
  version: string
  /** Shown as the document date; the caller decides it so output stays reproducible. */
  date: string
  locale: string
  tableOfContents: boolean
  examples: boolean
}

type ObjectDeclaration = Declaration & { kind: 'object' }

/** Heading anchors the way GitHub (and most renderers) generate them. */
class Slugger {
  private readonly used = new Map<string, number>()

  slug(heading: string): string {
    const base = heading
      .toLowerCase()
      .replace(/[^\p{L}\p{M}\p{N}\p{Pc} -]/gu, '')
      .replace(/ /g, '-')
    const count = this.used.get(base) ?? 0
    this.used.set(base, count + 1)
    return count === 0 ? base : `${base}-${count}`
  }
}

/** Makes text safe inside a table cell: one line, no column breaks. */
function cell(text: string): string {
  return text.replace(/\s*\n\s*/g, ' ').replace(/\|/g, '\\|')
}

function code(text: string): string {
  const fence = text.includes('`') ? '``' : '`'
  return `${fence}${text}${fence}`
}

function table(header: string[], rows: string[][]): string {
  return [
    `| ${header.join(' | ')} |`,
    `| ${header.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(cell).join(' | ')} |`),
  ].join('\n')
}

function usesDates(type: TypeExpr): boolean {
  switch (type.kind) {
    case 'primitive':
      return type.format === 'date-time' || type.format === 'date'
    case 'array':
      return usesDates(type.items)
    case 'map':
      return usesDates(type.values)
    case 'object':
      return type.fields.some((field) => usesDates(field.type))
    case 'union':
    case 'intersection':
      return type.members.some(usesDates)
    default:
      return false
  }
}

function declarationTypes(declaration: Declaration): TypeExpr[] {
  switch (declaration.kind) {
    case 'object':
      return [
        ...declaration.fields.map((field) => field.type),
        ...(declaration.additionalProperties === null ? [] : [declaration.additionalProperties]),
      ]
    case 'alias':
      return [declaration.type]
    case 'enum':
      break
  }
  return []
}

class MarkdownRenderer {
  private readonly contract: Contract
  private readonly options: DocOptions
  private readonly t: DocMessages
  private readonly declarations = new Map<string, Declaration>()
  private readonly anchors = new Map<string, string>()

  constructor(contract: Contract, options: DocOptions) {
    this.contract = contract
    this.options = options
    this.t = getMessages(options.locale)
    for (const declaration of contract.declarations) {
      if (!this.declarations.has(declaration.name)) {
        this.declarations.set(declaration.name, declaration)
      }
    }
  }

  render(): string {
    const { t, options } = this
    const title = options.title.trim() === '' ? t.defaultTitle : options.title.trim()

    // Headings are slugged in document order so duplicate names get the
    // same `-1`, `-2` suffixes the renderer will give them.
    const slugger = new Slugger()
    slugger.slug(title)
    if (options.tableOfContents) {
      slugger.slug(t.contents)
    }
    slugger.slug(t.conventions)
    const typesAnchor = slugger.slug(t.types)
    for (const declaration of this.declarations.values()) {
      this.anchors.set(declaration.name, slugger.slug(declaration.name))
    }

    const blocks = [`# ${title}`]
    const meta = [
      options.version.trim() === '' ? null : `**${t.version}:** ${options.version.trim()}`,
      options.date === '' ? null : `**${t.date}:** ${options.date}`,
    ].filter((line) => line !== null)
    if (meta.length > 0) {
      blocks.push(meta.join(' · '))
    }

    if (options.tableOfContents && this.declarations.size > 0) {
      const entries = [...this.declarations.keys()].map(
        (name) => `  - [${name}](#${this.anchors.get(name)})`,
      )
      blocks.push(`## ${t.contents}`, [`- [${t.types}](#${typesAnchor})`, ...entries].join('\n'))
    }

    const conventions = [t.conventionRequired, t.conventionNullable]
    if (
      this.contract.declarations.some((declaration) =>
        declarationTypes(declaration).some(usesDates),
      )
    ) {
      conventions.push(t.conventionDates)
    }
    blocks.push(`## ${t.conventions}`, conventions.map((line) => `- ${line}`).join('\n'))

    blocks.push(`## ${t.types}`)
    if (this.declarations.size === 0) {
      blocks.push(`_${t.noDeclarations}_`)
    }
    for (const declaration of this.declarations.values()) {
      blocks.push(...this.renderDeclaration(declaration))
    }
    return `${blocks.join('\n\n')}\n`
  }

  private renderDeclaration(declaration: Declaration): string[] {
    const { t } = this
    const blocks = [`### ${declaration.name}`]
    if (declaration.deprecated !== null) {
      const reason = declaration.deprecated === '' ? '' : ` ${declaration.deprecated}`
      blocks.push(`> **${t.deprecated}.**${reason}`)
    }
    if (declaration.description !== '') {
      blocks.push(declaration.description)
    }

    switch (declaration.kind) {
      case 'alias':
        blocks.push(t.aliasOf(this.renderType(declaration.type)))
        break
      case 'enum': {
        const showNames = declaration.values.some((value) => typeof value.value === 'number')
        const header = showNames ? [t.value, t.name, t.description] : [t.value, t.description]
        const rows = declaration.values.map((value) => {
          const rendered = code(JSON.stringify(value.value))
          return showNames
            ? [rendered, value.name === null ? '' : code(value.name), value.description]
            : [rendered, value.description]
        })
        blocks.push(t.allowedValues, table(header, rows))
        break
      }
      case 'object': {
        if (declaration.extends.length > 0) {
          blocks.push(t.includesFieldsOf(declaration.extends.map((base) => this.renderRef(base))))
        }
        const rows = this.fieldRows(this.fieldsOf(declaration), '')
        if (declaration.additionalProperties !== null) {
          rows.push([
            `_${t.anyOtherKey}_`,
            this.renderType(declaration.additionalProperties),
            t.no,
            t.no,
            '',
          ])
        }
        if (rows.length > 0) {
          blocks.push(table([t.field, t.type, t.required, t.nullable, t.description], rows))
        }
        if (this.options.examples) {
          const builder = new ExampleBuilder(this.declarations, (object) => this.fieldsOf(object))
          const example = JSON.stringify(builder.forDeclaration(declaration), null, 2)
          blocks.push(`**${t.example}**`, `\`\`\`json\n${example}\n\`\`\``)
        }
        break
      }
    }
    return blocks
  }

  /**
   * A declaration's fields including inherited ones, so a reader never has to
   * assemble a payload from several tables. Own fields override inherited ones.
   */
  private fieldsOf(declaration: ObjectDeclaration, visiting: string[] = []): Field[] {
    const byName = new Map<string, Field>()
    for (const baseName of declaration.extends) {
      const base = this.declarations.get(baseName)
      if (base?.kind === 'object' && !visiting.includes(baseName)) {
        for (const field of this.fieldsOf(base, [...visiting, declaration.name])) {
          byName.set(field.name, field)
        }
      }
    }
    for (const field of declaration.fields) {
      byName.delete(field.name)
      byName.set(field.name, field)
    }
    return [...byName.values()]
  }

  /** Table rows for `fields`; inline objects expand into `parent.child` rows. */
  private fieldRows(fields: Field[], prefix: string): string[][] {
    const { t } = this
    return fields.flatMap((field) => {
      const path = `${prefix}${field.name}`
      const notes = [field.description]
      if (field.deprecated !== null) {
        notes.unshift(`**${t.deprecated}.** ${field.deprecated}`.trim())
      }
      if (field.defaultValue !== null) {
        notes.push(`${t.defaultValue}: ${code(field.defaultValue)}.`)
      }
      if (field.example !== null) {
        notes.push(`${t.example}: ${code(field.example)}.`)
      }
      const row = [
        code(path),
        this.renderType(field.type),
        field.required ? t.yes : t.no,
        field.nullable ? t.yes : t.no,
        notes.filter((note) => note !== '').join(' '),
      ]
      let nested: Field[] | null = null
      let nestedPrefix = `${path}.`
      if (field.type.kind === 'object') {
        nested = field.type.fields
      } else if (field.type.kind === 'array' && field.type.items.kind === 'object') {
        nested = field.type.items.fields
        nestedPrefix = `${path}[].`
      }
      return nested === null ? [row] : [row, ...this.fieldRows(nested, nestedPrefix)]
    })
  }

  private renderRef(name: string): string {
    const anchor = this.anchors.get(name)
    return anchor === undefined ? code(name) : `[${name}](#${anchor})`
  }

  private renderType(type: TypeExpr): string {
    const { t } = this
    switch (type.kind) {
      case 'primitive':
        return type.format === undefined ? code(type.name) : `${code(type.name)} (${type.format})`
      case 'literal':
        return code(JSON.stringify(type.value))
      case 'null':
        return code('null')
      case 'array':
        return t.arrayOf(this.renderType(type.items))
      case 'map':
        return t.mapOf(this.renderType(type.values))
      case 'object':
        return t.object
      case 'ref':
        return type.args.length === 0
          ? this.renderRef(type.name)
          : t.genericOf(
              this.renderRef(type.name),
              type.args.map((arg) => this.renderType(arg)).join(', '),
            )
      case 'union':
        return type.members.map((member) => this.renderType(member)).join(` ${t.or} `)
      case 'intersection':
        break
    }
    return type.members.map((member) => this.renderType(member)).join(` ${t.and} `)
  }
}

/** Renders a contract as a Markdown interface agreement. */
export function renderMarkdown(contract: Contract, options: DocOptions): string {
  return new MarkdownRenderer(contract, options).render()
}
