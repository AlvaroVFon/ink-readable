import type { Contract, Declaration, DocComment, EnumValue, Field, TypeExpr } from '../model'
import type { Token } from './scanner'
import type { SourceLanguage } from './types'

import { parseDocText, splitNullable } from '../model'
import { ParseError, TokenStream } from './scanner'

/**
 * Parses Go type declarations as `encoding/json` sees them: struct fields are
 * named after their `json` tag, `omitempty` makes them optional and pointers
 * make them nullable. Typed constants of a named string or integer type become
 * that type's enum values.
 */

const OPERATORS = ['<<', '>>', '...']

const INTEGER_FORMATS: Record<string, string | undefined> = {
  int: undefined,
  int8: 'int8',
  int16: 'int16',
  int32: 'int32',
  int64: 'int64',
  uint: undefined,
  uint8: 'uint8',
  uint16: 'uint16',
  uint32: 'uint32',
  uint64: 'uint64',
  uintptr: undefined,
  byte: 'uint8',
  rune: 'int32',
}

const NAMED_TYPES: Record<string, TypeExpr> = {
  string: { kind: 'primitive', name: 'string' },
  bool: { kind: 'primitive', name: 'boolean' },
  float32: { kind: 'primitive', name: 'number', format: 'float' },
  float64: { kind: 'primitive', name: 'number', format: 'double' },
  any: { kind: 'primitive', name: 'any' },
  error: { kind: 'primitive', name: 'any' },
  'time.Time': { kind: 'primitive', name: 'string', format: 'date-time' },
  'time.Duration': { kind: 'primitive', name: 'integer', format: 'nanoseconds' },
  'json.RawMessage': { kind: 'primitive', name: 'any' },
  'json.Number': { kind: 'primitive', name: 'number' },
  'uuid.UUID': { kind: 'primitive', name: 'string', format: 'uuid' },
  'decimal.Decimal': { kind: 'primitive', name: 'string', format: 'decimal' },
}

const NULL: TypeExpr = { kind: 'null' }

type StructTag = {
  /** `null` when the tag sets no name; the Go field name is used. */
  name: string | null
  skip: boolean
  omitempty: boolean
  /** `,string`: the value travels as a JSON string. */
  asString: boolean
  /** A validation tag (`validate`, `binding`) marks the field as required. */
  validatedRequired: boolean
}

type TypedConstant = { typeName: string; value: EnumValue }

function isExported(name: string): boolean {
  return /^[A-Z]/.test(name)
}

/** Go doc comments flag deprecation with a `Deprecated:` paragraph. */
function parseGoDoc(text: string | null): DocComment {
  return parseDocText((text ?? '').replace(/^Deprecated:\s*/m, '@deprecated '))
}

function parseStructTag(raw: string): StructTag {
  const entries = new Map<string, string>()
  for (const match of raw.matchAll(/(\w+):"((?:[^"\\]|\\.)*)"/g)) {
    entries.set(match[1], match[2])
  }
  const [name = '', ...options] = (entries.get('json') ?? '').split(',')
  const validation = `${entries.get('validate') ?? ''},${entries.get('binding') ?? ''}`
  return {
    name: name === '' ? null : name,
    skip: name === '-' && options.length === 0,
    omitempty: options.includes('omitempty') || options.includes('omitzero'),
    asString: options.includes('string'),
    validatedRequired: validation.split(',').includes('required'),
  }
}

class GoParser {
  private readonly tokens: TokenStream
  private readonly declarations: Declaration[] = []
  private readonly constants: TypedConstant[] = []

  constructor(source: string) {
    this.tokens = new TokenStream(source, {
      operators: OPERATORS,
      stringQuotes: ['"', "'"],
      rawQuotes: ['`'],
    })
  }

  parse(): Contract {
    while (!this.tokens.atEnd()) {
      const token = this.tokens.next()
      if (token.kind !== 'word') {
        continue
      }
      switch (token.value) {
        case 'type':
          this.parseGroup(token, (doc) => {
            this.parseTypeSpec(doc)
          })
          break
        case 'const':
          this.parseConstants()
          break
        case 'import':
        case 'var':
          this.skipGroupOrLine()
          break
        case 'func':
          this.skipFunction()
          break
      }
    }
    return {
      declarations: this.declarations.map((declaration) => this.withEnumValues(declaration)),
    }
  }

