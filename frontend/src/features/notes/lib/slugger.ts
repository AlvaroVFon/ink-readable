/**
 * Heading anchors the way GitHub (and most renderers) generate them. Shared by
 * the Markdown generators (which write `#anchor` links) and the preview (which
 * writes the matching heading ids), so both always agree.
 */
export class Slugger {
  private readonly used = new Map<string, number>()

  slug(heading: string): string {
    const base = heading
      .trim()
      .toLowerCase()
      .replace(/[^\p{L}\p{M}\p{N}\p{Pc} -]/gu, '')
      .replace(/ /g, '-')
    const count = this.used.get(base) ?? 0
    this.used.set(base, count + 1)
    return count === 0 ? base : `${base}-${count}`
  }
}
