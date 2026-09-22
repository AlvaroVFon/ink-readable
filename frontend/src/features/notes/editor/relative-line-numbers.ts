import {
  RangeSetBuilder,
  StateField,
  type EditorState,
  type Extension,
  type RangeSet,
} from '@codemirror/state'
import { GutterMarker, lineNumberMarkers } from '@codemirror/view'

/**
 * Formats a gutter line number the way a relative-numbering editor does: the
 * cursor line keeps its absolute number, every other line shows its distance
 * from the cursor.
 */
export function relativeLineNumberText(cursorLine: number, lineNumber: number): string {
  if (lineNumber === cursorLine) {
    return String(lineNumber)
  }
  return String(Math.abs(lineNumber - cursorLine))
}

export class RelativeLineNumberMarker extends GutterMarker {
  readonly text: string

  constructor(text: string) {
    super()
    this.text = text
  }

  eq(other: RelativeLineNumberMarker): boolean {
    return other.text === this.text
  }

  toDOM(): Node {
    return document.createTextNode(this.text)
  }
}

function buildMarkers(state: EditorState): RangeSet<GutterMarker> {
  const cursorLine = state.doc.lineAt(state.selection.main.head).number
  const builder = new RangeSetBuilder<GutterMarker>()

  for (let lineNumber = 1; lineNumber <= state.doc.lines; lineNumber += 1) {
    const line = state.doc.line(lineNumber)
    builder.add(
      line.from,
      line.from,
      new RelativeLineNumberMarker(relativeLineNumberText(cursorLine, lineNumber)),
    )
  }

  return builder.finish()
}

/**
 * Relative line numbers for the markdown editor.
 *
 * The built-in `lineNumbers()` gutter (part of `basicSetup`) skips rendering its
 * own number for any line that already has a `lineNumberMarkers` marker with a
 * `toDOM`, so feeding this field into that facet swaps absolute numbers for
 * relative ones without adding a second gutter.
 */
const relativeLineNumbersField = StateField.define<RangeSet<GutterMarker>>({
  create: buildMarkers,
  update: (markers, transaction) =>
    transaction.docChanged || transaction.selection !== undefined
      ? buildMarkers(transaction.state)
      : markers,
  provide: (field) => lineNumberMarkers.from(field),
})

export function relativeLineNumbersExtension(): Extension {
  return relativeLineNumbersField
}