  /** Runs `parseSpec` once, or once per line of a `( ... )` group. */
  private parseGroup(keyword: Token, parseSpec: (doc: string | null) => void): void {
    if (!this.tokens.accept('(')) {
      parseSpec(keyword.leading)
      return
    }
    while (!this.tokens.accept(')')) {
      if (this.tokens.atEnd()) {
        throw new ParseError('Missing ")"', this.tokens.peek().line)
      }
      if (this.tokens.accept(';')) {
        continue
      }
      parseSpec(this.tokens.peek().leading)
    }
  }

  private parseTypeSpec(docText: string | null): void {
    const nameToken = this.tokens.peek()
    const name = this.tokens.expectWord()
    // Type parameters (`[T any]`), not to be confused with an array type (`[4]int`).
    if (
      this.tokens.peekValue('[') &&
      this.tokens.peek(1).kind === 'word' &&
      !this.tokens.peekValue(']', 2)
    ) {
      this.skipBalanced('[', ']')
    }
    this.tokens.accept('=')

    if (this.tokens.peekWord('struct')) {
      const doc = parseGoDoc(docText)
      const body = this.parseStruct()
      this.declarations.push({
        kind: 'object',
        name,
        description: doc.description,
        deprecated: doc.deprecated,
        extends: body.embedded,
        fields: body.fields,
        additionalProperties: null,
      })
      return
    }

    const type = this.parseType()
    const doc = parseGoDoc(docText ?? this.trailingOnLine(nameToken.line))
    const base = { name, description: doc.description, deprecated: doc.deprecated }
    if (type.kind === 'map') {
      this.declarations.push({
        ...base,
        kind: 'object',
        extends: [],
        fields: [],
        additionalProperties: type.values,
      })
      return
    }
    this.declarations.push({ ...base, kind: 'alias', type })
  }

  /** Comment trailing the last consumed token, when it is on `line`. */
  private trailingOnLine(line: number): string | null {
    const previous = this.tokens.previous()
    return previous.line === line ? previous.trailing : null
  }

  private parseStruct(): { fields: Field[]; embedded: string[] } {
    this.tokens.expect('struct')
    this.tokens.expect('{')
    const fields: Field[] = []
    const embedded: string[] = []
    while (!this.tokens.accept('}')) {
      if (this.tokens.accept(';')) {
        continue
      }
      const first = this.tokens.peek()
      if (first.kind === 'eof') {
        throw new ParseError('Missing "}"', first.line)
      }

      const names: string[] = []
      let type: TypeExpr
      if (this.isEmbeddedField()) {
        this.tokens.accept('*')
        type = this.parseType()
      } else {
        names.push(this.tokens.expectWord())
        while (this.tokens.accept(',')) {
          names.push(this.tokens.expectWord())
        }
        type = this.parseType()
      }
      const tagToken = this.tokens.peek()
      const tag =
        tagToken.kind === 'string' && tagToken.line === this.tokens.previous().line
          ? parseStructTag(this.tokens.next().value)
          : parseStructTag('')
      const doc = parseGoDoc(first.leading ?? this.trailingOnLine(this.tokens.previous().line))

      if (names.length === 0) {
        // `encoding/json` promotes an embedded struct's fields unless the tag names it.
        const typeName = type.kind === 'ref' ? type.name : 'struct'
        if (tag.name === null) {
          embedded.push(typeName)
          continue
        }
        names.push(typeName.split('.').at(-1) ?? typeName)
      }

      for (const goName of names) {
        if (!isExported(goName) || tag.skip) {
          continue
        }
        fields.push(this.toField(goName, type, tag, doc))
      }
    }
    return { fields, embedded }
  }

  private toField(goName: string, rawType: TypeExpr, tag: StructTag, doc: DocComment): Field {
    const { type, nullable } = splitNullable(rawType)
    return {
      name: tag.name ?? goName,
      type: tag.asString ? { kind: 'primitive', name: 'string' } : type,
      required: tag.validatedRequired || !tag.omitempty,
      // With `omitempty` a nil pointer drops the key instead of sending `null`.
      nullable: nullable && !tag.omitempty,
      description: doc.description,
      deprecated: doc.deprecated,
      example: doc.example,
      examples: doc.examples,
      defaultValue: doc.defaultValue,
    }
  }

  /** A struct field with no name: just a (possibly pointer, qualified) type. */
  private isEmbeddedField(): boolean {
    if (this.tokens.peekValue('*')) {
      return true
    }
    const name = this.tokens.peek()
    const after = this.tokens.peek(1)
    return (
      name.kind === 'word' &&
      (after.line !== name.line ||
        after.value === '.' ||
        after.value === ';' ||
        after.value === '}' ||
        after.kind === 'string')
    )
  }

