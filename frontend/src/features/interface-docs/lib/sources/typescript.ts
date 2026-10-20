import type { Contract, Declaration, DocComment, EnumValue, Field, TypeExpr } from '../model'
import type { SourceLanguage } from './types'

import { parseDocText, splitNullable } from '../model'
import { ParseError, TokenStream } from './scanner'

/**
 * Parses the data-shape subset of TypeScript a contract is written in:
 * interfaces, type aliases and enums. Everything else (imports, functions,
 * classes, methods) is skipped.
 */

/** Multi-character operators; any other symbol is a single-character token. */
const OPERATORS = ['=>', '...']

/** Keywords that start a declaration this parser understands. */
const DECLARATION_STARTS = new Set(['export', 'declare', 'interface', 'type', 'enum', 'const'])

const KEYWORD_TYPES: Record<string, TypeExpr> = {
  string: { kind: 'primitive', name: 'string' },
  number: { kind: 'primitive', name: 'number' },
  bigint: { kind: 'primitive', name: 'integer' },
  boolean: { kind: 'primitive', name: 'boolean' },
  any: { kind: 'primitive', name: 'any' },
  unknown: { kind: 'primitive', name: 'any' },
  object: { kind: 'map', values: { kind: 'primitive', name: 'any' } },
  Date: { kind: 'primitive', name: 'string', format: 'date-time' },
  null: { kind: 'null' },
}

/** Generic wrappers that do not change the wire shape of their argument. */
const TRANSPARENT_GENERICS = new Set(['Readonly', 'NonNullable', 'Promise'])
const ARRAY_GENERICS = new Set(['Array', 'ReadonlyArray', 'Set', 'ReadonlySet'])
const MAP_GENERICS = new Set(['Record', 'Map', 'ReadonlyMap'])

/** Placeholder for `undefined`/`void`: it only ever makes a field optional. */
const UNDEFINED: TypeExpr = { kind: 'ref', name: 'undefined', args: [] }

function isUndefined(type: TypeExpr): boolean {
  return type.kind === 'ref' && type.name === 'undefined'
}

function union(members: TypeExpr[]): TypeExpr {
  return members.length === 1 ? members[0] : { kind: 'union', members }
}

class TypeScriptParser {
  private readonly tokens: TokenStream

  constructor(source: string) {
    this.tokens = new TokenStream(source, {
      operators: OPERATORS,
      stringQuotes: ['"', "'", '`'],
    })
  }

  parse(): Contract {
    const declarations: Declaration[] = []
    while (!this.tokens.atEnd()) {
      const declaration = this.parseStatement()
      if (declaration !== null) {
        declarations.push(declaration)
      }
    }
    return { declarations }
  }

  private parseStatement(): Declaration | null {
    const start = this.tokens.peek()
    const doc = parseDocText(start.leading ?? '')
    while (this.tokens.acceptWord('export') || this.tokens.acceptWord('declare')) {
      // Modifiers carry no meaning for the contract.
    }
    if (this.tokens.acceptWord('interface')) {
      return this.parseInterface(doc)
    }
    if (this.tokens.peekWord('type') && this.tokens.peek(1).kind === 'word') {
      this.tokens.next()
      return this.parseTypeAlias(doc)
    }
    if (this.tokens.peekWord('const') && this.tokens.peekWord('enum', 1)) {
      this.tokens.next()
    }
    if (this.tokens.acceptWord('enum')) {
      return this.parseEnum(doc)
    }
    this.skipStatement()
    return null
  }

  /** Skips an unsupported statement up to its end or the next declaration. */
  private skipStatement(): void {
    const first = this.tokens.next()
    let depth = ['{', '(', '['].includes(first.value) ? 1 : 0
    while (!this.tokens.atEnd()) {
      const token = this.tokens.peek()
      if (depth === 0) {
        if (token.value === ';') {
          this.tokens.next()
          return
        }
        if (
          token.kind === 'word' &&
          DECLARATION_STARTS.has(token.value) &&
          token.line > first.line
        ) {
          return
        }
      }
      if (['{', '(', '['].includes(token.value)) {
        depth++
      } else if (['}', ')', ']'].includes(token.value)) {
        depth = Math.max(0, depth - 1)
        if (depth === 0 && token.value === '}') {
          this.tokens.next()
          return
        }
      }
      this.tokens.next()
    }
  }

