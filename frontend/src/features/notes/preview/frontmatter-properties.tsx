import type { Frontmatter } from '../lib/frontmatter'

function formatScalar(value: unknown): string {
  if (value === null || value === undefined) {
    return ''
  }
  if (value instanceof Date) {
    return value.toISOString()
  }
  if (typeof value === 'string') {
    return value
  }
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value)
  }
  return JSON.stringify(value) ?? ''
}

function PropertyValue({ value }: { value: unknown }) {
  if (Array.isArray(value)) {
    return (
      <span className='markdown-frontmatter-list'>
        {value.map((item, index) => (
          <span
            className='markdown-frontmatter-chip'
            // oxlint-disable-next-line react/no-array-index-key -- items may repeat and never reorder
            key={index}
          >
            {formatScalar(item)}
          </span>
        ))}
      </span>
    )
  }
  return <>{formatScalar(value)}</>
}

/**
 * Renders a note's frontmatter above the body: a key/value table when the YAML
 * parses to a mapping, the raw source otherwise so nothing is silently hidden.
 */
export function FrontmatterProperties({ frontmatter }: { frontmatter: Frontmatter }) {
  const { data, raw } = frontmatter

  if (data === null) {
    return raw.trim() === '' ? null : (
      <pre className='markdown-frontmatter-raw'>
        <code>{raw}</code>
      </pre>
    )
  }

  const entries = Object.entries(data)
  if (entries.length === 0) {
    return null
  }

  return (
    <table
      aria-label='Properties'
      className='markdown-frontmatter'
    >
      <tbody>
        {entries.map(([key, value]) => (
          <tr key={key}>
            <th scope='row'>{key}</th>
            <td>
              <PropertyValue value={value} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
