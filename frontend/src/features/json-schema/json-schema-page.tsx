import { Check, Copy } from 'lucide-react'
import { useDeferredValue, useEffect, useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { getSourceLanguage, sourceLanguages } from '@/features/interface-docs/lib/sources'
import { CodePane } from '@/features/json-types/components/code-pane'
import { SegmentedControl } from '@/features/json-types/components/segmented-control'
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
      <header className='flex flex-wrap items-center gap-x-5 gap-y-2.5 px-5 py-4 sm:px-6'>
        <h1 className='text-xl font-semibold tracking-tight'>→ JSON Schema</h1>
        <SegmentedControl
          choices={SOURCES}
          label='Input'
          onChange={(value) => {
            update({ sourceId: value })
          }}
          value={activeId}
        />
        <label className='flex min-w-0 items-center gap-2 text-sm'>
          Root type
          <Input
            className='w-32 sm:w-36'
            onChange={(event) => {
              update({ rootName: event.target.value })
            }}
            placeholder={isJson ? 'Root' : 'First declaration'}
            value={rootName}
          />
        </label>
        <div className='flex items-center gap-2 text-sm'>
          Draft
          <SegmentedControl
            choices={DRAFT_CHOICES}
            label='Draft'
            onChange={(value) => {
              update({ draft: value === '07' ? '07' : '2020-12' })
            }}
            value={draft}
          />
        </div>
        <div className='flex items-center gap-2 text-sm'>
          <Switch
            aria-label='Forbid additional properties'
            checked={strict}
            onCheckedChange={(checked) => {
              update({ strict: checked })
            }}
          />
          <span aria-hidden='true'>Forbid additional properties</span>
        </div>
      </header>
      <div className='grid min-h-0 flex-1 grid-cols-1 md:grid-cols-2'>
        <section className='flex min-h-0 flex-col border-b border-border/70 md:border-r md:border-b-0'>
          <h2 className='px-5 pt-3 text-xs font-medium text-muted-foreground sm:px-6'>
            {isJson ? 'JSON' : language.label}
          </h2>
          <CodePane
            key={activeId}
            label='Schema source'
            loadLanguage={isJson ? loadJson : language.loadHighlighting}
            onChange={(value) => {
              setDrafts((current) => ({ ...current, [activeId]: value }))
            }}
            value={input}
          />
        </section>
        <section className='flex min-h-0 flex-col'>
          <div className='flex items-center justify-between px-6 pt-3'>
            <h2 className='text-xs font-medium text-muted-foreground'>JSON Schema</h2>
            <Button
              disabled={!result.ok || result.code === ''}
              onClick={() => {
                if (result.ok) {
                  void copy(result.code)
                }
              }}
              size='sm'
              variant='ghost'
            >
              {copied ? <Check aria-hidden='true' /> : <Copy aria-hidden='true' />}
              {copied ? 'Copied!' : 'Copy'}
            </Button>
          </div>
          {!result.ok && (
            <p
              className='mx-6 mt-3 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive'
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
        </section>
      </div>
    </div>
  )
}