  private parseInterface(doc: DocComment): Declaration {
    const name = this.tokens.expectWord()
    this.skipTypeParameters()
    const bases: string[] = []
    if (this.tokens.acceptWord('extends')) {
      do {
        bases.push(this.renderBaseName(this.parseType()))
      } while (this.tokens.accept(','))
    }
    const body = this.parseObjectBody()
    return {
      kind: 'object',
      name,
      description: doc.description,
      deprecated: doc.deprecated,
      extends: bases,
      fields: body.fields,
      additionalProperties: body.additionalProperties,
    }
  }

  private parseTypeAlias(doc: DocComment): Declaration {
    const name = this.tokens.expectWord()
    this.skipTypeParameters()
    this.tokens.expect('=')
    const type = this.parseType()
    this.tokens.accept(';')
    const base = { name, description: doc.description, deprecated: doc.deprecated }

    const members = type.kind === 'union' ? type.members : [type]
    const values = members.flatMap((member): EnumValue[] =>
      member.kind === 'literal' && typeof member.value !== 'boolean'
        ? [{ value: member.value, name: null, description: '' }]
        : [],
    )
    if (values.length === members.length) {
      return { ...base, kind: 'enum', values }
    }

    // `type X = Base & { ... }` documents like an interface that extends `Base`.
    const parts = type.kind === 'intersection' ? type.members : [type]
    if (
      parts.every((part) => part.kind === 'object' || part.kind === 'ref') &&
      parts.some((part) => part.kind === 'object')
    ) {
      const fields = parts.flatMap((part) => (part.kind === 'object' ? part.fields : []))
      const bases = parts.flatMap((part) =>
        part.kind === 'ref' ? [this.renderBaseName(part)] : [],
      )
      return { ...base, kind: 'object', extends: bases, fields, additionalProperties: null }
    }
    if (type.kind === 'map') {
      return { ...base, kind: 'object', extends: [], fields: [], additionalProperties: type.values }
    }
    return { ...base, kind: 'alias', type }
  }

  private parseEnum(doc: DocComment): Declaration {
    const name = this.tokens.expectWord()
    this.tokens.expect('{')
    const values: EnumValue[] = []
    let next = 0
    while (!this.tokens.accept('}')) {
      const memberToken = this.tokens.next()
      const memberDoc = parseDocText(memberToken.leading ?? '')
      let value: string | number = next
      if (this.tokens.accept('=')) {
        const initializer = this.parseType()
        if (initializer.kind === 'literal' && typeof initializer.value !== 'boolean') {
          value = initializer.value
        }
      }
      if (typeof value === 'number') {
        next = value + 1
      }
      const separator = this.tokens.accept(',')
      const trailing = (separator ?? this.tokens.previous()).trailing
      values.push({
        value,
        name: memberToken.value,
        description: memberDoc.description || parseDocText(trailing ?? '').description,
      })
    }
    return { kind: 'enum', name, description: doc.description, deprecated: doc.deprecated, values }
  }

  /** `<T, U extends X = Y>` after a declaration name. */
  private skipTypeParameters(): void {
    if (!this.tokens.peekValue('<')) {
      return
    }
    let depth = 0
    do {
      const token = this.tokens.next()
      if (token.value === '<') {
        depth++
      } else if (token.value === '>') {
        depth--
      }
    } while (depth > 0 && !this.tokens.atEnd())
  }

  /** Name shown for an `extends` clause entry. */
  private renderBaseName(type: TypeExpr): string {
    return type.kind === 'ref' ? type.name : 'object'
  }

