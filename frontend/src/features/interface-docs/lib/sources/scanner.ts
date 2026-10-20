/**
 * Tokenizer shared by the source-language parsers. It knows just enough about
 * C-like syntax (words, numbers, strings, comments, punctuation) and keeps
 * comments attached to tokens, since they carry the contract's documentation.
 */

export class ParseError extends Error {
  constructor(message: string, line: number) {
    super(`Line ${line}: ${message}`)
    this.name = 'ParseError'
  }
}

export type Token = {
  kind: 'word' | 'number' | 'string' | 'punct' | 'eof'
  /** Unescaped contents for strings. */
  value: string
  /** Opening quote of a string token. */
  quote?: string
  line: number
  /** Comment block right above the token (no blank line in between). */
  leading: string | null
  /** Comment that starts on the token's line, after it. */
  trailing: string | null
}

type ScannerOptions = {
  /** Multi-character operators; every other symbol is a one-character token. */
  operators: string[]
  /** Quotes whose contents are taken verbatim, without escapes (Go raw strings). */
  rawQuotes?: string[]
  stringQuotes: string[]
}

const ESCAPES: Record<string, string> = { n: '\n', t: '\t', r: '\r', '0': '\0' }

/** Strips the `*` gutter of a `/** ... *\/` comment. */
export function cleanBlockComment(body: string): string {
  return body
    .replace(/^\*/, '')
    .split('\n')
    .map((line) => line.replace(/^\s*\* ?/, '').trimEnd())
    .join('\n')
    .trim()
}

function tokenize(source: string, options: ScannerOptions): Token[] {
  const tokens: Token[] = []
  const operators = options.operators.toSorted((a, b) => b.length - a.length)
  let index = 0
  let line = 1
  /** Comment lines waiting for the token they document. */
  let pending: { text: string[]; endLine: number } | null = null

  const addComment = (text: string, startLine: number) => {
    const previous = tokens.at(-1)
    if (previous !== undefined && previous.line === startLine && previous.trailing === null) {
      previous.trailing = text
      return
    }
    if (pending !== null && startLine <= pending.endLine + 1) {
      pending.text.push(text)
      pending.endLine = line
    } else {
      pending = { text: [text], endLine: line }
    }
  }

  const push = (kind: Token['kind'], value: string, startLine: number, quote?: string) => {
    const leading =
      pending !== null && startLine <= pending.endLine + 1 ? pending.text.join('\n') : null
    pending = null
    tokens.push({ kind, value, quote, line: startLine, leading, trailing: null })
  }

  while (index < source.length) {
    const char = source[index]
    const startLine = line

    if (char === '\n') {
      line++
      index++
      continue
    }
    if (/\s/.test(char)) {
      index++
      continue
    }
    if (source.startsWith('//', index)) {
      const end = source.indexOf('\n', index)
      const text = source.slice(index + 2, end === -1 ? source.length : end)
      index = end === -1 ? source.length : end
      addComment(text.replace(/^ /, '').trimEnd(), startLine)
      continue
    }
    if (source.startsWith('/*', index)) {
      const end = source.indexOf('*/', index + 2)
      if (end === -1) {
        throw new ParseError('Unterminated comment', startLine)
      }
      const body = source.slice(index + 2, end)
      line += body.split('\n').length - 1
      index = end + 2
      addComment(cleanBlockComment(body), startLine)
      continue
    }
    if (options.stringQuotes.includes(char) || options.rawQuotes?.includes(char)) {
      const raw = options.rawQuotes?.includes(char) === true
      let value = ''
      index++
      while (source[index] !== char) {
        if (index >= source.length) {
          throw new ParseError('Unterminated string', startLine)
        }
        if (source[index] === '\n') {
          line++
        }
        if (!raw && source[index] === '\\') {
          const escaped = source[index + 1]
          value += ESCAPES[escaped] ?? escaped
          index += 2
          continue
        }
        value += source[index]
        index++
      }
      index++
      push('string', value, startLine, char)
      continue
    }
    const word = /^[A-Za-z_$][\w$]*/.exec(source.slice(index, index + 256))
    if (word !== null) {
      index += word[0].length
      push('word', word[0], startLine)
      continue
    }
    const number = /^(?:0[xXbBoO][\da-fA-F_]+|\d[\d_]*(?:\.\d[\d_]*)?(?:[eE][+-]?\d+)?)n?/.exec(
      source.slice(index, index + 256),
    )
    if (number !== null) {
      index += number[0].length
      push('number', number[0].replace(/_|n$/g, ''), startLine)
      continue
    }
    const operator = operators.find((candidate) => source.startsWith(candidate, index)) ?? char
    index += operator.length
    push('punct', operator, startLine)
  }
  tokens.push({ kind: 'eof', value: '', line, leading: null, trailing: null })
  return tokens
}

/** Cursor over the tokens of a source file. */
export class TokenStream {
  private readonly tokens: Token[]
  private position = 0

  constructor(source: string, options: ScannerOptions) {
    this.tokens = tokenize(source, options)
  }

  atEnd(): boolean {
    return this.peek().kind === 'eof'
  }

  peek(offset = 0): Token {
    return this.tokens[Math.min(this.position + offset, this.tokens.length - 1)]
  }

  /** The last consumed token. */
  previous(): Token {
    return this.tokens[Math.max(0, this.position - 1)]
  }

  next(): Token {
    const token = this.peek()
    if (token.kind !== 'eof') {
      this.position++
    }
    return token
  }

  /** Whether the token at `offset` is the punctuation or keyword `value`. */
  peekValue(value: string, offset = 0): boolean {
    const token = this.peek(offset)
    return (token.kind === 'punct' || token.kind === 'word') && token.value === value
  }

  peekWord(value: string, offset = 0): boolean {
    const token = this.peek(offset)
    return token.kind === 'word' && token.value === value
  }

  /** Consumes the token if it is `value`. */
  accept(value: string): Token | null {
    return this.peekValue(value) ? this.next() : null
  }

  acceptWord(value: string): boolean {
    return this.peekWord(value) && this.next() !== null
  }

  expect(value: string): Token {
    const token = this.peek()
    if (!this.peekValue(value)) {
      throw new ParseError(`Expected "${value}" but found ${describeToken(token)}`, token.line)
    }
    return this.next()
  }

  expectWord(): string {
    const token = this.peek()
    if (token.kind !== 'word') {
      throw new ParseError(`Expected a name but found ${describeToken(token)}`, token.line)
    }
    return this.next().value
  }
}

function describeToken(token: Token): string {
  return token.kind === 'eof' ? 'the end of the input' : `"${token.value}"`
}
