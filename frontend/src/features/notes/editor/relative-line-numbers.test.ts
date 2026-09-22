import { EditorState } from '@codemirror/state'
import { lineNumberMarkers, type GutterMarker } from '@codemirror/view'
import { describe, expect, it } from 'vitest'

import {
  RelativeLineNumberMarker,
  relativeLineNumberText,
  relativeLineNumbersExtension,
} from './relative-line-numbers'

function isRelativeMarker(value: GutterMarker): value is RelativeLineNumberMarker {
  return value instanceof RelativeLineNumberMarker
}

function markerTexts(state: EditorState): string[] {
  const texts: string[] = []
  for (const ranges of state.facet(lineNumberMarkers)) {
    const iter = ranges.iter()
    while (iter.value !== null) {
      if (isRelativeMarker(iter.value)) {
        texts.push(iter.value.text)
      }
      iter.next()
    }
  }
  return texts
}

function stateWithSelection(doc: string, line: number): EditorState {
  const base = EditorState.create({ doc, extensions: [relativeLineNumbersExtension()] })
  return base.update({ selection: { anchor: base.doc.line(line).from } }).state
}

describe('relativeLineNumberText', () => {
  it('keeps the absolute number on the cursor line', () => {
    expect(relativeLineNumberText(3, 3)).toBe('3')
    expect(relativeLineNumberText(1, 1)).toBe('1')
  })

  it('shows the distance from the cursor on every other line', () => {
    expect(relativeLineNumberText(3, 1)).toBe('2')
    expect(relativeLineNumberText(3, 5)).toBe('2')
    expect(relativeLineNumberText(10, 7)).toBe('3')
  })
})

describe('relative line number markers', () => {
  it('renders relative numbers for every line', () => {
    const state = stateWithSelection('a\nb\nc\nd\ne', 1)

    expect(markerTexts(state)).toEqual(['1', '1', '2', '3', '4'])
  })

  it('recomputes the numbers when the cursor moves', () => {
    const state = stateWithSelection('a\nb\nc\nd\ne', 1)

    const moved = state.update({ selection: { anchor: state.doc.line(3).from } }).state

    expect(markerTexts(state)).toEqual(['1', '1', '2', '3', '4'])
    expect(markerTexts(moved)).toEqual(['2', '1', '3', '1', '2'])
  })

  it('recomputes the numbers when the document changes', () => {
    const state = stateWithSelection('a\nb\nc', 2)

    const grown = state.update({ changes: { from: 0, to: 0, insert: 'x\n' } }).state

    expect(markerTexts(state)).toEqual(['1', '2', '1'])
    expect(markerTexts(grown)).toEqual(['2', '1', '3', '1'])
  })
})