  /** Members between `{` and `}`, for interfaces and object literal types. */
  private parseObjectBody(): { fields: Field[]; additionalProperties: TypeExpr | null } {
    this.tokens.expect('{')
    const fields: Field[] = []
    let additionalProperties: TypeExpr | null = null
    while (!this.tokens.accept('}')) {
      const first = this.tokens.peek()
      const doc = parseDocText(first.leading ?? '')
      if (this.tokens.peekWord('readonly') && !/^[:?;,]$/.test(this.tokens.peek(1).value)) {
        this.tokens.next()
      }

      if (this.tokens.peekValue('[')) {
        // Index signature: `[key: string]: T`. Mapped types read the same way.
        this.skipBalanced('[', ']')
        this.tokens.accept('?')
        this.tokens.expect(':')
        additionalProperties = this.parseType()
        this.endMember()
        continue
      }
      if (this.tokens.peekValue('(') || this.tokens.peekValue('<') || this.tokens.peekWord('new')) {
        // Call or construct signature: behaviour, not data.
        this.skipMember()
        continue
      }

      const nameToken = this.tokens.next()
      if (!['word', 'string', 'number'].includes(nameToken.kind)) {
        throw new ParseError(`Unexpected "${nameToken.value}" in object type`, nameToken.line)
      }
      const optionalMark = this.tokens.accept('?') !== null
      if (this.tokens.peekValue('(') || this.tokens.peekValue('<')) {
        this.skipMember()
        continue
      }
      this.tokens.expect(':')
      const rawType = this.parseType()
      const separator = this.endMember()
      const trailing = (separator ?? this.tokens.previous()).trailing
      const fieldDoc =
        doc.description === '' && first.leading === null ? parseDocText(trailing ?? '') : doc

      const members = rawType.kind === 'union' ? rawType.members : [rawType]
      const undefinedAllowed = members.some(isUndefined)
      const { type, nullable } = splitNullable(
        union(members.filter((member) => !isUndefined(member))),
      )
      fields.push({
        name: nameToken.value,
        type,
        required: !optionalMark && !undefinedAllowed,
        nullable,
        description: fieldDoc.description,
        deprecated: fieldDoc.deprecated,
        example: fieldDoc.example,
        defaultValue: fieldDoc.defaultValue,
      })
    }
    return { fields, additionalProperties }
  }

  /** Consumes the optional `;`/`,` after a member and returns it. */
  private endMember() {
    return this.tokens.accept(';') ?? this.tokens.accept(',')
  }

  private skipMember(): void {
    let depth = 0
    while (!this.tokens.atEnd()) {
      const token = this.tokens.peek()
      if (depth === 0 && (token.value === ';' || token.value === ',' || token.value === '}')) {
        break
      }
      if (['{', '(', '[', '<'].includes(token.value)) {
        depth++
      } else if (['}', ')', ']', '>'].includes(token.value)) {
        depth--
      }
      const consumed = this.tokens.next()
      // Members without separators end at the line break.
      if (
        depth === 0 &&
        this.tokens.peek().line > consumed.line &&
        consumed.value !== '=>' &&
        consumed.value !== ':'
      ) {
        break
      }
    }
    this.endMember()
  }

  private skipBalanced(open: string, close: string): void {
    this.tokens.expect(open)
    let depth = 1
    while (depth > 0) {
      const token = this.tokens.next()
      if (token.kind === 'eof') {
        throw new ParseError(`Missing "${close}"`, token.line)
      }
      if (token.value === open) {
        depth++
      } else if (token.value === close) {
        depth--
      }
    }
  }

  private parseType(): TypeExpr {
    this.tokens.accept('|')
    const members = [this.parseIntersection()]
    while (this.tokens.accept('|')) {
      members.push(this.parseIntersection())
    }
    return union(members)
  }

  private parseIntersection(): TypeExpr {
    this.tokens.accept('&')
    const members = [this.parsePostfix()]
    while (this.tokens.accept('&')) {
      members.push(this.parsePostfix())
    }
    return members.length === 1 ? members[0] : { kind: 'intersection', members }
  }

  private parsePostfix(): TypeExpr {
    let type = this.parsePrimary()
    while (this.tokens.peekValue('[') && this.tokens.peek().line === this.tokens.previous().line) {
      if (this.tokens.peekValue(']', 1)) {
        this.tokens.next()
        this.tokens.next()
        type = { kind: 'array', items: type }
      } else {
        // Indexed access (`User['id']`): keep it as an opaque reference.
        this.skipBalanced('[', ']')
        type = { kind: 'ref', name: `${this.describe(type)}[…]`, args: [] }
      }
    }
    return type
  }

