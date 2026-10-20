/**
 * Identifier helpers shared by inference and the language emitters.
 */

/** Initialisms Go keeps fully upper-cased (`userId` → `UserID`). */
const GO_INITIALISMS = new Set([
  'acl',
  'api',
  'ascii',
  'cpu',
  'css',
  'dns',
  'eof',
  'guid',
  'html',
  'http',
  'https',
  'id',
  'ip',
  'json',
  'lhs',
  'qps',
  'ram',
  'rhs',
  'rpc',
  'sla',
  'smtp',
  'sql',
  'ssh',
  'tcp',
  'tls',
  'ttl',
  'udp',
  'ui',
  'uid',
  'uri',
  'url',
  'utf8',
  'uuid',
  'vm',
  'xml',
  'xmpp',
  'xsrf',
  'xss',
])

/**
 * Splits an identifier into words across separators (`_`, `-`, spaces, any
 * other punctuation) and case changes (`userName`, `HTTPServer`).
 */
export function splitWords(value: string): string[] {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .split(/[^A-Za-z0-9]+/)
    .filter((word) => word.length > 0)
}

function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
}

export function toPascalCase(value: string): string {
  return splitWords(value).map(capitalize).join('')
}

/**
 * Exported Go identifier: PascalCase with Go's initialisms upper-cased. Names
 * that would start with a digit (or be empty) get a prefix to stay valid.
 */
export function toGoIdentifier(value: string, fallback = 'Field'): string {
  const name = splitWords(value)
    .map((word) => (GO_INITIALISMS.has(word.toLowerCase()) ? word.toUpperCase() : capitalize(word)))
    .join('')
  if (name === '') {
    return fallback
  }
  return /^[0-9]/.test(name) ? `${fallback}${name}` : name
}

/** Naive English singular, good enough to name array items (`users` → `user`). */
export function singularize(word: string): string {
  const lower = word.toLowerCase()
  if (lower.endsWith('ies') && word.length > 3) {
    return `${word.slice(0, -3)}y`
  }
  if (/(ss|x|ch|sh)es$/.test(lower)) {
    return word.slice(0, -2)
  }
  if (lower.endsWith('s') && !lower.endsWith('ss') && !lower.endsWith('us') && word.length > 1) {
    return word.slice(0, -1)
  }
  return word
}

/** Returns `base`, or `base2`, `base3`, ... if already taken, and records it as used. */
export function uniqueName(base: string, used: Set<string>): string {
  let name = base
  let suffix = 2
  while (used.has(name)) {
    name = `${base}${suffix}`
    suffix++
  }
  used.add(name)
  return name
}
