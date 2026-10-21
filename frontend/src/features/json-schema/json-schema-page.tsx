import { Check, Copy } from 'lucide-react'
import { useDeferredValue, useEffect, useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Switch } from '@/components/ui/switch'
import { getSourceLanguage, sourceLanguages } from '@/features/interface-docs/lib/sources'
import { CodePane } from '@/features/json-types/components/code-pane'
import { ToolField, ToolHeader } from '@/features/tools/components/tool-header'
import { ToolPane } from '@/features/tools/components/tool-pane'
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'

import type { Draft } from './lib/schema'

import { generateSchema } from './lib/generate'
import { getStoredPreferences, storePreferences } from './lib/preferences'

const JSON_SOURCE_ID = 'json'

const SAMPLE_JSON = `{
  "id": 42,
  "name": "Ada Lovelace",
  "email": null,
  "tags": ["math", "poetry"],
  "address": { "city": "London", "zip": "W1" },
  "projects": [
    { "title": "Analytical Engine", "year": 1843 },
    { "title": "Notes", "year": 1843, "pages": 65 }
  ]
}
`

const SOURCES = [
  { value: JSON_SOURCE_ID, label: 'JSON' },
  ...sourceLanguages.map(({ id, label }) => ({ value: id, label })),
]

const DRAFT_CHOICES: { value: Draft; label: string }[] = [
  { value: '2020-12', label: '2020-12' },
  { value: '07', label: 'Draft 07' },
]

async function loadJson() {
  const { json } = await import('@codemirror/lang-json')
  return json()
}

/** Generates a JSON Schema from a JSON sample or from TypeScript / Go declarations. */
export function JsonSchemaPage() {
  const [preferences, setPreferences] = useState(getStoredPreferences)
  // One draft per source: switching sources keeps what was typed in each.
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const { copied, copy } = useCopyToClipboard()

  const { sourceId, rootName, draft, strict } = preferences
  const isJson = sourceId === JSON_SOURCE_ID
  const language = getSourceLanguage(sourceId)
  const activeId = isJson ? JSON_SOURCE_ID : language.id
  const input = drafts[activeId] ?? (isJson ? SAMPLE_JSON : language.sample)
  const deferredInput = useDeferredValue(input)

  useEffect(() => {
    storePreferences(preferences)
  }, [preferences])

  const result = useMemo(
    () =>
      generateSchema(
        deferredInput,
        isJson ? { kind: 'json' } : { kind: 'declarations', language },
        rootName,
        { draft, strict },
      ),
    [deferredInput, isJson, language, rootName, draft, strict],
  )

  const update = (changes: Partial<typeof preferences>) => {
    setPreferences((current) => ({ ...current, ...changes }))
  }

  return (
    <div className='flex min-h-0 flex-1 flex-col'>
      <ToolHeader
        description='Describe a contract as a JSON Schema from a sample or existing declarations.'
        title='→ JSON Schema'
      >
        <ToolField label='Input'>
          <SegmentedControl
            choices={SOURCES}
            label='Input'
            onChange={(value) => {
              update({ sourceId: value })
            }}
            value={activeId}
          />
        </ToolField>
        <ToolField label='Root type'>
          <Input
            aria-label='Root type'
            className='h-7 w-36 text-xs'
            onChange={(event) => {
              update({ rootName: event.target.value })
            }}
            placeholder={isJson ? 'Root' : 'First declaration'}
            value={rootName}
          />
        </ToolField>
        <ToolField label='Draft'>
          <SegmentedControl
            choices={DRAFT_CHOICES}
            label='Draft'
            onChange={(value) => {
              update({ draft: value === '07' ? '07' : '2020-12' })
            }}
            value={draft}
          />
        </ToolField>
        <div className='flex items-center gap-2 text-xs'>
          <Switch
            aria-label='Forbid additional properties'
            checked={strict}
            onCheckedChange={(checked) => {
              update({ strict: checked })
            }}
          />
          <span aria-hidden='true'>Forbid additional properties</span>
        </div>
      </ToolHeader>
      <div className='grid min-h-0 flex-1 grid-cols-1 md:grid-cols-2'>
        <ToolPane
          className='border-b border-rule/70 md:border-r md:border-b-0'
          title={isJson ? 'JSON' : language.label}
        >
          <CodePane
            key={activeId}
            label='Schema source'
            loadLanguage={isJson ? loadJson : language.loadHighlighting}
            onChange={(value) => {
              setDrafts((current) => ({ ...current, [activeId]: value }))
            }}
            value={input}
          />
        </ToolPane>
        <ToolPane
          actions={
            <Button
              disabled={!result.ok || result.code === ''}
              onClick={() => {
                if (result.ok) {
                  void copy(result.code)
                }
              }}
              size='xs'
              variant='ghost'
            >
              {copied ? <Check aria-hidden='true' /> : <Copy aria-hidden='true' />}
              {copied ? 'Copied' : 'Copy'}
            </Button>
          }
          title='JSON Schema'
        >
          {!result.ok && (
            <p
              className='shrink-0 border-b border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive'
              role='alert'
            >
              {result.error}
            </p>
          )}
          <CodePane
            label='Generated schema'
            loadLanguage={loadJson}
            value={result.ok ? result.code : ''}
          />
        </ToolPane>
      </div>
    </div>
  )
}