  private parsePrimary(): TypeExpr {
    const token = this.tokens.peek()

    if (token.value === '(') {
      if (this.isFunctionType()) {
        this.skipBalanced('(', ')')
        this.tokens.expect('=>')
        this.parseType()
        return { kind: 'ref', name: 'function', args: [] }
      }
      this.tokens.next()
      const inner = this.parseType()
      this.tokens.expect(')')
      return inner
    }
    if (token.value === '{') {
      const body = this.parseObjectBody()
      if (body.fields.length === 0 && body.additionalProperties !== null) {
        return { kind: 'map', values: body.additionalProperties }
      }
      return { kind: 'object', fields: body.fields }
    }
    if (token.value === '[') {
      // Tuples are documented as arrays of their element types.
      this.tokens.next()
      const elements: TypeExpr[] = []
      while (!this.tokens.accept(']')) {
        this.tokens.accept('...')
        if (this.tokens.peek().kind === 'word' && this.tokens.peekValue(':', 1)) {
          this.tokens.next()
          this.tokens.next()
        }
        elements.push(this.parseType())
        this.tokens.accept('?')
        this.tokens.accept(',')
      }
      return {
        kind: 'array',
        items: elements.length === 0 ? KEYWORD_TYPES.unknown : union(elements),
      }
    }
    if (token.kind === 'string') {
      this.tokens.next()
      return token.quote === '`'
        ? { kind: 'primitive', name: 'string' }
        : { kind: 'literal', value: token.value }
    }
    if (token.kind === 'number') {
      this.tokens.next()
      return { kind: 'literal', value: Number(token.value) }
    }
    if (token.value === '-' && this.tokens.peek(1).kind === 'number') {
      this.tokens.next()
      return { kind: 'literal', value: -Number(this.tokens.next().value) }
    }
    if (token.kind !== 'word') {
      throw new ParseError(`Unexpected "${token.value}" in type`, token.line)
    }

    this.tokens.next()
    switch (token.value) {
      case 'true':
      case 'false':
        return { kind: 'literal', value: token.value === 'true' }
      case 'undefined':
      case 'void':
      case 'never':
        return UNDEFINED
      case 'readonly':
      case 'unique':
        return this.parsePostfix()
      case 'keyof':
      case 'typeof':
        return {
          kind: 'ref',
          name: `${token.value} ${this.describe(this.parsePostfix())}`,
          args: [],
        }
    }

    let name = token.value
    while (this.tokens.peekValue('.') && this.tokens.peek(1).kind === 'word') {
      this.tokens.next()
      name += `.${this.tokens.next().value}`
    }
    const args: TypeExpr[] = []
    if (this.tokens.accept('<')) {
      do {
        args.push(this.parseType())
      } while (this.tokens.accept(','))
      this.tokens.expect('>')
    }

    if (args.length === 0 && name in KEYWORD_TYPES) {
      return KEYWORD_TYPES[name]
    }
    if (TRANSPARENT_GENERICS.has(name) && args.length === 1) {
      return args[0]
    }
    if (ARRAY_GENERICS.has(name) && args.length === 1) {
      return { kind: 'array', items: args[0] }
    }
    if (MAP_GENERICS.has(name) && args.length === 2) {
      return { kind: 'map', values: args[1] }
    }
    return { kind: 'ref', name, args }
  }

  /** At `(`: whether the parenthesis opens a function type's parameters. */
  private isFunctionType(): boolean {
    let depth = 0
    for (let offset = 0; ; offset++) {
      const token = this.tokens.peek(offset)
      if (token.kind === 'eof') {
        return false
      }
      if (token.value === '(') {
        depth++
      } else if (token.value === ')') {
        depth--
        if (depth === 0) {
          return this.tokens.peek(offset + 1).value === '=>'
        }
      }
    }
  }

  /** Short source-like text for opaque references. */
  private describe(type: TypeExpr): string {
    switch (type.kind) {
      case 'ref':
        return type.name
      case 'primitive':
        return type.name
      case 'literal':
        return JSON.stringify(type.value)
      default:
        return type.kind
    }
  }
}

export const typescript: SourceLanguage = {
  id: 'typescript',
  label: 'TypeScript',
  sample: `/** A customer account shared with partners. */
export interface User extends Entity {
  /** Login e-mail, unique per account. */
  email: string
  /** Display name. @example "Ada Lovelace" */
  name?: string
  status: UserStatus
  /** Postal address, null until the user completes onboarding. */
  address: Address | null
  tags: string[]
  /** @deprecated Use \`status\` instead. */
  active?: boolean
}

export interface Entity {
  /** Unique identifier (UUID). */
  id: string
  createdAt: Date
}

export interface Address {
  street: string
  city: string
  /** ISO 3166-1 alpha-2 code. @example "ES" */
  country: string
}

/** Lifecycle of an account. */
export type UserStatus = 'active' | 'suspended' | 'closed'
`,
  loadHighlighting: async () => {
    const { javascript } = await import('@codemirror/lang-javascript')
    return javascript({ typescript: true })
  },
  parse: (source) => new TypeScriptParser(source).parse(),
}