  private parseType(): TypeExpr {
    if (this.tokens.peekWord('struct')) {
      return { kind: 'object', fields: this.parseStruct().fields }
    }
    const token = this.tokens.next()
    if (token.value === '*') {
      const inner = this.parseType()
      return inner.kind === 'union' ? inner : { kind: 'union', members: [inner, NULL] }
    }
    if (token.value === '[') {
      if (!this.tokens.accept(']')) {
        // Fixed-size array: `[4]T`.
        this.tokens.next()
        this.tokens.expect(']')
      }
      if (this.tokens.peekWord('byte') && !this.tokens.peekValue('.', 1)) {
        this.tokens.next()
        return { kind: 'primitive', name: 'string', format: 'base64' }
      }
      return { kind: 'array', items: this.parseType() }
    }
    if (token.value === 'map') {
      this.tokens.expect('[')
      this.parseType()
      this.tokens.expect(']')
      return { kind: 'map', values: this.parseType() }
    }
    if (token.value === 'interface') {
      this.skipBalanced('{', '}')
      return { kind: 'primitive', name: 'any' }
    }
    if (token.value === 'func') {
      this.skipBalanced('(', ')')
      if (this.tokens.peekValue('(')) {
        this.skipBalanced('(', ')')
      } else if (this.tokens.peek().line === token.line && this.tokens.peek().kind === 'word') {
        this.parseType()
      }
      return { kind: 'ref', name: 'func', args: [] }
    }
    if (token.value === 'chan') {
      return { kind: 'ref', name: 'chan', args: [this.parseType()] }
    }
    if (token.kind !== 'word') {
      throw new ParseError(`Unexpected "${token.value}" in type`, token.line)
    }

    let name = token.value
    if (this.tokens.peekValue('.') && this.tokens.peek(1).kind === 'word') {
      this.tokens.next()
      name += `.${this.tokens.next().value}`
    }
    const args: TypeExpr[] = []
    if (this.tokens.peekValue('[') && this.tokens.peek().line === token.line) {
      this.tokens.next()
      do {
        args.push(this.parseType())
      } while (this.tokens.accept(','))
      this.tokens.expect(']')
    }
    if (name in INTEGER_FORMATS) {
      const format = INTEGER_FORMATS[name]
      return format === undefined
        ? { kind: 'primitive', name: 'integer' }
        : { kind: 'primitive', name: 'integer', format }
    }
    return NAMED_TYPES[name] ?? { kind: 'ref', name, args }
  }

  /**
   * `const` declarations. Only typed constants matter: they are the values of
   * enum-like named types. Supports `iota` and implicit repetition.
   */
  private parseConstants(): void {
    let iota = 0
    let previous: { typeName: string | null; expression: Token[] } = {
      typeName: null,
      expression: [],
    }
    const keyword = this.tokens.previous()
    this.parseGroup(keyword, (docText) => {
      const line = this.tokens.peek().line
      const names = [this.tokens.expectWord()]
      while (this.tokens.accept(',')) {
        names.push(this.tokens.expectWord())
      }
      let typeName: string | null = null
      if (this.tokens.peek().kind === 'word' && this.tokens.peek().line === line) {
        typeName = this.tokens.next().value
        if (this.tokens.accept('.')) {
          typeName += `.${this.tokens.expectWord()}`
        }
      }
      let expression = previous.expression
      if (this.tokens.accept('=')) {
        expression = this.readLine(line)
      } else {
        typeName = previous.typeName
      }
      previous = { typeName, expression }
      const doc = parseGoDoc(docText ?? this.trailingOnLine(this.tokens.previous().line))

      const value = evaluateConstant(expression, iota)
      if (typeName !== null && value !== null) {
        for (const name of names) {
          this.constants.push({ typeName, value: { value, name, description: doc.description } })
        }
      }
      iota++
    })
  }

  /** Tokens left on `line`, stopping at a group's closing `)` or a `;`. */
  private readLine(line: number): Token[] {
    const tokens: Token[] = []
    let depth = 0
    while (!this.tokens.atEnd() && this.tokens.peek().line === line) {
      const token = this.tokens.peek()
      if (depth === 0 && (token.value === ';' || token.value === ')')) {
        break
      }
      if (token.value === '(') {
        depth++
      } else if (token.value === ')') {
        depth--
      }
      tokens.push(this.tokens.next())
    }
    return tokens
  }

  /** Turns a named string or integer type with typed constants into an enum. */
  private withEnumValues(declaration: Declaration): Declaration {
    if (declaration.kind !== 'alias' || declaration.type.kind !== 'primitive') {
      return declaration
    }
    const values = this.constants
      .filter((constant) => constant.typeName === declaration.name)
      .map((constant) => constant.value)
    if (values.length === 0) {
      return declaration
    }
    return {
      kind: 'enum',
      name: declaration.name,
      description: declaration.description,
      deprecated: declaration.deprecated,
      values,
    }
  }

  private skipGroupOrLine(): void {
    if (this.tokens.peekValue('(')) {
      this.skipBalanced('(', ')')
      return
    }
    const line = this.tokens.peek().line
    while (!this.tokens.atEnd() && this.tokens.peek().line === line) {
      const token = this.tokens.peek()
      if (token.value === '{' || token.value === '(' || token.value === '[') {
        this.skipBalanced(token.value, { '{': '}', '(': ')', '[': ']' }[token.value])
      } else {
        this.tokens.next()
      }
    }
  }

  /** Skips a function or method: its signature, then its body if it has one. */
  private skipFunction(): void {
    let previousValue = ''
    while (!this.tokens.atEnd()) {
      const token = this.tokens.peek()
      if (token.value === '(' || token.value === '[') {
        this.skipBalanced(token.value, token.value === '(' ? ')' : ']')
      } else if (token.value === '{') {
        const isType = previousValue === 'struct' || previousValue === 'interface'
        this.skipBalanced('{', '}')
        if (!isType) {
          return
        }
      } else if (token.kind === 'word' && ['type', 'func', 'const', 'var'].includes(token.value)) {
        // A declaration without a body (assembly-backed functions).
        return
      } else {
        this.tokens.next()
      }
      previousValue = this.tokens.previous().value
    }
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
}

/**
 * Evaluates a constant expression made of literals, `iota` and `+ - * <<`,
 * left to right. Anything else (calls, other constants) yields `null`.
 */
function evaluateConstant(tokens: Token[], iota: number): string | number | null {
  if (tokens.length === 1 && tokens[0].kind === 'string' && tokens[0].quote !== "'") {
    return tokens[0].value
  }
  const operand = (token: Token | undefined): number | null => {
    if (token?.kind === 'number') {
      return Number(token.value)
    }
    return token?.value === 'iota' ? iota : null
  }
  let result = operand(tokens[0])
  for (let index = 1; index < tokens.length && result !== null; index += 2) {
    const right = operand(tokens[index + 1])
    if (right === null) {
      return null
    }
    switch (tokens[index].value) {
      case '+':
        result += right
        break
      case '-':
        result -= right
        break
      case '*':
        result *= right
        break
      case '<<':
        result *= 2 ** right
        break
      default:
        return null
    }
  }
  return result
}

export const go: SourceLanguage = {
  id: 'go',
  label: 'Go',
  sample: `package contract

import "time"

// User is a customer account shared with partners.
type User struct {
	Entity
	// Login e-mail, unique per account.
	Email string \`json:"email"\`
	// Display name.
	// @example "Ada Lovelace"
	Name   string     \`json:"name,omitempty"\`
	Status UserStatus \`json:"status"\`
	// Postal address, null until the user completes onboarding.
	Address *Address \`json:"address"\`
	Tags    []string \`json:"tags"\`
	// Deprecated: use Status instead.
	Active   bool   \`json:"active,omitempty"\`
	password string
}

type Entity struct {
	ID        string    \`json:"id"\` // Unique identifier (UUID).
	CreatedAt time.Time \`json:"createdAt"\`
}

type Address struct {
	Street  string \`json:"street"\`
	City    string \`json:"city"\`
	Country string \`json:"country"\` // ISO 3166-1 alpha-2 code.
}

// UserStatus is the lifecycle of an account.
type UserStatus string

const (
	UserStatusActive    UserStatus = "active"
	UserStatusSuspended UserStatus = "suspended" // Temporarily blocked.
	UserStatusClosed    UserStatus = "closed"
)
`,
  loadHighlighting: async () => {
    const { go: goLanguage } = await import('@codemirror/lang-go')
    return goLanguage()
  },
  parse: (source) => new GoParser(source).parse(),
}
